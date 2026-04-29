<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('photo_albums', function (Blueprint $table) {
            $table->string('photographer_name')->nullable()->after('title');
        });
    }

    public function down(): void
    {
        Schema::table('photo_albums', function (Blueprint $table) {
            $table->dropColumn('photographer_name');
        });
    }
};
