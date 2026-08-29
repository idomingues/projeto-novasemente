<?php

namespace Database\Seeders;

use App\Models\Church;
use App\Models\Ministry;
use App\Models\ScheduleAssignment;
use App\Models\ScheduleCoordinator;
use App\Models\ScheduleRole;
use App\Models\User;
use App\Models\Volunteer;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Cadastra voluntários (diáconos) e escalas da IASD Paraíso - Nova Semente:
 * 1º, 2º, 3º e 4º sábados com coordenador e lista de diáconos.
 * O 5º sábado (meses com 5 semanas) é incluído vazio (sem voluntários).
 */
class DeaconsSeeder extends Seeder
{
    public function run(): void
    {
        $churchId = null;
        if (Schema::hasColumn('churches', 'active')) {
            $churchId = Church::where('active', true)->orderBy('id')->value('id');
        }
        if (! $churchId && Schema::hasColumn('churches', 'slug')) {
            $churchId = Church::where('slug', 'nova-semente')->value('id');
        }
        if (! $churchId) {
            $churchId = Church::orderBy('id')->value('id');
        }

        if (! $churchId) {
            $this->command->warn('Nenhuma igreja ativa encontrada. Crie a igreja Nova Semente antes.');

            return;
        }

        $ministry = Ministry::where('name', 'Diáconos')
            ->where(fn ($q) => $q->where('church_id', $churchId)->orWhereNull('church_id'))
            ->first();
        if (! $ministry) {
            $ministry = Ministry::create([
                'church_id' => $churchId,
                'name' => 'Diáconos',
                'icon' => 'user_group',
                'description' => null,
            ]);
        } elseif (! $ministry->church_id) {
            $ministry->update(['church_id' => $churchId]);
        }

        $roleCoordenador = ScheduleRole::firstOrCreate(['name' => 'Coordenador']);

        $bySaturday = [
            1 => [
                ['name' => 'Antonio Natanael de Paiva', 'coordinator' => true],
                ['name' => 'Davi Ferronato', 'coordinator' => false],
                ['name' => 'Rogério Ferreira', 'coordinator' => false],
                ['name' => 'Alexandre Romano', 'coordinator' => false],
                ['name' => 'Geraldo Medeiros', 'coordinator' => false],
            ],
            2 => [
                ['name' => 'Marcio Preto', 'coordinator' => true],
                ['name' => 'Gil Ribeiro Chaves', 'coordinator' => false],
                ['name' => 'Ronaldo Oliveira', 'coordinator' => false],
                ['name' => 'Mauro Morbin da Cunha', 'coordinator' => false],
                ['name' => 'Rivaldo Alencar Dos Santos', 'coordinator' => false],
                ['name' => 'Lucas Doyle', 'coordinator' => false],
            ],
            3 => [
                ['name' => 'Ricardo Salomão', 'coordinator' => true],
                ['name' => 'Ivan Domingues', 'coordinator' => false],
                ['name' => 'Carlos Moura', 'coordinator' => false],
                ['name' => 'Gilberto Ramos', 'coordinator' => false],
                ['name' => 'José Alberto Ferreira Vicente', 'coordinator' => false],
            ],
            4 => [
                ['name' => 'Artur João Ferreira Filho', 'coordinator' => true],
                ['name' => 'Aslam Kildare Alberti', 'coordinator' => false],
                ['name' => 'Sidney de Oliveira', 'coordinator' => false],
                ['name' => 'Matheus Ferreira', 'coordinator' => false],
                ['name' => 'Marco Antônio Bregalante', 'coordinator' => false],
            ],
            5 => [], // Meses com 5 semanas: 5º sábado já existe no sistema, sem voluntários
        ];

        $allNames = collect($bySaturday)->flatten(1)->pluck('name')->filter()->unique()->values();
        $usersByName = [];

        foreach ($allNames as $name) {
            $name = (string) $name;
            if ($name === '') {
                continue;
            }
            $email = 'diacono-'.mb_strtolower(preg_replace('/\s+/', '-', $name)).'-'.(int) $churchId.'@invalid.local';
            $user = User::firstOrCreate(
                ['email' => $email],
                [
                    'name' => $name,
                    'password' => bcrypt(Str::random(32)),
                    'church_id' => $churchId,
                    'status' => 'active',
                ]
            );
            if ($user->church_id === null) {
                $user->update(['church_id' => $churchId]);
            }

            $volunteer = Volunteer::firstOrCreate(
                ['user_id' => $user->id],
                ['name' => $name, 'email' => $email, 'role' => 'Diácono', 'active' => true]
            );
            $volunteer->ministries()->syncWithoutDetaching([$ministry->id]);
            $usersByName[$name] = $user;
        }

        $now = now();
        $month = $now->month;
        $year = $now->year;

        foreach ($bySaturday as $saturdayNumber => $entries) {
            foreach ($entries as $entry) {
                $name = $entry['name'];
                $isCoordinator = $entry['coordinator'] ?? false;
                if (! isset($usersByName[$name])) {
                    continue;
                }
                $churchUser = $usersByName[$name];
                $volunteer = Volunteer::query()->where('user_id', $churchUser->id)->first();

                ScheduleAssignment::firstOrCreate(
                    [
                        'ministry_id' => $ministry->id,
                        'user_id' => $churchUser->id,
                        'saturday_number' => $saturdayNumber,
                        'schedule_date' => null,
                    ],
                    [
                        'schedule_role_id' => $isCoordinator ? $roleCoordenador->id : null,
                        'volunteer_id' => $volunteer?->id,
                        'recurring' => true,
                        'assignment_month' => null,
                        'assignment_year' => null,
                        'status' => 'pending',
                    ]
                );

                if ($isCoordinator && $volunteer) {
                    ScheduleCoordinator::firstOrCreate(
                        [
                            'ministry_id' => $ministry->id,
                            'saturday_number' => $saturdayNumber,
                            'schedule_date' => null,
                            'recurring' => true,
                        ],
                        [
                            'volunteer_id' => $volunteer->id,
                            'user_id' => $churchUser->id,
                            'assignment_month' => null,
                            'assignment_year' => null,
                        ]
                    );
                }
            }
        }

        $totalMembers = count($usersByName);
        $totalAssignments = collect($bySaturday)->flatten(1)->count();
        $this->command->info("Diáconos: {$totalMembers} voluntários cadastrados e {$totalAssignments} escalas (1º a 4º sábado). O 5º sábado aparece nos meses com 5 semanas, vazio.");
    }
}
