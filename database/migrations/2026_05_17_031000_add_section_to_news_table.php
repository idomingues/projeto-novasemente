<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('news', function (Blueprint $table) {
            $table->string('section', 20)->default('news')->after('church_id');
            $table->index(['section', 'published_at']);
        });

        DB::table('news')->whereNull('section')->update(['section' => 'news']);
    }

    public function down(): void
    {
        Schema::table('news', function (Blueprint $table) {
            $table->dropIndex('news_section_published_at_index');
            $table->dropColumn('section');
        });
    }
};
