<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('app_support_messages', function (Blueprint $table) {
            $table->id();

            $table->foreignId('ticket_id')->constrained('app_support_tickets')->cascadeOnDelete();

            // admin | user
            $table->string('sender_type', 20);
            $table->foreignId('sender_user_id')->nullable()->constrained('users')->nullOnDelete();

            $table->text('content');
            $table->timestamps();

            $table->index(['ticket_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('app_support_messages');
    }
};
