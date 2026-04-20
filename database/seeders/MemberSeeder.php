<?php

namespace Database\Seeders;

use App\Models\Church;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Semeadura de utilizadores com ficha na igreja (substitui o antigo modelo Member).
 */
class MemberSeeder extends Seeder
{
    public function run(): void
    {
        $churchId = Church::query()->value('id');
        if ($churchId === null) {
            return;
        }

        User::factory()->count(15)->create([
            'church_id' => $churchId,
            'status' => 'active',
        ]);
    }
}
