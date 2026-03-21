<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('app_support_tickets', function (Blueprint $table) {
            $table->id();

            $table->string('public_token', 64)->unique();

            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('member_id')->nullable()->constrained('members')->nullOnDelete();

            $table->string('type', 30); // problem | suggestion | praise
            $table->text('message');

            $table->string('guest_name')->nullable();
            $table->string('guest_email')->nullable();
            $table->string('guest_phone')->nullable();

            $table->string('status', 20)->default('open'); // open | closed
            $table->text('solution_text')->nullable();
            $table->timestamp('closed_at')->nullable();

            $table->timestamps();

            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('app_support_tickets');
    }
};
