<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('library_books', function (Blueprint $table) {
            $table->id();
            $table->foreignId('church_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('subtitle', 500)->nullable();
            $table->string('category', 32)->default('books');
            $table->string('cover_path', 512)->nullable();
            $table->string('pdf_path', 512);
            $table->timestamp('published_at')->nullable();
            $table->unsignedInteger('order')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('library_books');
    }
};
