<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $tables = [
            'members',
            'ministries',
            'inventory_items',
            'rooms',
        ];

        foreach ($tables as $tableName) {
            if (!Schema::hasTable($tableName) || Schema::hasColumn($tableName, 'church_id')) {
                continue;
            }
            Schema::table($tableName, function (Blueprint $t) {
                $t->foreignId('church_id')->nullable()->after('id')->constrained('churches')->nullOnDelete();
            });
        }

        $firstChurchId = DB::table('churches')->value('id');
        if ($firstChurchId) {
            foreach ($tables as $tableName) {
                if (Schema::hasTable($tableName) && Schema::hasColumn($tableName, 'church_id')) {
                    DB::table($tableName)->whereNull('church_id')->update(['church_id' => $firstChurchId]);
                }
            }
        }
    }

    public function down(): void
    {
        foreach (['members', 'ministries', 'inventory_items', 'rooms'] as $table) {
            if (!Schema::hasTable($table) || !Schema::hasColumn($table, 'church_id')) {
                continue;
            }
            Schema::table($table, function (Blueprint $t) {
                $t->dropForeign(['church_id']);
            });
        }
    }
};
