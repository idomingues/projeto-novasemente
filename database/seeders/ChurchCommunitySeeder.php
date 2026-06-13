<?php

namespace Database\Seeders;

use App\Support\CommunityAssetInstaller;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Schema;

class ChurchCommunitySeeder extends Seeder
{
    public function run(): void
    {
        if (! Schema::hasTable('church_communities')) {
            return;
        }

        CommunityAssetInstaller::installSevenBike();
    }
}
