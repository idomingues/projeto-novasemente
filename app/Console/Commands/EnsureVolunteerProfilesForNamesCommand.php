<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class EnsureVolunteerProfilesForNamesCommand extends Command
{
    protected $signature = 'volunteers:ensure-for-users {names* : Partes do nome ou e-mail (ex: Izabel Fabiana)}';

    protected $description = 'Cria ou atualiza o registo em volunteers para utilizadores encontrados pelo nome/e-mail.';

    public function handle(): int
    {
        $fragments = $this->argument('names');
        if ($fragments === [] || $fragments === null) {
            $this->error('Informe pelo menos um nome ou parte do e-mail.');

            return self::FAILURE;
        }

        $any = false;

        foreach ($fragments as $fragment) {
            $fragment = trim((string) $fragment);
            if ($fragment === '') {
                continue;
            }

            $like = '%'.$fragment.'%';
            $users = User::query()
                ->where(function ($q) use ($like) {
                    $q->where('name', 'like', $like)
                        ->orWhere('email', 'like', $like);
                })
                ->orderBy('name')
                ->get();

            if ($users->isEmpty()) {
                $this->warn("Nenhum utilizador encontrado para \"{$fragment}\".");

                continue;
            }

            foreach ($users as $user) {
                $hadVolunteer = $user->volunteerProfile()->exists();
                $user->ensureVolunteerProfile();
                $any = true;

                $volunteerId = $user->volunteerProfile()->value('id');
                $this->info(sprintf(
                    'OK: %s <%s> — voluntário #%s (%s)',
                    $user->name,
                    $user->email ?? 'sem e-mail',
                    $volunteerId ?? '?',
                    $hadVolunteer ? 'atualizado' : 'criado'
                ));
            }
        }

        if (! $any) {
            $this->error('Nenhum utilizador foi processado.');

            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
