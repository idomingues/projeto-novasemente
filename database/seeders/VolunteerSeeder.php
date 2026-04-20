<?php

namespace Database\Seeders;

use App\Models\Ministry;
use App\Models\User;
use App\Models\Volunteer;
use Illuminate\Database\Seeder;

class VolunteerSeeder extends Seeder
{
    public function run(): void
    {
        $users = User::query()->whereNotNull('church_id')->get();
        $ministries = Ministry::all();

        if ($users->isEmpty() || $ministries->isEmpty()) {
            return;
        }

        $roles = ['Músico', 'Vocal', 'Apoio', 'Líder', 'Auxiliar', null];

        foreach ($users->take(12) as $user) {
            $ministry = $ministries->random();
            $volunteer = Volunteer::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $roles[array_rand($roles)],
                    'active' => true,
                ]
            );
            $volunteer->ministries()->syncWithoutDetaching([$ministry->id]);
        }

        foreach ($users->skip(2)->take(5) as $user) {
            $extra = $ministries->random();
            $volunteer = Volunteer::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => 'Apoio',
                    'active' => true,
                ]
            );
            $volunteer->ministries()->syncWithoutDetaching([$extra->id]);
        }
    }
}
