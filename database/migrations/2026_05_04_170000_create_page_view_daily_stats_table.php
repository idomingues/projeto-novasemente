<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('page_view_daily_stats', function (Blueprint $table) {
            $table->id();
            /** 0 = sem igreja resolvida (visitantes / edge cases). */
            $table->unsignedBigInteger('church_id')->default(0);
            $table->string('route_name', 191);
            $table->date('visited_on');
            $table->unsignedBigInteger('views')->default(0);
            $table->timestamps();

            $table->unique(['church_id', 'route_name', 'visited_on'], 'page_view_daily_unique');
            $table->index(['church_id', 'visited_on'], 'page_view_daily_church_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('page_view_daily_stats');
    }
};
