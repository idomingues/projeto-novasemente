<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('versiculos_caixinha', function (Blueprint $table) {
            $table->id();
            $table->string('livro', 50);
            $table->unsignedSmallInteger('capitulo');
            $table->unsignedSmallInteger('versiculo_inicio');
            $table->unsignedSmallInteger('versiculo_fim');
            $table->string('categoria', 50);
            $table->unsignedTinyInteger('nota');
            $table->unsignedTinyInteger('peso')->default(1);
            $table->boolean('ativo')->default(true);
            $table->timestamps();

            $table->index(['ativo', 'peso']);
            $table->index(['livro', 'capitulo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('versiculos_caixinha');
    }
};

