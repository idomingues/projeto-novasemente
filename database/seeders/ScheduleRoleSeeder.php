<?php

namespace Database\Seeders;

use App\Models\ScheduleRole;
use Illuminate\Database\Seeder;

class ScheduleRoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = ['Portaria', 'Som', 'Recepção', 'Intercessão', 'Louvor', 'Oferta'];
        foreach ($roles as $name) {
            ScheduleRole::firstOrCreate(['name' => $name]);
        }
    }
}
