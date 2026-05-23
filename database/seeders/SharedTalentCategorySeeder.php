<?php

namespace Database\Seeders;

use App\Models\SharedTalentCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class SharedTalentCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            'Música',
            'Educação',
            'Tecnologia',
            'Idiomas',
            'Artes',
            'Esportes',
            'Saúde',
            'Desenvolvimento pessoal',
            'Infantil',
            'Bíblia e discipulado',
            'Profissionalizante',
            'Outros',
        ];

        foreach ($categories as $index => $name) {
            SharedTalentCategory::query()->firstOrCreate(
                ['church_id' => null, 'slug' => Str::slug($name)],
                [
                    'name' => $name,
                    'sort_order' => $index + 1,
                    'is_active' => true,
                ]
            );
        }
    }
}
