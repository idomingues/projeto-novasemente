<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pastors', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('church_id')->constrained('users')->nullOnDelete();
        });

        Schema::table('pastors', function (Blueprint $table) {
            $table->unique(['church_id', 'user_id']);
        });

        Schema::table('pastoral_appointments', function (Blueprint $table) {
            $table->string('preferred_modality', 20)->nullable()->after('preferred_start');
        });
    }

    public function down(): void
    {
        Schema::table('pastoral_appointments', function (Blueprint $table) {
            $table->dropColumn('preferred_modality');
        });

        Schema::table('pastors', function (Blueprint $table) {
            $table->dropUnique(['church_id', 'user_id']);
        });

        Schema::table('pastors', function (Blueprint $table) {
            $table->dropConstrainedForeignId('user_id');
        });
    }
};
