<?php

use App\Support\CommunityAssetInstaller;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('church_communities')) {
            return;
        }

        CommunityAssetInstaller::installSevenBike();
    }

    public function down(): void
    {
        //
    }
};
