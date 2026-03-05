<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('schedule_checkin_dates');
        Schema::create('schedule_checkin_dates', function (Blueprint $table) {
            $table->id();
            $table->date('schedule_date')->unique();
            $table->foreignId('enabled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('enabled_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('schedule_checkin_dates');
    }
};
