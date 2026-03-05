<?php

namespace Database\Seeders;

use App\Models\Church;
use App\Models\Member;
use App\Models\Ministry;
use App\Models\ScheduleAssignment;
use App\Models\ScheduleRole;
use App\Models\Volunteer;
use Illuminate\Database\Seeder;

/**
 * Cadastra voluntários (diáconos) e escalas da IASD Paraíso - Nova Semente:
 * 1º, 2º, 3º e 4º sábados com coordenador e lista de diáconos.
 */
class DeaconsSeeder extends Seeder
{
    public function run(): void
    {
        $churchId = Church::where('active', true)->orderBy('name')->value('id')
            ?? Church::where('slug', 'nova-semente')->value('id');

        if (!$churchId) {
            $this->command->warn('Nenhuma igreja ativa encontrada. Crie a igreja Nova Semente antes.');
            return;
        }

        $ministry = Ministry::where('name', 'Diáconos')
            ->where(fn ($q) => $q->where('church_id', $churchId)->orWhereNull('church_id'))
            ->first();
        if (!$ministry) {
            $ministry = Ministry::create([
                'church_id' => $churchId,
                'name' => 'Diáconos',
                'icon' => 'user_group',
                'description' => null,
            ]);
        } elseif (!$ministry->church_id) {
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
        ];

        $allNames = collect($bySaturday)->flatten(1)->pluck('name')->filter()->unique()->values();
        $membersByName = [];

        foreach ($allNames as $name) {
            $name = (string) $name;
            if ($name === '') {
                continue;
            }
            $member = Member::firstOrCreate(
                ['name' => $name, 'church_id' => $churchId],
                ['status' => 'active']
            );

            $volunteer = Volunteer::firstOrCreate(
                ['member_id' => $member->id],
                ['role' => 'Diácono', 'active' => true]
            );
            $volunteer->ministries()->syncWithoutDetaching([$ministry->id]);
            $membersByName[$name] = $member;
        }

        $now = now();
        $month = $now->month;
        $year = $now->year;

        foreach ($bySaturday as $saturdayNumber => $entries) {
            foreach ($entries as $entry) {
                $name = $entry['name'];
                $isCoordinator = $entry['coordinator'] ?? false;
                if (!isset($membersByName[$name])) {
                    continue;
                }
                $member = $membersByName[$name];

                ScheduleAssignment::firstOrCreate(
                    [
                        'ministry_id' => $ministry->id,
                        'member_id' => $member->id,
                        'saturday_number' => $saturdayNumber,
                        'schedule_date' => null,
                    ],
                    [
                        'schedule_role_id' => $isCoordinator ? $roleCoordenador->id : null,
                        'recurring' => true,
                        'assignment_month' => null,
                        'assignment_year' => null,
                        'status' => 'pending',
                    ]
                );
            }
        }

        $totalMembers = count($membersByName);
        $totalAssignments = collect($bySaturday)->flatten(1)->count();
        $this->command->info("Diáconos: {$totalMembers} voluntários cadastrados e {$totalAssignments} escalas (1º a 4º sábado) criadas.");
    }
}
