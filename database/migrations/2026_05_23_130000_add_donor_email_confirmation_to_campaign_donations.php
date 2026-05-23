<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('campaign_donations', function (Blueprint $table) {
            $table->boolean('donor_email_confirmation_requested')->default(false)->after('is_anonymous');
        });
    }

    public function down(): void
    {
        Schema::table('campaign_donations', function (Blueprint $table) {
            $table->dropColumn('donor_email_confirmation_requested');
        });
    }
};
