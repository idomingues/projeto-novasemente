<?php

namespace App\Console\Commands;

use App\Models\Church;
use App\Models\Volunteer;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;

class ImportVolunteersSpreadsheetCommand extends Command
{
    protected $signature = 'volunteers:import
        {novos? : Caminho para a planilha de novos inscritos (ex.: storage/app/imports/voluntariado12abr.xlsx)}
        {atuantes? : Caminho para a planilha de já atuantes}
        {--church= : ID da igreja (por defeito: primeira igreja ativa)}
        {--dry-run : Apenas mostrar o que seria importado}';

    protected $description = 'Importa voluntários a partir das planilhas exportadas (Google Forms / Excel).';

    public function handle(): int
    {
        $novosPath = $this->argument('novos')
            ?? storage_path('app/imports/voluntariado12abr.xlsx');
        $atuantesPath = $this->argument('atuantes')
            ?? storage_path('app/imports/voluntariado12abr_ja_atuantes.xlsx');

        if (! is_readable($novosPath)) {
            $this->error("Ficheiro não encontrado ou ilegível: {$novosPath}");

            return self::FAILURE;
        }

        $churchId = $this->option('church')
            ? (int) $this->option('church')
            : (int) Church::query()->where('active', true)->orderBy('name')->value('id');

        if (! $churchId) {
            $this->error('Nenhuma igreja ativa. Crie uma igreja ou use --church=ID.');

            return self::FAILURE;
        }

        $this->info("Igreja ID: {$churchId} (reservado para futura ligação a ministérios)");
        $dry = (bool) $this->option('dry-run');

        $run = function () use ($novosPath, $atuantesPath, $churchId, $dry): void {
            $this->importNovos($novosPath, $churchId, $dry);
            if (is_readable($atuantesPath)) {
                $this->importAtuantes($atuantesPath, $churchId, $dry);
            } else {
                $this->warn("Planilha de atuantes omitida (não encontrada): {$atuantesPath}");
            }
        };

        if ($dry) {
            $run();
        } else {
            DB::transaction($run);
        }

        $this->info('Concluído.');

        return self::SUCCESS;
    }

    private function importNovos(string $path, int $churchId, bool $dry): void
    {
        $sheet = IOFactory::load($path)->getActiveSheet();
        $highestRow = $sheet->getHighestDataRow();
        $imported = 0;
        $skipped = 0;

        for ($r = 3; $r <= $highestRow; $r++) {
            $name = $this->str($sheet->getCell('B'.$r)->getValue());
            if ($name === '') {
                $skipped++;

                continue;
            }

            $email = $this->normalizeEmail($this->str($sheet->getCell('E'.$r)->getValue()));
            $phone = $this->normalizePhone($this->str($sheet->getCell('D'.$r)->getValue()));

            $birth = $this->parseDate($sheet->getCell('C'.$r)->getValue());
            $social = $this->str($sheet->getCell('F'.$r)->getValue());
            $attendance = $this->str($sheet->getCell('G'.$r)->getValue());
            $isMember = $this->boolPt($this->str($sheet->getCell('H'.$r)->getValue()));
            $memberRegRaw = $this->str($sheet->getCell('I'.$r)->getValue());
            [$memNs, $memChurch] = $this->parseMemberRegistration($memberRegRaw);
            $hadPrev = $this->boolPt($this->str($sheet->getCell('J'.$r)->getValue()));
            $prevDetails = $this->str($sheet->getCell('K'.$r)->getValue());
            $involvement = $this->str($sheet->getCell('L'.$r)->getValue());
            $gifts = $this->str($sheet->getCell('M'.$r)->getValue());
            $professional = $this->str($sheet->getCell('N'.$r)->getValue());
            $lgpdRaw = $this->str($sheet->getCell('O'.$r)->getValue());
            $lgpd = $this->boolLgpd($lgpdRaw);

            $attrs = [
                'name' => $name,
                'email' => $email,
                'phone' => $phone,
                'birth_date' => $birth,
                'has_whatsapp' => $phone !== null ? true : null,
                'has_social_networks' => $social !== '' ? true : false,
                'attendance_duration' => $attendance !== '' ? $attendance : null,
                'is_official_member' => $isMember,
                'member_record_at_nova_semente' => $memNs,
                'member_record_church' => $memChurch,
                'has_previous_ministry_volunteer_experience' => $hadPrev,
                'previous_ministry_details' => $prevDetails !== '' ? $prevDetails : null,
                'ministry_involvement' => $involvement !== '' ? $involvement : null,
                'other_ministry_interest' => null,
                'gifts_to_develop' => $gifts !== '' ? $gifts : null,
                'professional_area' => $professional !== '' ? $professional : null,
                'needs_pastoral_guidance' => null,
                'lgpd_data_consent' => $lgpd,
                'active' => true,
            ];

            if ($dry) {
                $this->line("[novos] {$name} | {$email} | {$phone}");

                continue;
            }

            $volunteer = $this->findDuplicateVolunteer($email, $phone, $name);
            if ($volunteer) {
                $volunteer->update($this->mergeAttrsForVolunteerUpdate($volunteer, $attrs));
                $this->line("Atualizado: {$name}");
            } else {
                if ($email === null) {
                    $attrs['email'] = $this->syntheticEmail($name, $r, 'novos');
                }
                Volunteer::query()->create($attrs);
                $this->line("Criado: {$name}");
                $imported++;
            }
        }

        $this->info("Novos: {$imported} criados (atualizações por e-mail/telefone já contabilizadas acima). Ignorados vazios: {$skipped}");
    }

    private function importAtuantes(string $path, int $churchId, bool $dry): void
    {
        $sheet = IOFactory::load($path)->getActiveSheet();
        $highestRow = $sheet->getHighestDataRow();
        $imported = 0;
        $skipped = 0;

        for ($r = 3; $r <= $highestRow; $r++) {
            $name = $this->str($sheet->getCell('B'.$r)->getValue());
            $phone = $this->normalizePhone($this->str($sheet->getCell('C'.$r)->getValue()));

            if ($name === '') {
                $skipped++;

                continue;
            }

            $isMember = $this->boolPt($this->str($sheet->getCell('D'.$r)->getValue()));
            $otherChurch = $this->str($sheet->getCell('E'.$r)->getValue());
            $timeVol = $this->str($sheet->getCell('F'.$r)->getValue());
            $ministries = $this->str($sheet->getCell('G'.$r)->getValue());
            $atuacao = $this->str($sheet->getCell('H'.$r)->getValue());
            $outroMin = $this->str($sheet->getCell('I'.$r)->getValue());
            $gifts = $this->str($sheet->getCell('J'.$r)->getValue());
            $orientPast = $this->boolPt($this->str($sheet->getCell('K'.$r)->getValue()));
            $lgpdRaw = $this->str($sheet->getCell('L'.$r)->getValue());
            $lgpd = $this->boolLgpd($lgpdRaw);

            $memNs = null;
            $memChurch = null;
            if ($isMember === true) {
                if ($otherChurch === '') {
                    $memNs = true;
                } else {
                    $memNs = false;
                    $memChurch = $otherChurch;
                }
            } elseif ($isMember === false) {
                $memNs = false;
                $memChurch = $otherChurch !== '' ? $otherChurch : null;
            }

            $involvement = $ministries;
            if ($atuacao !== '') {
                $involvement = trim($involvement."\n\nAtuação: ".$atuacao);
            }

            $attrs = [
                'name' => $name,
                'email' => null,
                'phone' => $phone,
                'birth_date' => null,
                'has_whatsapp' => $phone !== null ? true : null,
                'has_social_networks' => null,
                'attendance_duration' => $timeVol !== '' ? $timeVol : null,
                'is_official_member' => $isMember,
                'member_record_at_nova_semente' => $memNs,
                'member_record_church' => $memChurch,
                'has_previous_ministry_volunteer_experience' => true,
                'previous_ministry_details' => null,
                'ministry_involvement' => $involvement !== '' ? $involvement : null,
                'other_ministry_interest' => $outroMin !== '' ? $outroMin : null,
                'gifts_to_develop' => $gifts !== '' ? $gifts : null,
                'professional_area' => null,
                'needs_pastoral_guidance' => $orientPast,
                'lgpd_data_consent' => $lgpd,
                'active' => true,
            ];

            if ($dry) {
                $this->line("[atuantes] {$name} | {$phone}");

                continue;
            }

            $volunteer = $this->findDuplicateVolunteer(null, $phone, $name);
            if ($volunteer) {
                $merged = $this->mergeAttrsForVolunteerUpdate($volunteer, array_merge($attrs, [
                    'email' => $volunteer->email ?? $attrs['email'],
                ]));
                $volunteer->update($merged);
                $this->line("Atualizado (atuantes): {$name}");
            } else {
                $attrs['email'] = $this->syntheticEmail($name, $r, 'atuantes');
                Volunteer::query()->create($attrs);
                $this->line("Criado (atuantes): {$name}");
                $imported++;
            }
        }

        $this->info("Novos registos atuantes: {$imported}. Ignorados sem nome: {$skipped}");
    }

    /**
     * Evita gravar nome vazio por engano (atualização não deve apagar o nome existente).
     *
     * @param  array<string, mixed>  $attrs
     * @return array<string, mixed>
     */
    private function mergeAttrsForVolunteerUpdate(Volunteer $volunteer, array $attrs): array
    {
        if (trim((string) ($attrs['name'] ?? '')) === '') {
            unset($attrs['name']);
        }

        return $attrs;
    }

    private function findDuplicateVolunteer(?string $email, ?string $phone, string $name): ?Volunteer
    {
        if ($email !== null) {
            $v = Volunteer::query()
                ->whereRaw('LOWER(TRIM(email)) = ?', [mb_strtolower($email)])
                ->first();
            if ($v) {
                return $v;
            }
        }

        if ($phone !== null) {
            $byPhone = Volunteer::query()->where('phone', $phone)->first();
            if ($byPhone) {
                return $byPhone;
            }
            $normName = mb_strtolower(trim($name));
            if (! str_starts_with($normName, 'voluntário (importação')) {
                return Volunteer::query()
                    ->where('phone', $phone)
                    ->whereRaw('LOWER(TRIM(name)) = ?', [$normName])
                    ->first();
            }
        }

        return null;
    }

    private function syntheticEmail(string $name, int $row, string $tag): string
    {
        $hash = substr(sha1($name.'|'.$row.'|'.$tag), 0, 12);

        return "import.{$tag}.{$row}.{$hash}@example.invalid";
    }

    private function str(mixed $v): string
    {
        if ($v === null) {
            return '';
        }

        return trim((string) $v);
    }

    private function normalizeEmail(string $e): ?string
    {
        $e = strtolower(trim($e));
        if ($e === '' || ! filter_var($e, FILTER_VALIDATE_EMAIL)) {
            return null;
        }

        return $e;
    }

    private function normalizePhone(?string $p): ?string
    {
        if ($p === null) {
            return null;
        }
        $digits = preg_replace('/\D+/', '', $p);
        if ($digits === '' || strlen($digits) < 8) {
            return null;
        }

        return $digits;
    }

    private function parseDate(mixed $v): ?Carbon
    {
        if ($v === null || $v === '') {
            return null;
        }
        try {
            if (is_numeric($v)) {
                return Carbon::instance(ExcelDate::excelToDateTimeObject((float) $v));
            }
            if ($v instanceof \DateTimeInterface) {
                return Carbon::instance(\DateTimeImmutable::createFromInterface($v));
            }

            return Carbon::parse((string) $v);
        } catch (\Throwable) {
            return null;
        }
    }

    private function boolPt(?string $raw): ?bool
    {
        if ($raw === null || $raw === '') {
            return null;
        }
        $s = mb_strtolower(trim($raw));
        if (preg_match('/^(sim|s|yes|true|1)\b/u', $s)) {
            return true;
        }
        if (preg_match('/^(não|nao|n|no|false|0)\b/u', $s)) {
            return false;
        }

        return null;
    }

    private function boolLgpd(string $raw): ?bool
    {
        if ($raw === '') {
            return null;
        }
        if (preg_match('/autorizo/i', $raw)) {
            return true;
        }

        return $this->boolPt($raw);
    }

    /**
     * @return array{0: ?bool, 1: ?string}
     */
    private function parseMemberRegistration(string $raw): array
    {
        $raw = trim($raw);
        if ($raw === '') {
            return [null, null];
        }
        $lower = mb_strtolower($raw);
        if (preg_match('/^(sim|s)\s*$/u', $lower)) {
            return [true, null];
        }
        if (preg_match('/^(não|nao)\s*$/u', $lower)) {
            return [false, null];
        }
        if (str_contains($lower, 'nova semente')) {
            return [true, null];
        }
        if (preg_match('/^(não|nao)\b/u', $lower)) {
            $rest = trim(preg_replace('/^(não|nao)\s*,?\s*/iu', '', $raw));

            return [false, $rest !== '' ? $rest : null];
        }

        return [null, $raw];
    }
}
