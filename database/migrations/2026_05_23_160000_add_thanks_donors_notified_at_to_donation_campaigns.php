<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('donation_campaigns', function (Blueprint $table) {
            $table->timestamp('thanks_donors_notified_at')->nullable()->after('thanks_published_at');
        });
    }

    public function down(): void
    {
        Schema::table('donation_campaigns', function (Blueprint $table) {
            $table->dropColumn('thanks_donors_notified_at');
        });
    }
};
