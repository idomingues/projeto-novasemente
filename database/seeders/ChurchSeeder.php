<?php

namespace Database\Seeders;

use App\Models\Church;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Schema;

class ChurchSeeder extends Seeder
{
    public function run(): void
    {
        $hasSlug = Schema::hasColumn('churches', 'slug');

        if ($hasSlug) {
            Church::firstOrCreate(
                ['slug' => 'nova-semente'],
                [
                    'name' => 'Nova Semente',
                    'logo_url' => null,
                    'city' => null,
                    'state' => null,
                    'country' => null,
                    'description' => 'Primeira igreja a utilizar o sistema New Church.',
                    'active' => true,
                ]
            );
            return;
        }

        // Tabela ainda sem coluna slug (migração pendente): cria igreja pelo id
        Church::firstOrCreate(
            ['id' => 1],
            []
        );
    }
}

