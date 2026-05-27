<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('app_support_tickets', function (Blueprint $table) {
            $table->string('demand_category', 20)->nullable()->after('type');
            $table->string('priority', 20)->default('medium')->after('demand_category');
        });
    }

    public function down(): void
    {
        Schema::table('app_support_tickets', function (Blueprint $table) {
            $table->dropColumn(['demand_category', 'priority']);
        });
    }
};
