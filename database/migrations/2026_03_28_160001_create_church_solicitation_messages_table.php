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
            $table->foreignId('sender_user_id')->nullable()->constrained('users')->nullOnDelete();

            $table->text('content');
            $table->timestamps();

            $table->index(['church_solicitation_id', 'created_at'], 'sol_msg_sol_id_created_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('church_solicitation_messages');
    }
};
