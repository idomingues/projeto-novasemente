<?php

namespace Database\Seeders;

use App\Models\TalentCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class TalentCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            'Aulas particulares',
            'Informática',
            'Manutenção residencial',
            'Costura',
            'Transporte',
            'Cuidados pessoais',
            'Música',
            'Reforço escolar',
            'Serviços administrativos',
            'Design / arte',
            'Alimentação',
            'Saúde e bem-estar',
            'Outros',
        ];

        foreach ($categories as $index => $name) {
            TalentCategory::query()->firstOrCreate(
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
