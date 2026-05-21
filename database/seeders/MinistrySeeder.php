<?php

namespace Database\Seeders;

use App\Models\Church;
use App\Models\Ministry;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Schema;

class MinistrySeeder extends Seeder
{
    public function run(): void
    {
        $names = ['Louvor', 'Portaria', 'Som', 'Intercessão', 'Crianças', 'Recepção', 'Midia', 'Voluntariado'];
        $churchId = null;
        if (Schema::hasTable('churches')) {
            $churchId = Church::query()
                ->where('slug', 'nova-semente')
                ->value('id');
            if (! $churchId && Schema::hasColumn('churches', 'active')) {
                $churchId = Church::query()->where('active', true)->orderBy('name')->value('id');
            }
            if (! $churchId) {
                $churchId = Church::query()->orderBy('id')->value('id');
            }
        }

        foreach ($names as $name) {
            if (Schema::hasColumn('ministries', 'church_id') && $churchId) {
                Ministry::firstOrCreate(['church_id' => $churchId, 'name' => $name]);
            } else {
                Ministry::firstOrCreate(['name' => $name]);
            }
        }
    }
}
