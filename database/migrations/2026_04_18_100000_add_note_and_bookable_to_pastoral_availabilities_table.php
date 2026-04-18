<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pastoral_availabilities', function (Blueprint $table) {
            $table->string('note', 500)->nullable()->after('modality');
            $table->boolean('bookable_by_members')->default(true)->after('note');
        });
    }

    public function down(): void
    {
        Schema::table('pastoral_availabilities', function (Blueprint $table) {
            $table->dropColumn(['note', 'bookable_by_members']);
        });
    }
};
