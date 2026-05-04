<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Uma linha = «este utilizador acedeu a esta rota (funcionalidade) neste dia nesta igreja», no máximo uma vez por dia.
     * Não substitui page_view_daily_stats (volume); serve para saber que a pessoa «entrou» no item.
     */
    public function up(): void
    {
        Schema::create('user_feature_daily_reach', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('church_id')->default(0);
            $table->string('route_name', 191);
            $table->date('visited_on');
            $table->timestamps();

            $table->unique(['user_id', 'church_id', 'route_name', 'visited_on'], 'user_feature_daily_reach_unique');
            $table->index(['church_id', 'visited_on'], 'user_feature_daily_reach_church_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_feature_daily_reach');
    }
};
