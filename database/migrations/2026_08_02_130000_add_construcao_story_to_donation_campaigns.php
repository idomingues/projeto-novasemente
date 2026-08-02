<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('donation_campaigns', function (Blueprint $table) {
            $table->boolean('show_construcao_story')->default(false)->after('caixa_fixo_story');
            $table->json('construcao_story')->nullable()->after('show_construcao_story');
        });
    }

    public function down(): void
    {
        Schema::table('donation_campaigns', function (Blueprint $table) {
            $table->dropColumn(['show_construcao_story', 'construcao_story']);
        });
    }
};
