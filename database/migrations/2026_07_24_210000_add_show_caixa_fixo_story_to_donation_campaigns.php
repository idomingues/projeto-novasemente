<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('donation_campaigns', function (Blueprint $table) {
            $table->boolean('show_caixa_fixo_story')->default(false)->after('allow_over_goal');
        });
    }

    public function down(): void
    {
        Schema::table('donation_campaigns', function (Blueprint $table) {
            $table->dropColumn('show_caixa_fixo_story');
        });
    }
};
