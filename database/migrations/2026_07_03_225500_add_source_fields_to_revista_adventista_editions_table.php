<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('revista_adventista_editions', function (Blueprint $table) {
            $table->string('source', 16)->default('cpb')->after('id');
            $table->string('source_edition_id')->nullable()->after('source');
            $table->unsignedBigInteger('cpb_edition_id')->nullable()->change();
        });

        DB::table('revista_adventista_editions')
            ->whereNull('source_edition_id')
            ->update([
                'source' => 'cpb',
                'source_edition_id' => DB::raw('CAST(cpb_edition_id AS CHAR)'),
            ]);

        Schema::table('revista_adventista_editions', function (Blueprint $table) {
            $table->string('source_edition_id')->nullable(false)->change();
            $table->unique(
                ['source', 'source_edition_id'],
                'revista_adventista_editions_source_source_edition_unique'
            );
        });
    }

    public function down(): void
    {
        DB::table('revista_adventista_editions')
            ->where('source', 'aces')
            ->delete();

        DB::table('revista_adventista_editions')
            ->where('source', 'cpb')
            ->whereNull('cpb_edition_id')
            ->orderBy('id')
            ->get(['id', 'source_edition_id'])
            ->each(function (object $edition): void {
                DB::table('revista_adventista_editions')
                    ->where('id', $edition->id)
                    ->update([
                        'cpb_edition_id' => (int) $edition->source_edition_id,
                    ]);
            });

        Schema::table('revista_adventista_editions', function (Blueprint $table) {
            $table->dropUnique('revista_adventista_editions_source_source_edition_unique');
            $table->unsignedBigInteger('cpb_edition_id')->nullable(false)->change();
            $table->dropColumn(['source', 'source_edition_id']);
        });
    }
};
