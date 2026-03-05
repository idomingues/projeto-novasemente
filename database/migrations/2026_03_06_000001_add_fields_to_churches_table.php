<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('churches', function (Blueprint $table) {
            $table->string('name')->default('Nova Semente');
            $table->string('slug')->unique()->default('nova-semente');
            $table->string('logo_url')->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->string('country')->nullable();
            $table->text('description')->nullable();
            $table->boolean('active')->default(true);
        });
    }

    public function down(): void
    {
        Schema::table('churches', function (Blueprint $table) {
            $table->dropColumn([
                'name',
                'slug',
                'logo_url',
                'city',
                'state',
                'country',
                'description',
                'active',
            ]);
        });
    }
};

