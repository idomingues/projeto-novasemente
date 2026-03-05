<?php

namespace Database\Seeders;

use App\Models\Church;
use Illuminate\Database\Seeder;

class ChurchSeeder extends Seeder
{
    public function run(): void
    {
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
    }
}

