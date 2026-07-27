<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('poll_options', function (Blueprint $table) {
            $table->boolean('is_write_in')->default(false)->after('sort_order');
        });
    }

    public function down(): void
    {
        Schema::table('poll_options', function (Blueprint $table) {
            $table->dropColumn('is_write_in');
        });
    }
};
