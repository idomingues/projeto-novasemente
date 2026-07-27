<?php

namespace App\Console\Commands;

use App\Models\MissionVolunteer;
use App\Models\User;
use App\Models\Volunteer;
use Carbon\Carbon;
use Illuminate\Console\Attributes\AsCommand;
use Illuminate\Console\Command;

#[AsCommand(
    name: 'volunteers:sync-birth-dates',
    description: 'Preenche datas de nascimento confiáveis em voluntários/usuários e zera datas inválidas.',
)]
class SyncVolunteerBirthDatesCommand extends Command
{
    /** Idade mínima para aceitar uma data como confiável (mesmo critério do cadastro de voluntário). */
    private const MIN_AGE_YEARS = 10;

    /** Ano mínimo aceitável (evita lixo / typos extremos). */
    private const MIN_YEAR = 1900;

    protected $signature = 'volunteers:sync-birth-dates
                            {--dry-run : Só mostra o que seria alterado}';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $stats = [
            'scrubbed_vol' => 0,
            'scrubbed_user' => 0,
            'vol_from_user' => 0,
            'vol_from_mission' => 0,
            'user_from_vol' => 0,
            'divergence_fixed' => 0,
            'skipped_untrusted' => 0,
            'still_without' => 0,
        ];

        $this->scrubInvalidDates($dryRun, $stats);

        $missionByEmail = $this->missionBirthDatesByEmail();

        Volunteer::query()
            ->with(['user:id,birth_date'])
            ->orderBy('id')
            ->chunkById(200, function ($volunteers) use ($dryRun, $missionByEmail, &$stats): void {
                foreach ($volunteers as $volunteer) {
                    $this->syncOne($volunteer, $missionByEmail, $dryRun, $stats);
                }
            });

        $stats['still_without'] = (int) Volunteer::query()->whereNull('birth_date')->count();

        $prefix = $dryRun ? 'Dry-run' : 'Aplicado';
        $this->info(sprintf(
            '%s: inválidas vol=%d user=%d · vol←user=%d · vol←missão=%d · user←vol=%d · divergências=%d · ignoradas=%d · voluntários ainda sem data=%d',
            $prefix,
            $stats['scrubbed_vol'],
            $stats['scrubbed_user'],
            $stats['vol_from_user'],
            $stats['vol_from_mission'],
            $stats['user_from_vol'],
            $stats['divergence_fixed'],
            $stats['skipped_untrusted'],
            $stats['still_without'],
        ));

        return self::SUCCESS;
    }

    /**
     * @param  array{scrubbed_vol: int, scrubbed_user: int, vol_from_user: int, vol_from_mission: int, user_from_vol: int, divergence_fixed: int, skipped_untrusted: int, still_without: int}  $stats
     */
    private function scrubInvalidDates(bool $dryRun, array &$stats): void
    {
        Volunteer::query()
            ->whereNotNull('birth_date')
            ->orderBy('id')
            ->chunkById(200, function ($rows) use ($dryRun, &$stats): void {
                foreach ($rows as $volunteer) {
                    $raw = $this->rawDate($volunteer->getAttributes()['birth_date'] ?? null);
                    if ($raw !== null && $this->isTrustedBirthDate($raw)) {
                        continue;
                    }
                    $stats['scrubbed_vol']++;
                    $this->line(sprintf(
                        '%s limpa vol#%d data inválida (%s)',
                        $dryRun ? '[dry-run]' : '[ok]',
                        $volunteer->id,
                        $raw ?? 'nula/ilegível',
                    ));
                    if (! $dryRun) {
                        $volunteer->forceFill(['birth_date' => null])->save();
                    }
                }
            });

        User::query()
            ->whereNotNull('birth_date')
            ->orderBy('id')
            ->chunkById(200, function ($rows) use ($dryRun, &$stats): void {
                foreach ($rows as $user) {
                    $raw = $this->rawDate($user->getAttributes()['birth_date'] ?? null);
                    if ($raw !== null && $this->isTrustedBirthDate($raw)) {
                        continue;
                    }
                    $stats['scrubbed_user']++;
                    $this->line(sprintf(
                        '%s limpa user#%d data inválida (%s)',
                        $dryRun ? '[dry-run]' : '[ok]',
                        $user->id,
                        $raw ?? 'nula/ilegível',
                    ));
                    if (! $dryRun) {
                        $user->forceFill(['birth_date' => null])->save();
                    }
                }
            });
    }

    /**
     * @param  array<string, string>  $missionByEmail
     * @param  array{scrubbed_vol: int, scrubbed_user: int, vol_from_user: int, vol_from_mission: int, user_from_vol: int, divergence_fixed: int, skipped_untrusted: int, still_without: int}  $stats
     */
    private function syncOne(Volunteer $volunteer, array $missionByEmail, bool $dryRun, array &$stats): void
    {
        // Recarrega após scrub (chunk anterior pode ter alterado).
        $volunteer->refresh();
        $volunteer->load(['user:id,birth_date']);

        $volRaw = $this->trustedDate($volunteer->getAttributes()['birth_date'] ?? null);
        $user = $volunteer->user;
        $userRaw = $user ? $this->trustedDate($user->getAttributes()['birth_date'] ?? null) : null;

        if ($volRaw === null) {
            if ($userRaw !== null) {
                $this->applyVolunteerBirthDate($volunteer, $userRaw, $dryRun);
                $stats['vol_from_user']++;
                $volRaw = $userRaw;
                $this->line(sprintf(
                    '%s vol#%d ← user#%d %s (%s)',
                    $dryRun ? '[dry-run]' : '[ok]',
                    $volunteer->id,
                    (int) $user->id,
                    $volunteer->name ?: 'Sem nome',
                    $userRaw,
                ));
            } else {
                $emailKey = $this->normalizeEmail((string) ($volunteer->email ?? ''));
                $missionRaw = $emailKey !== null ? ($missionByEmail[$emailKey] ?? null) : null;
                if ($missionRaw !== null) {
                    $this->applyVolunteerBirthDate($volunteer, $missionRaw, $dryRun);
                    $stats['vol_from_mission']++;
                    $volRaw = $missionRaw;
                    $this->line(sprintf(
                        '%s vol#%d ← missão %s (%s)',
                        $dryRun ? '[dry-run]' : '[ok]',
                        $volunteer->id,
                        $volunteer->name ?: 'Sem nome',
                        $missionRaw,
                    ));
                } elseif ($this->rawDate($volunteer->getAttributes()['birth_date'] ?? null) !== null
                    || ($user && $this->rawDate($user->getAttributes()['birth_date'] ?? null) !== null)) {
                    $stats['skipped_untrusted']++;
                }
            }
        }

        if ($user === null || $volRaw === null) {
            return;
        }

        $user->refresh();
        $userRaw = $this->trustedDate($user->getAttributes()['birth_date'] ?? null);

        if ($userRaw === null) {
            $this->applyUserBirthDate($user, $volRaw, $dryRun);
            $stats['user_from_vol']++;
            $this->line(sprintf(
                '%s user#%d ← vol#%d (%s)',
                $dryRun ? '[dry-run]' : '[ok]',
                (int) $user->id,
                $volunteer->id,
                $volRaw,
            ));

            return;
        }

        if ($userRaw !== $volRaw) {
            $this->applyUserBirthDate($user, $volRaw, $dryRun);
            $stats['divergence_fixed']++;
            $this->line(sprintf(
                '%s divergência user#%d %s → %s (vol#%d)',
                $dryRun ? '[dry-run]' : '[ok]',
                (int) $user->id,
                $userRaw,
                $volRaw,
                $volunteer->id,
            ));
        }
    }

    private function applyVolunteerBirthDate(Volunteer $volunteer, string $ymd, bool $dryRun): void
    {
        if ($dryRun || ! $this->isTrustedBirthDate($ymd)) {
            return;
        }

        $volunteer->forceFill(['birth_date' => $ymd])->save();
    }

    private function applyUserBirthDate(User $user, string $ymd, bool $dryRun): void
    {
        if ($dryRun || ! $this->isTrustedBirthDate($ymd)) {
            return;
        }

        $user->forceFill(['birth_date' => $ymd])->save();
    }

    /**
     * @return array<string, string> email normalizado => Y-m-d
     */
    private function missionBirthDatesByEmail(): array
    {
        $map = [];

        MissionVolunteer::query()
            ->whereNotNull('birth_date')
            ->whereNotNull('email')
            ->orderBy('id')
            ->get(['id', 'email', 'birth_date'])
            ->each(function (MissionVolunteer $row) use (&$map): void {
                $email = $this->normalizeEmail((string) $row->email);
                if ($email === null) {
                    return;
                }
                $ymd = $this->trustedDate($row->getAttributes()['birth_date'] ?? null);
                if ($ymd === null) {
                    return;
                }
                if (! isset($map[$email])) {
                    $map[$email] = $ymd;
                }
            });

        return $map;
    }

    private function normalizeEmail(string $email): ?string
    {
        $email = strtolower(trim($email));
        if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return null;
        }

        return $email;
    }

    private function trustedDate(mixed $value): ?string
    {
        $ymd = $this->rawDate($value);
        if ($ymd === null || ! $this->isTrustedBirthDate($ymd)) {
            return null;
        }

        return $ymd;
    }

    /**
     * Aceita só datas plausíveis: antes de hoje, >= 10 anos, ano >= 1900.
     * Sem certeza → null (não propaga).
     */
    private function isTrustedBirthDate(string $ymd): bool
    {
        if (preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $ymd, $m) !== 1) {
            return false;
        }

        $year = (int) $m[1];
        $month = (int) $m[2];
        $day = (int) $m[3];
        if (! checkdate($month, $day, $year)) {
            return false;
        }

        if ($year < self::MIN_YEAR) {
            return false;
        }

        $date = Carbon::createFromDate($year, $month, $day)->startOfDay();
        $today = now()->startOfDay();

        if ($date->gte($today)) {
            return false;
        }

        $minBirth = $today->copy()->subYears(self::MIN_AGE_YEARS);

        return $date->lte($minBirth);
    }

    private function rawDate(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if ($value instanceof Carbon) {
            return $value->toDateString();
        }

        if (is_string($value) && preg_match('/^(\d{4})-(\d{2})-(\d{2})/', $value, $m) === 1) {
            return $m[1].'-'.$m[2].'-'.$m[3];
        }

        try {
            return Carbon::parse((string) $value)->toDateString();
        } catch (\Throwable) {
            return null;
        }
    }
}
