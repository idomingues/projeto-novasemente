<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('auth_login_events', function (Blueprint $table) {
            $table->id();
            $table->string('outcome', 24)->index();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('identifier_hash', 64)->nullable()->index();
            $table->string('ip_address', 45)->nullable()->index();
            $table->text('user_agent')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('auth_login_events');
    }
};
