<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('volunteer_ministry_invitations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('church_id')->constrained()->cascadeOnDelete();
            $table->foreignId('volunteer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ministry_id')->constrained()->cascadeOnDelete();
            $table->foreignId('invited_by_user_id')->nullable()->constrained('users')->nullOnDelete();

            $table->string('token', 64)->unique();
            $table->string('status', 24)->default('pending'); // pending|accepted|declined

            $table->string('channel', 24)->nullable(); // email|inbox|manual (registrado por último)
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('declined_at')->nullable();
            $table->text('decline_reason')->nullable();
            $table->timestamp('expires_at')->nullable();

            $table->timestamps();

            $table->index(['church_id', 'volunteer_id', 'status']);
            $table->index(['church_id', 'ministry_id', 'status']);
        });

        Schema::create('volunteer_ministry_invitation_slots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invitation_id')
                ->constrained('volunteer_ministry_invitations')
                ->cascadeOnDelete();
            $table->unsignedTinyInteger('day_of_week'); // 0=Dom ... 6=Sab
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->timestamps();

            $table->index(['invitation_id', 'day_of_week']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('volunteer_ministry_invitation_slots');
        Schema::dropIfExists('volunteer_ministry_invitations');
    }
};

