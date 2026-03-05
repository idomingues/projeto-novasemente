<?php

namespace Database\Seeders;

use App\Models\Member;
use App\Models\Ministry;
use App\Models\Volunteer;
use Illuminate\Database\Seeder;

class VolunteerSeeder extends Seeder
{
    public function run(): void
    {
        $members = Member::all();
        $ministries = Ministry::all();

        if ($members->isEmpty() || $ministries->isEmpty()) {
            return;
        }

        $roles = ['Músico', 'Vocal', 'Apoio', 'Líder', 'Auxiliar', null];

        foreach ($members->take(12) as $index => $member) {
            $ministry = $ministries->random();
            Volunteer::firstOrCreate(
                [
                    'member_id' => $member->id,
                    'ministry_id' => $ministry->id,
                ],
                [
                    'role' => $roles[array_rand($roles)],
                    'active' => true,
                ]
            );
        }

        // Garantir variedade: alguns membros em mais de um ministério
        foreach ($members->skip(2)->take(5) as $member) {
            $extra = $ministries->random();
            Volunteer::firstOrCreate(
                [
                    'member_id' => $member->id,
                    'ministry_id' => $extra->id,
                ],
                [
                    'role' => 'Apoio',
                    'active' => true,
                ]
            );
        }
    }
}
