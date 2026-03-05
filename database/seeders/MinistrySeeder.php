<?php

namespace Database\Seeders;

use App\Models\Ministry;
use Illuminate\Database\Seeder;

class MinistrySeeder extends Seeder
{
    public function run(): void
    {
        $names = ['Louvor', 'Portaria', 'Som', 'Intercessão', 'Crianças', 'Recepção', 'Midia'];
        foreach ($names as $name) {
            Ministry::firstOrCreate(['name' => $name]);
        }
    }
}
