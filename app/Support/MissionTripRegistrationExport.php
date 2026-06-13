<?php

namespace App\Support;

use App\Models\MissionTripRegistration;
use Illuminate\Support\Collection;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MissionTripRegistrationExport
{
    /**
     * @return Collection<int, array<string, mixed>>
     */
    public static function rowsForChurch(int $churchId, string $search = ''): Collection
    {
        $query = MissionTripRegistration::query()
            ->where('church_id', $churchId)
            ->where('trip_slug', MissionTripRegistration::TRIP_THAILAND_MYANMAR_2026)
            ->orderByDesc('created_at');

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('instagram', 'like', "%{$search}%");
            });
        }

        return $query->get()->map(fn (MissionTripRegistration $r) => MissionTripRegistrationPresenter::row($r));
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $rows
     */
    public static function buildSpreadsheet(Collection $rows): Spreadsheet
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Inscrições');

        $headers = [
            'Nome completo',
            'Instagram',
            'Telefone',
            'E-mail',
            'Possui passaporte',
            'Missão no exterior antes',
            'Profissão',
            'Profissão (outro)',
            'Inscrito em',
        ];

        $sheet->fromArray($headers, null, 'A1', true);

        $line = 2;
        foreach ($rows as $row) {
            $sheet->fromArray([
                $row['fullName'],
                $row['instagram'] ?? '',
                $row['phone'],
                $row['email'],
                $row['hasPassportLabel'],
                $row['participatedForeignMissionBeforeLabel'],
                $row['profession'],
                $row['professionOther'] ?? '',
                $row['createdAtLabel'] ?? '',
            ], null, 'A'.$line, true);
            $line++;
        }

        foreach (range('A', 'I') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $sheet->getStyle('A1:I1')->getFont()->setBold(true);

        return $spreadsheet;
    }

    public static function downloadFilename(): string
    {
        return 'inscricoes-missao-tailandia-mianmar-'.now()->format('Y-m-d_His').'.xlsx';
    }

    public static function streamedDownload(int $churchId, string $search = ''): StreamedResponse
    {
        $rows = self::rowsForChurch($churchId, $search);
        $spreadsheet = self::buildSpreadsheet($rows);
        $filename = self::downloadFilename();

        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }
}
