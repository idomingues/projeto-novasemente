<?php

namespace Database\Seeders;

use App\Models\Church;
use App\Models\ConvivaClass;
use Illuminate\Database\Seeder;

class ConvivaClassSeeder extends Seeder
{
    public function run(): void
    {
        $churchId = Church::query()->where('active', true)->orderBy('id')->value('id')
            ?? Church::query()->orderBy('id')->value('id');

        if (! $churchId) {
            return;
        }

        if (ConvivaClass::query()->where('church_id', $churchId)->exists()) {
            return;
        }

        $examples = [
            ['room_name' => 'Sala 1', 'teacher_name' => 'Maria Silva', 'sort_order' => 1],
            ['room_name' => 'Sala 2', 'teacher_name' => 'João Pereira', 'sort_order' => 2],
            ['room_name' => 'Sala 3', 'teacher_name' => 'Ana Costa', 'sort_order' => 3],
            ['room_name' => 'Mezanino A', 'teacher_name' => 'Pedro Oliveira', 'sort_order' => 4],
            ['room_name' => 'Mezanino B', 'teacher_name' => 'Juliana Santos', 'sort_order' => 5],
            ['room_name' => 'Sala Jovens', 'teacher_name' => 'Lucas Ferreira', 'sort_order' => 6],
        ];

        foreach ($examples as $row) {
            ConvivaClass::create([
                'church_id' => $churchId,
                'room_name' => $row['room_name'],
                'teacher_name' => $row['teacher_name'],
                'is_active' => true,
                'sort_order' => $row['sort_order'],
            ]);
        }
    }
}
