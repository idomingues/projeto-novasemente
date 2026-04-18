<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pastoral_availabilities', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('church_id');
            $table->unsignedBigInteger('pastor_id');
            $table->date('date');
            $table->string('start', 5); // H:i
            $table->string('end', 5);   // H:i
            $table->string('modality', 16)->default('both');
            $table->timestamps();

            $table->index(['pastor_id', 'date']);
            $table->unique(['pastor_id', 'date', 'start', 'end', 'modality'], 'pastoral_availabilities_unique_slot');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pastoral_availabilities');
    }
};
