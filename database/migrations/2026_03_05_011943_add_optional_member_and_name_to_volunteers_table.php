<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('volunteers', function (Blueprint $table) {
            $table->dropForeign(['member_id']);
        });
        DB::statement('ALTER TABLE volunteers MODIFY member_id BIGINT UNSIGNED NULL');
        Schema::table('volunteers', function (Blueprint $table) {
            $table->string('name')->nullable()->after('member_id');
            $table->string('email')->nullable()->after('name');
            $table->string('phone')->nullable()->after('email');
            $table->foreign('member_id')->references('id')->on('members')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('volunteers', function (Blueprint $table) {
            $table->dropForeign(['member_id']);
        });
        DB::statement('ALTER TABLE volunteers MODIFY member_id BIGINT UNSIGNED NOT NULL');
        Schema::table('volunteers', function (Blueprint $table) {
            $table->dropColumn(['name', 'email', 'phone']);
            $table->foreign('member_id')->references('id')->on('members')->cascadeOnDelete();
        });
    }
};
