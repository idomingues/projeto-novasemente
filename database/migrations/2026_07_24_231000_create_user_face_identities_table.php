<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_face_identities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('church_id')->nullable()->constrained()->nullOnDelete();
            $table->string('reference_photo_path');
            $table->json('embedding');
            $table->unsignedSmallInteger('embedding_dim');
            $table->string('model_version', 64);
            $table->timestamp('liveness_passed_at')->nullable();
            $table->timestamps();

            $table->unique('user_id');
            $table->index('church_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_face_identities');
    }
};
