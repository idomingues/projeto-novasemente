<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('church_solicitation_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('church_solicitation_id')->constrained('church_solicitations')->cascadeOnDelete();
            $table->string('sender_type', 20);
            $table->foreignId('sender_user_id')->constrained('users')->cascadeOnDelete();
            $table->text('content');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('church_solicitation_messages');
    }
};

