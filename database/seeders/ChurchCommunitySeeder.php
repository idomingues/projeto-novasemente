<?php

namespace Database\Seeders;

use App\Models\Church;
use App\Models\ChurchCommunity;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

class ChurchCommunitySeeder extends Seeder
{
    public function run(): void
    {
        if (! Schema::hasTable('church_communities')) {
            return;
        }

        $church = Church::query()->where('active', true)->orderBy('id')->first()
            ?? Church::query()->orderBy('id')->first();

        if (! $church) {
            return;
        }

        $coverPath = $this->ensureSevenBikeCover();

        $community = ChurchCommunity::firstOrCreate(
            [
                'church_id' => $church->id,
                'name' => 'Seven Bike Nova Semente',
            ],
            [
                'description' => 'Comunidade de ciclismo da Nova Semente — pedaladas, eventos e convivência no WhatsApp.',
                'whatsapp_url' => 'https://chat.whatsapp.com/HHy3EffBYja69JibdgRVhC',
                'sort_order' => 10,
                'is_published' => true,
                'cover_path' => $coverPath,
            ],
        );

        if ($coverPath !== null && $community->cover_path !== $coverPath) {
            $community->update(['cover_path' => $coverPath]);
        }
    }

    private function ensureSevenBikeCover(): ?string
    {
        $relativePath = 'communities/covers/seven-bike-nova-semente.jpg';
        $source = database_path('seed-assets/communities/seven-bike-nova-semente.jpg');

        if (! is_file($source)) {
            return Storage::disk('public')->exists($relativePath) ? $relativePath : null;
        }

        if (! Storage::disk('public')->exists($relativePath)) {
            Storage::disk('public')->makeDirectory('communities/covers');
            File::copy($source, Storage::disk('public')->path($relativePath));
        }

        return $relativePath;
    }
}
