<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_dismissed_app_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('app_notification_id')->constrained('app_notifications')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'app_notification_id'], 'user_app_notif_dismissed_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_dismissed_app_notifications');
    }
};
