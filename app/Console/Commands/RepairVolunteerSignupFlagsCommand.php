<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Support\VolunteerSignupCompletion;
use Illuminate\Console\Command;

/**
 * Restaura is_volunteer=true para quem já iniciou o questionário e perdeu a flag
 * (autosave antigo zerava is_volunteer enquanto o cadastro ainda estava incompleto).
 */
class RepairVolunteerSignupFlagsCommand extends Command
{
    protected $signature = 'volunteers:repair-signup-flags
                            {--dry-run : Só lista quem seria corrigido}';

    protected $description = 'Restaura is_volunteer para cadastros incompletos com progresso no questionário.';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $repaired = 0;
        $skipped = 0;

        $users = User::query()
            ->where('is_volunteer', false)
            ->whereHas('volunteerProfile')
            ->with('volunteerProfile')
            ->orderBy('id')
            ->get();

        foreach ($users as $user) {
            $completion = VolunteerSignupCompletion::forUser($user);
            $answered = max(0, $completion['total_required'] - $completion['missing_count']);

            // Só restaura quem já respondeu algo — evita marcar quem só tem perfil vazio.
            if ($answered < 1) {
                $skipped++;

                continue;
            }

            $this->line(sprintf(
                '%s #%d %s (%d%% · faltam %d)',
                $dryRun ? '[dry-run]' : '[ok]',
                $user->id,
                $user->name ?: $user->email,
                $completion['percent'],
                $completion['missing_count'],
            ));

            if (! $dryRun) {
                $user->forceFill(['is_volunteer' => true])->save();
            }

            $repaired++;
        }

        $this->info($dryRun
            ? "Dry-run: {$repaired} usuário(s) seriam restaurados; {$skipped} ignorado(s)."
            : "Restaurados: {$repaired}; ignorados: {$skipped}.");

        return self::SUCCESS;
    }
}
