<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('leader_self_signup_tokens')) {
            return;
        }

        Schema::create('leader_self_signup_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('church_id')->constrained()->cascadeOnDelete();
            $table->uuid('token')->unique();
            $table->timestamps();

            $table->unique('church_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leader_self_signup_tokens');
    }
};
