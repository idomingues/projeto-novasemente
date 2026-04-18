<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pastoral_appointments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('church_id')->constrained()->cascadeOnDelete();
            $table->foreignId('requester_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('requester_member_id')->nullable()->constrained('members')->nullOnDelete();
            $table->foreignId('preferred_pastor_id')->nullable()->constrained('pastors')->nullOnDelete();
            $table->foreignId('created_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('source', 30); // member_request | pastor_created | secretary_created
            $table->string('status', 20)->default('pending'); // pending | confirmed | cancelled | completed
            $table->string('subject')->nullable();
            $table->text('notes')->nullable();
            $table->dateTime('preferred_start')->nullable();
            $table->dateTime('starts_at')->nullable();
            $table->dateTime('ends_at')->nullable();
            $table->timestamps();

            $table->index(['church_id', 'status', 'created_at']);
            $table->index(['church_id', 'starts_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pastoral_appointments');
    }
};
