<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('donation_campaigns', function (Blueprint $table) {
            $table->date('starts_at')->nullable()->after('status');
        });

        DB::statement('UPDATE donation_campaigns SET starts_at = DATE(created_at) WHERE starts_at IS NULL');
    }

    public function down(): void
    {
        Schema::table('donation_campaigns', function (Blueprint $table) {
            $table->dropColumn('starts_at');
        });
    }
};
