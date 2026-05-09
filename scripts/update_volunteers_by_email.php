<?php

declare(strict_types=1);

use App\Models\User;
use App\Models\Volunteer;
use Illuminate\Contracts\Console\Kernel;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;

require __DIR__.'/../vendor/autoload.php';

$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$path = $argv[1] ?? __DIR__.'/../assets/Voluntarios_Novos (1).xlsx';
$dryRun = in_array('--dry-run', $argv, true);

if (! is_readable($path)) {
    fwrite(STDERR, "Arquivo não encontrado: {$path}\n");
    exit(1);
}

$sheet = IOFactory::load($path)->getActiveSheet();
$highestRow = $sheet->getHighestDataRow();

$stats = [
    'rows_total' => 0,
    'rows_with_email' => 0,
    'matched_users' => 0,
    'matched_volunteers_without_user' => 0,
    'users_updated' => 0,
    'volunteers_updated' => 0,
    'volunteers_created' => 0,
    'unmatched_email' => 0,
    'invalid_email' => 0,
];

$unmatched = [];

for ($r = 3; $r <= $highestRow; $r++) {
    $stats['rows_total']++;

    $email = normalizeEmail(cell($sheet, 'E', $r));
    if ($email === null) {
        if (trim(cell($sheet, 'E', $r)) !== '') {
            $stats['invalid_email']++;
        }
        continue;
    }
    $stats['rows_with_email']++;

    $name = trim(cell($sheet, 'B', $r));
    $phone = normalizePhone(cell($sheet, 'D', $r));
    $birth = parseDate(cellRaw($sheet, 'C', $r));
    $socialRaw = trim(cell($sheet, 'F', $r));
    $attendance = attendanceCode(cell($sheet, 'G', $r));
    $isMember = boolPt(cell($sheet, 'H', $r));
    [$memNs, $memChurch] = parseMemberRegistration(cell($sheet, 'I', $r));
    $hadPrev = boolPt(cell($sheet, 'J', $r));
    $prevDetails = trim(cell($sheet, 'K', $r));
    $interest = trim(cell($sheet, 'L', $r));
    $gifts = trim(cell($sheet, 'M', $r));
    $professional = trim(cell($sheet, 'N', $r));
    $lgpd = boolLgpd(cell($sheet, 'O', $r));

    $users = User::query()
        ->whereRaw('LOWER(TRIM(COALESCE(email, ""))) = ?', [$email])
        ->get();

    $directVolunteers = Volunteer::query()
        ->whereRaw('LOWER(TRIM(COALESCE(email, ""))) = ?', [$email])
        ->get();

    if ($users->isEmpty() && $directVolunteers->isEmpty()) {
        $stats['unmatched_email']++;
        $unmatched[] = ['row' => $r, 'email' => $email, 'name' => $name];
        continue;
    }

    foreach ($users as $user) {
        $stats['matched_users']++;
        $userDirty = false;

        if ($name !== '' && $user->name !== $name) {
            $user->name = $name;
            $userDirty = true;
        }
        if ($phone !== null && (string) ($user->phone ?? '') !== $phone) {
            $user->phone = $phone;
            $userDirty = true;
        }
        if ($birth !== null) {
            $birthDate = $birth->toDateString();
            if ((string) ($user->birth_date ?? '') !== $birthDate) {
                $user->birth_date = $birthDate;
                $userDirty = true;
            }
        }

        if ($userDirty) {
            $stats['users_updated']++;
            if (! $dryRun) {
                $user->save();
            }
        }

        if (! $dryRun) {
            $user->ensureVolunteerProfile();
            $user->refresh();
        }
        $volunteer = $user->volunteerProfile;

        if ($volunteer === null && $dryRun) {
            $stats['volunteers_created']++;
            continue;
        }

        if ($volunteer === null) {
            continue;
        }

        $volDirty = false;
        $set = function (string $field, mixed $value) use (&$volunteer, &$volDirty): void {
            if ($volunteer->{$field} !== $value) {
                $volunteer->{$field} = $value;
                $volDirty = true;
            }
        };

        if ($name !== '') {
            $set('name', $name);
        }
        $set('email', $email);
        if ($phone !== null) {
            $set('phone', $phone);
            $set('has_whatsapp', true);
        }
        if ($birth !== null) {
            $set('birth_date', $birth->toDateString());
        }
        if ($socialRaw !== '') {
            $set('has_social_networks', true);
        }
        if ($attendance !== null) {
            $set('attendance_duration', $attendance);
        }
        if ($isMember !== null) {
            $set('is_official_member', $isMember);
        }
        if ($memNs !== null) {
            $set('member_record_at_nova_semente', $memNs);
        }
        if ($memChurch !== null && $memChurch !== '') {
            $set('member_record_church', $memChurch);
        }
        if ($hadPrev !== null) {
            $set('has_previous_ministry_volunteer_experience', $hadPrev);
        }
        if ($prevDetails !== '') {
            $set('previous_ministry_details', $prevDetails);
        }
        if ($interest !== '') {
            $set('other_ministry_interest', $interest);
        }
        if ($gifts !== '') {
            $set('gifts_to_develop', $gifts);
        }
        if ($professional !== '') {
            $set('professional_area', $professional);
        }
        if ($lgpd !== null) {
            $set('lgpd_data_consent', $lgpd);
        }

        if ($volDirty) {
            $stats['volunteers_updated']++;
            if (! $dryRun) {
                $volunteer->save();
            }
        }
    }

    if ($users->isEmpty() && ! $directVolunteers->isEmpty()) {
        foreach ($directVolunteers as $volunteer) {
            $stats['matched_volunteers_without_user']++;
            $volDirty = false;
            $set = function (string $field, mixed $value) use (&$volunteer, &$volDirty): void {
                if ($volunteer->{$field} !== $value) {
                    $volunteer->{$field} = $value;
                    $volDirty = true;
                }
            };

            if ($name !== '') {
                $set('name', $name);
            }
            $set('email', $email);
            if ($phone !== null) {
                $set('phone', $phone);
                $set('has_whatsapp', true);
            }
            if ($birth !== null) {
                $set('birth_date', $birth->toDateString());
            }
            if ($socialRaw !== '') {
                $set('has_social_networks', true);
            }
            if ($attendance !== null) {
                $set('attendance_duration', $attendance);
            }
            if ($isMember !== null) {
                $set('is_official_member', $isMember);
            }
            if ($memNs !== null) {
                $set('member_record_at_nova_semente', $memNs);
            }
            if ($memChurch !== null && $memChurch !== '') {
                $set('member_record_church', $memChurch);
            }
            if ($hadPrev !== null) {
                $set('has_previous_ministry_volunteer_experience', $hadPrev);
            }
            if ($prevDetails !== '') {
                $set('previous_ministry_details', $prevDetails);
            }
            if ($interest !== '') {
                $set('other_ministry_interest', $interest);
            }
            if ($gifts !== '') {
                $set('gifts_to_develop', $gifts);
            }
            if ($professional !== '') {
                $set('professional_area', $professional);
            }
            if ($lgpd !== null) {
                $set('lgpd_data_consent', $lgpd);
            }

            if ($volDirty) {
                $stats['volunteers_updated']++;
                if (! $dryRun) {
                    $volunteer->save();
                }
            }
        }
    }
}

echo "Modo: ".($dryRun ? 'DRY-RUN' : 'APLICAÇÃO').PHP_EOL;
foreach ($stats as $k => $v) {
    echo "{$k}: {$v}".PHP_EOL;
}

if ($unmatched !== []) {
    $out = __DIR__.'/../storage/app/exports/unmatched-volunteer-emails.csv';
    if (! is_dir(dirname($out))) {
        mkdir(dirname($out), 0775, true);
    }
    $fp = fopen($out, 'w');
    fputcsv($fp, ['row', 'email', 'name']);
    foreach ($unmatched as $row) {
        fputcsv($fp, [$row['row'], $row['email'], $row['name']]);
    }
    fclose($fp);
    echo "Unmatched salvo em: {$out}".PHP_EOL;
}

function cell(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $sheet, string $col, int $row): string
{
    $v = $sheet->getCell($col.$row)->getFormattedValue();
    return trim((string) $v);
}

function cellRaw(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $sheet, string $col, int $row): mixed
{
    return $sheet->getCell($col.$row)->getValue();
}

function normalizeEmail(?string $email): ?string
{
    $e = strtolower(trim((string) $email));
    if ($e === '' || ! filter_var($e, FILTER_VALIDATE_EMAIL)) {
        return null;
    }
    return $e;
}

function normalizePhone(?string $phone): ?string
{
    $digits = preg_replace('/\D+/', '', (string) $phone);
    if ($digits === '' || strlen($digits) < 8) {
        return null;
    }
    return $digits;
}

function parseDate(mixed $raw): ?\Carbon\Carbon
{
    if ($raw === null || $raw === '') {
        return null;
    }
    try {
        if (is_numeric($raw)) {
            return \Carbon\Carbon::instance(ExcelDate::excelToDateTimeObject((float) $raw));
        }
        if ($raw instanceof \DateTimeInterface) {
            return \Carbon\Carbon::instance(\DateTimeImmutable::createFromInterface($raw));
        }
        return \Carbon\Carbon::parse((string) $raw);
    } catch (\Throwable) {
        return null;
    }
}

function boolPt(?string $raw): ?bool
{
    $s = mb_strtolower(trim((string) $raw));
    if ($s === '') {
        return null;
    }
    if (preg_match('/^(sim|s|yes|true|1)\b/u', $s)) {
        return true;
    }
    if (preg_match('/^(não|nao|n|no|false|0)\b/u', $s)) {
        return false;
    }
    return null;
}

function boolLgpd(?string $raw): ?bool
{
    $s = trim((string) $raw);
    if ($s === '') {
        return null;
    }
    if (preg_match('/autorizo/i', $s)) {
        return true;
    }
    return boolPt($s);
}

function attendanceCode(?string $raw): ?string
{
    $s = mb_strtolower(trim((string) $raw));
    if ($s === '') {
        return null;
    }
    $map = [
        'menos de 3 meses' => 'less_than_3_months',
        '3-6 meses' => 'months_3_6',
        '3 a 6 meses' => 'months_3_6',
        '6-12 meses' => 'months_6_12',
        '6 meses a 1 ano' => 'months_6_12',
        '1-3 anos' => 'years_1_3',
        '1 a 3 anos' => 'years_1_3',
        '+ 3 anos' => 'more_than_3_years',
        'mais de 3 anos' => 'more_than_3_years',
    ];
    return $map[$s] ?? null;
}

function parseMemberRegistration(?string $raw): array
{
    $v = trim((string) $raw);
    if ($v === '') {
        return [null, null];
    }
    $l = mb_strtolower($v);
    if (str_contains($l, 'nova semente') || preg_match('/^(sim|s)\s*$/u', $l)) {
        return [true, null];
    }
    if (preg_match('/^(não|nao)\s*$/u', $l)) {
        return [false, null];
    }
    return [false, $v];
}
