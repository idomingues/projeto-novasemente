<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('volunteers', function (Blueprint $table) {
            $table->text('ministry_involvement')->nullable()->change();
            $table->text('other_ministry_interest')->nullable()->change();
            $table->text('gifts_to_develop')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('volunteers', function (Blueprint $table) {
            $table->string('ministry_involvement')->nullable()->change();
            $table->string('other_ministry_interest')->nullable()->change();
            $table->string('gifts_to_develop')->nullable()->change();
        });
    }
};
