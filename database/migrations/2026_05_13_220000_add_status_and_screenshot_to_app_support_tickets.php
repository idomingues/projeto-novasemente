<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('app_support_tickets', function (Blueprint $table) {
            if (! Schema::hasColumn('app_support_tickets', 'screenshot_path')) {
                $table->string('screenshot_path')->nullable()->after('status');
            }
            if (! Schema::hasColumn('app_support_tickets', 'screenshot_url')) {
                $table->string('screenshot_url')->nullable()->after('screenshot_path');
            }
        });
    }

    public function down(): void
    {
        Schema::table('app_support_tickets', function (Blueprint $table) {
            if (Schema::hasColumn('app_support_tickets', 'screenshot_url')) {
                $table->dropColumn('screenshot_url');
            }
            if (Schema::hasColumn('app_support_tickets', 'screenshot_path')) {
                $table->dropColumn('screenshot_path');
            }
        });
    }
};
