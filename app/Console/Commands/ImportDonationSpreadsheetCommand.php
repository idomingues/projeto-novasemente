<?php

namespace App\Console\Commands;

use App\Models\CampaignDonation;
use App\Models\Church;
use App\Models\DonationCampaign;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ImportDonationSpreadsheetCommand extends Command
{
    protected $signature = 'donations:import-spreadsheet
        {path : Caminho para a planilha .xlsx}
        {--sheet=Report Data : Nome da aba a importar}
        {--campaign-id= : ID da campanha existente}
        {--campaign-title= : Título para localizar ou criar a campanha}
        {--church= : ID da igreja ao criar a campanha}
        {--registered-by= : ID do usuário responsável pelo cadastro manual}
        {--create-campaign : Cria a campanha quando ela não existir}
        {--dry-run : Apenas simula a importação}';

    protected $description = 'Importa doações históricas a partir de uma planilha Excel para campaign_donations.';

    /**
     * @var array<int, string>
     */
    private array $requiredHeaders = [
        'Nome do Departamento',
        'Nome Tipo Movimento',
        'Data do Movimento',
        'Data do Evento',
        'Valor',
        'Descrição',
    ];

    public function handle(): int
    {
        $path = (string) $this->argument('path');
        if (! is_readable($path)) {
            $this->error("Arquivo não encontrado ou ilegível: {$path}");

            return self::FAILURE;
        }

        $sheetName = trim((string) $this->option('sheet'));
        $sheet = $this->loadSheet($path, $sheetName);
        if (! $sheet) {
            $this->error("Aba não encontrada na planilha: {$sheetName}");

            return self::FAILURE;
        }

        $registeredBy = $this->resolveRegisteredBy();
        if ($this->option('registered-by') && ! $registeredBy) {
            $this->error('Usuário informado em --registered-by não foi encontrado.');

            return self::FAILURE;
        }

        try {
            $rows = $this->parseRows(
                sheet: $sheet,
                sourceFile: basename($path),
                sheetName: $sheetName,
                fileHash: hash_file('sha256', $path) ?: sha1($path),
            );
        } catch (\InvalidArgumentException $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        if ($rows === []) {
            $this->warn('Nenhuma linha válida encontrada na planilha.');

            return self::SUCCESS;
        }

        $summary = $this->summarizeRows($rows);
        $campaignTitle = trim((string) ($this->option('campaign-title') ?: $summary['department']));
        if ($campaignTitle === '') {
            $this->error('Não foi possível determinar o título da campanha. Use --campaign-title.');

            return self::FAILURE;
        }

        $campaign = $this->findCampaign(
            $this->option('campaign-id') ? (int) $this->option('campaign-id') : null,
            $campaignTitle,
        );

        if (! $campaign && ! $this->option('create-campaign')) {
            $this->error("Campanha não encontrada: {$campaignTitle}. Use --campaign-id ou --create-campaign.");

            return self::FAILURE;
        }

        $existingHashes = CampaignDonation::query()
            ->whereIn('receipt_hash', array_column($rows, 'receipt_hash'))
            ->pluck('receipt_hash')
            ->all();
        $existingHashMap = array_fill_keys($existingHashes, true);
        $duplicatesInDatabase = 0;

        foreach ($rows as $row) {
            if (isset($existingHashMap[$row['receipt_hash']])) {
                $duplicatesInDatabase++;
            }
        }

        $dryRun = (bool) $this->option('dry-run');
        $this->printPlan(
            path: $path,
            sheetName: $sheetName,
            summary: $summary,
            campaignTitle: $campaignTitle,
            existingCampaign: $campaign,
            willCreateCampaign: ! $campaign && (bool) $this->option('create-campaign'),
            duplicatesInDatabase: $duplicatesInDatabase,
            dryRun: $dryRun,
        );

        if ($dryRun) {
            $this->info('Dry-run concluído sem gravar alterações.');

            return self::SUCCESS;
        }

        DB::transaction(function () use ($campaign, $campaignTitle, $registeredBy, $summary, $rows, $existingHashMap): void {
            $targetCampaign = $campaign ?? $this->createCampaign($campaignTitle, $registeredBy?->id, $summary);
            $imported = 0;
            $skipped = 0;

            foreach ($rows as $row) {
                if (isset($existingHashMap[$row['receipt_hash']])) {
                    $skipped++;

                    continue;
                }

                CampaignDonation::query()->create([
                    'campaign_id' => $targetCampaign->id,
                    'source' => CampaignDonation::SOURCE_MANUAL,
                    'user_id' => null,
                    'external_donor_name' => $row['external_donor_name'],
                    'amount' => $row['amount'],
                    'ocr_suggested_amount' => null,
                    'receipt_path' => null,
                    'receipt_hash' => $row['receipt_hash'],
                    'is_anonymous' => $row['is_anonymous'],
                    'manual_registration_note' => $row['manual_registration_note'],
                    'registered_by' => $registeredBy?->id,
                    'confirmed_at' => $row['confirmed_at'],
                ]);
                $imported++;
            }

            $targetCampaign->update([
                'raised_amount' => $targetCampaign->donations()->sum('amount'),
            ]);

            $targetCampaign->refresh();

            $this->info("Campanha destino: {$targetCampaign->title} (#{$targetCampaign->id})");
            $this->info("Doações importadas: {$imported}");
            $this->info("Doações ignoradas por duplicidade: {$skipped}");
            $this->info('Total arrecadado da campanha após importação: R$ '.number_format((float) $targetCampaign->raised_amount, 2, ',', '.'));
        });

        $this->info('Importação concluída com sucesso.');

        return self::SUCCESS;
    }

    private function loadSheet(string $path, string $sheetName): ?Worksheet
    {
        $spreadsheet = IOFactory::load($path);

        return $spreadsheet->getSheetByName($sheetName);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function parseRows(Worksheet $sheet, string $sourceFile, string $sheetName, string $fileHash): array
    {
        $headerMap = $this->headerMap($sheet);
        $highestRow = $sheet->getHighestDataRow();
        $rows = [];

        for ($rowNumber = 2; $rowNumber <= $highestRow; $rowNumber++) {
            $department = $this->str($sheet->getCell([$headerMap['Nome do Departamento'], $rowNumber])->getValue());
            $movementType = $this->str($sheet->getCell([$headerMap['Nome Tipo Movimento'], $rowNumber])->getValue());
            $movementDate = $this->parseDate($sheet->getCell([$headerMap['Data do Movimento'], $rowNumber])->getValue());
            $eventDate = $this->parseDate($sheet->getCell([$headerMap['Data do Evento'], $rowNumber])->getValue());
            $amountRaw = $sheet->getCell([$headerMap['Valor'], $rowNumber])->getValue();
            $description = $this->str($sheet->getCell([$headerMap['Descrição'], $rowNumber])->getValue());

            if ($department === '' && $movementType === '' && $description === '' && ($amountRaw === null || $amountRaw === '')) {
                continue;
            }

            $confirmedAt = $movementDate ?? $eventDate;
            if (! $confirmedAt) {
                throw new \InvalidArgumentException("Linha {$rowNumber}: não foi possível interpretar a data do movimento/evento.");
            }

            if (! is_numeric($amountRaw)) {
                throw new \InvalidArgumentException("Linha {$rowNumber}: valor inválido.");
            }

            $amount = round((float) $amountRaw, 2);
            if ($amount <= 0) {
                continue;
            }

            $normalizedDescription = $description !== '' ? $description : 'Doador importado';
            $isAnonymous = $this->isAnonymousDescription($normalizedDescription);
            $receiptHash = hash('sha256', implode('|', [
                'xlsx-donation-import',
                $fileHash,
                $sheetName,
                $rowNumber,
                $department,
                $movementType,
                $confirmedAt->format('Y-m-d'),
                $eventDate?->format('Y-m-d') ?? '',
                number_format($amount, 2, '.', ''),
                $normalizedDescription,
            ]));

            $rows[] = [
                'department' => $department,
                'movement_type' => $movementType,
                'confirmed_at' => $confirmedAt,
                'event_date' => $eventDate,
                'amount' => $amount,
                'external_donor_name' => $normalizedDescription,
                'is_anonymous' => $isAnonymous,
                'receipt_hash' => $receiptHash,
                'manual_registration_note' => $this->buildManualNote(
                    sourceFile: $sourceFile,
                    sheetName: $sheetName,
                    department: $department,
                    movementType: $movementType,
                    eventDate: $eventDate,
                ),
            ];
        }

        return $rows;
    }

    /**
     * @return array<string, int>
     */
    private function headerMap(Worksheet $sheet): array
    {
        $highestColumn = $sheet->getHighestDataColumn();
        $headers = $sheet->rangeToArray("A1:{$highestColumn}1", null, true, false)[0] ?? [];
        $map = [];

        foreach ($headers as $index => $header) {
            $name = $this->str($header);
            if ($name !== '') {
                $map[$name] = $index + 1;
            }
        }

        foreach ($this->requiredHeaders as $requiredHeader) {
            if (! isset($map[$requiredHeader])) {
                throw new \InvalidArgumentException("Cabeçalho obrigatório ausente: {$requiredHeader}");
            }
        }

        return $map;
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @return array{department: string, first_date: Carbon, last_date: Carbon, rows: int, total_amount: float}
     */
    private function summarizeRows(array $rows): array
    {
        $firstDate = $rows[0]['confirmed_at'];
        $lastDate = $rows[0]['confirmed_at'];
        $totalAmount = 0.0;

        foreach ($rows as $row) {
            if ($row['confirmed_at']->lt($firstDate)) {
                $firstDate = $row['confirmed_at'];
            }
            if ($row['confirmed_at']->gt($lastDate)) {
                $lastDate = $row['confirmed_at'];
            }
            $totalAmount += (float) $row['amount'];
        }

        return [
            'department' => (string) $rows[0]['department'],
            'first_date' => $firstDate,
            'last_date' => $lastDate,
            'rows' => count($rows),
            'total_amount' => round($totalAmount, 2),
        ];
    }

    private function findCampaign(?int $campaignId, string $campaignTitle): ?DonationCampaign
    {
        if ($campaignId !== null) {
            return DonationCampaign::query()->find($campaignId);
        }

        $normalizedTitle = mb_strtolower(trim($campaignTitle));

        return DonationCampaign::query()
            ->whereRaw('LOWER(TRIM(title)) = ?', [$normalizedTitle])
            ->first();
    }

    /**
     * @param  array{department: string, first_date: Carbon, last_date: Carbon, rows: int, total_amount: float}  $summary
     */
    private function createCampaign(string $campaignTitle, ?int $createdBy, array $summary): DonationCampaign
    {
        $churchId = $this->resolveChurchId();

        return DonationCampaign::query()->create([
            'church_id' => $churchId,
            'title' => $campaignTitle,
            'description' => 'Campanha criada automaticamente durante importação histórica de doações.',
            'goal_amount' => max((float) $summary['total_amount'], 1),
            'raised_amount' => 0,
            'status' => DonationCampaign::STATUS_ACTIVE,
            'starts_at' => $summary['first_date']->toDateString(),
            'allow_over_goal' => true,
            'created_by' => $createdBy,
        ]);
    }

    private function resolveChurchId(): int
    {
        if ($this->option('church')) {
            $churchId = (int) $this->option('church');
            if (Church::query()->whereKey($churchId)->exists()) {
                return $churchId;
            }

            throw new \InvalidArgumentException("Igreja não encontrada: {$churchId}");
        }

        $churchId = Church::query()->where('active', true)->orderBy('name')->value('id');
        if (! $churchId) {
            throw new \InvalidArgumentException('Nenhuma igreja ativa encontrada para criar a campanha.');
        }

        return (int) $churchId;
    }

    private function resolveRegisteredBy(): ?User
    {
        if (! $this->option('registered-by')) {
            return null;
        }

        return User::query()->find((int) $this->option('registered-by'));
    }

    /**
     * @param  array{department: string, first_date: Carbon, last_date: Carbon, rows: int, total_amount: float}  $summary
     */
    private function printPlan(
        string $path,
        string $sheetName,
        array $summary,
        string $campaignTitle,
        ?DonationCampaign $existingCampaign,
        bool $willCreateCampaign,
        int $duplicatesInDatabase,
        bool $dryRun,
    ): void {
        $this->info('Resumo da importação');
        $this->line("Arquivo: {$path}");
        $this->line("Aba: {$sheetName}");
        $this->line("Departamento: {$summary['department']}");
        $this->line("Período: {$summary['first_date']->format('d/m/Y')} até {$summary['last_date']->format('d/m/Y')}");
        $this->line("Linhas válidas: {$summary['rows']}");
        $this->line('Total das doações: R$ '.number_format((float) $summary['total_amount'], 2, ',', '.'));
        $this->line("Duplicidades já existentes no banco: {$duplicatesInDatabase}");

        if ($existingCampaign) {
            $this->line("Campanha encontrada: {$existingCampaign->title} (#{$existingCampaign->id})");
        } elseif ($willCreateCampaign) {
            $this->line("Campanha será criada: {$campaignTitle}");
        }

        if ($dryRun) {
            $this->warn('Modo dry-run ativo.');
        }
    }

    private function buildManualNote(
        string $sourceFile,
        string $sheetName,
        string $department,
        string $movementType,
        ?Carbon $eventDate,
    ): string {
        $parts = [
            "Importado da planilha {$sourceFile}",
            "aba {$sheetName}",
        ];

        if ($department !== '') {
            $parts[] = "departamento {$department}";
        }

        if ($movementType !== '') {
            $parts[] = "tipo {$movementType}";
        }

        if ($eventDate) {
            $parts[] = 'data do evento '.$eventDate->format('d/m/Y');
        }

        return Str::of(implode('; ', $parts))->trim()->append('.')->value();
    }

    private function isAnonymousDescription(string $description): bool
    {
        $normalized = mb_strtolower(Str::ascii(trim($description)));
        $normalized = preg_replace('/\s+/u', ' ', $normalized) ?? $normalized;

        return in_array($normalized, [
            'anonimo',
            'doador anonimo',
        ], true);
    }

    private function str(mixed $value): string
    {
        if ($value === null) {
            return '';
        }

        return trim((string) $value);
    }

    private function parseDate(mixed $value): ?Carbon
    {
        if ($value === null || $value === '') {
            return null;
        }

        try {
            if (is_numeric($value)) {
                return Carbon::instance(ExcelDate::excelToDateTimeObject((float) $value))->startOfDay();
            }
            if ($value instanceof \DateTimeInterface) {
                return Carbon::instance(\DateTimeImmutable::createFromInterface($value))->startOfDay();
            }

            $stringValue = trim((string) $value);
            foreach (['d/m/Y', 'd/m/Y H:i:s', 'Y-m-d', 'Y-m-d H:i:s'] as $format) {
                try {
                    return Carbon::createFromFormat($format, $stringValue)->startOfDay();
                } catch (\Throwable) {
                }
            }

            return Carbon::parse($stringValue)->startOfDay();
        } catch (\Throwable) {
            return null;
        }
    }
}
