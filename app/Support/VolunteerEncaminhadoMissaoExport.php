<?php

namespace App\Support;

use App\Models\Ministry;
use App\Models\Volunteer;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Planilha alinhada à Central de Gestão — departamento Missão: Vinculados + Encaminhados.
 */
class VolunteerEncaminhadoMissaoExport
{
    /**
     * @return list<int>
     */
    public static function missaoMinistryIdsForChurch(int $churchId): array
    {
        return Ministry::query()
            ->where('church_id', $churchId)
            ->where(function ($q) {
                $q->whereRaw('LOWER(TRIM(name)) LIKE ?', ['%missão%'])
                    ->orWhereRaw('LOWER(TRIM(name)) LIKE ?', ['%missao%']);
            })
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }

    private static function centerRequestForMinistry(int $churchId, int $ministryId, string $centerVinculo): Request
    {
        return Request::create('/', 'GET', [
            'center_mode' => '1',
            'ministry_ids' => (string) $ministryId,
            'center_vinculo' => $centerVinculo,
            'center_phase_key' => '',
            'center_sem_departamento' => '',
            'pipeline_stage_id' => '',
            'search' => '',
            'text_interest' => '',
        ]);
    }

    /**
     * Mesma regra da aba Vinculados / Encaminhados na Central (departamento Missão).
     *
     * @return Builder<Volunteer>
     */
    public static function missaoDepartmentVolunteersQuery(int $churchId, int $ministryId, string $centerVinculo): Builder
    {
        $q = VolunteerChurchRosterBuilder::volunteersVisibleInChurchQuery($churchId)
            ->with(['user:id,email,phone,name']);

        VolunteerLeadRosterFilters::apply(
            self::centerRequestForMinistry($churchId, $ministryId, $centerVinculo),
            $q,
            $churchId,
        );

        return $q;
    }

    /**
     * @return array{vinculados: list<int>, encaminhados: list<int>}
     */
    public static function missaoVolunteerIdSets(int $churchId): array
    {
        $ministryIds = self::missaoMinistryIdsForChurch($churchId);
        if ($ministryIds === []) {
            return ['vinculados' => [], 'encaminhados' => []];
        }

        $ministryId = $ministryIds[0];

        $vinculados = self::missaoDepartmentVolunteersQuery($churchId, $ministryId, 'vinculados')
            ->pluck('volunteers.id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();

        $encaminhados = [];
        if (Schema::hasTable('volunteer_ministry_invitations')) {
            $encaminhados = self::missaoDepartmentVolunteersQuery($churchId, $ministryId, 'encaminhados')
                ->pluck('volunteers.id')
                ->map(fn ($id) => (int) $id)
                ->values()
                ->all();
        }

        return [
            'vinculados' => $vinculados,
            'encaminhados' => $encaminhados,
        ];
    }

    /**
     * @return Collection<int, array{name: string, email: string, phone: string, vinculo: string}>
     */
    public static function rowsForChurch(int $churchId): Collection
    {
        $sets = self::missaoVolunteerIdSets($churchId);
        $vinculadosSet = array_flip($sets['vinculados']);
        $encaminhadosSet = array_flip($sets['encaminhados']);

        $allIds = array_values(array_unique(array_merge($sets['vinculados'], $sets['encaminhados'])));
        if ($allIds === []) {
            return collect();
        }

        $volunteers = Volunteer::query()
            ->whereIn('id', $allIds)
            ->with(['user:id,email,phone,name'])
            ->orderBy('name')
            ->get();

        return $volunteers->map(function (Volunteer $v) use ($vinculadosSet, $encaminhadosSet) {
            $id = (int) $v->id;
            $isVinc = isset($vinculadosSet[$id]);
            $isEnc = isset($encaminhadosSet[$id]);
            $vinculo = match (true) {
                $isVinc && $isEnc => 'Vinculado; Encaminhado',
                $isVinc => 'Vinculado',
                default => 'Encaminhado',
            };

            return [
                'name' => trim((string) ($v->name ?? $v->user?->name ?? '')),
                'email' => trim((string) ($v->email ?? $v->user?->email ?? '')),
                'phone' => trim((string) ($v->phone ?? $v->user?->phone ?? '')),
                'vinculo' => $vinculo,
            ];
        });
    }

    public static function buildSpreadsheet(Collection $rows): Spreadsheet
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Missão');

        $sheet->fromArray(['Nome', 'E-mail', 'Telefone', 'Vínculo Missão'], null, 'A1', true);

        $line = 2;
        foreach ($rows as $row) {
            $sheet->fromArray([
                $row['name'],
                $row['email'],
                $row['phone'],
                $row['vinculo'],
            ], null, 'A'.$line, true);
            $line++;
        }

        foreach (['A', 'B', 'C', 'D'] as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $sheet->getStyle('A1:D1')->getFont()->setBold(true);

        return $spreadsheet;
    }

    public static function downloadFilename(): string
    {
        return 'voluntarios-missao-vinculados-encaminhados-'.now()->format('Y-m-d_His').'.xlsx';
    }

    public static function streamedDownload(int $churchId): StreamedResponse
    {
        $rows = self::rowsForChurch($churchId);
        $spreadsheet = self::buildSpreadsheet($rows);
        $filename = self::downloadFilename();

        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    public static function saveToPath(int $churchId, string $absolutePath): int
    {
        $rows = self::rowsForChurch($churchId);
        $spreadsheet = self::buildSpreadsheet($rows);
        $dir = dirname($absolutePath);
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        $writer = new Xlsx($spreadsheet);
        $writer->save($absolutePath);

        return $rows->count();
    }
}
