<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('poll_options')) {
            return;
        }

        if (! Schema::hasColumn('poll_options', 'created_via_write_in')) {
            Schema::table('poll_options', function (Blueprint $table) {
                $table->boolean('created_via_write_in')->default(false)->after('is_write_in');
            });
        }

        // Remove opções inválidas de digitação curta (ex.: «E») e votos associados.
        $invalidIds = DB::table('poll_options')
            ->where('is_write_in', false)
            ->get(['id', 'label'])
            ->filter(fn ($row) => mb_strlen(trim((string) $row->label)) < 2)
            ->pluck('id')
            ->values();

        if ($invalidIds->isNotEmpty()) {
            if (Schema::hasTable('poll_votes')) {
                DB::table('poll_votes')->whereIn('poll_option_id', $invalidIds)->delete();
            }
            DB::table('poll_options')->whereIn('id', $invalidIds)->delete();
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('poll_options') && Schema::hasColumn('poll_options', 'created_via_write_in')) {
            Schema::table('poll_options', function (Blueprint $table) {
                $table->dropColumn('created_via_write_in');
            });
        }
    }
};
