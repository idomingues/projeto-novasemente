<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('saturday_programs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('church_id')->constrained('churches')->cascadeOnDelete();
            $table->date('saturday_date');
            $table->string('title')->nullable();
            $table->string('pdf_path');
            $table->timestamp('published_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['church_id', 'saturday_date']);
            $table->index(['church_id', 'is_active', 'saturday_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('saturday_programs');
    }
};
