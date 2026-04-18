<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Repara estados incomuns em produção após falhas em
 * 2026_04_18_090000_add_volunteer_id_to_schedule_assignments (nome de FK diferente,
 * timeout, permissões, etc.). Idempotente: pode correr várias vezes.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('schedule_assignments')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();
        if (! in_array($driver, ['mysql', 'mariadb'], true)) {
            return;
        }

        $db = Schema::getConnection()->getDatabaseName();

        if (! Schema::hasColumn('schedule_assignments', 'volunteer_id')) {
            Schema::table('schedule_assignments', function (Blueprint $table) {
                $table->foreignId('volunteer_id')->nullable()->after('member_id')->constrained('volunteers')->nullOnDelete();
            });
        } else {
            $this->ensureForeignKey(
                $db,
                'schedule_assignments',
                'volunteer_id',
                'volunteers',
                'id',
            );
        }

        $memberNullable = $this->columnIsNullable($db, 'schedule_assignments', 'member_id');
        if (! $memberNullable) {
            $this->dropForeignKeysOnColumn($db, 'schedule_assignments', 'member_id');
            DB::statement('ALTER TABLE schedule_assignments MODIFY member_id BIGINT UNSIGNED NULL');
        }

        $this->ensureForeignKey($db, 'schedule_assignments', 'member_id', 'members', 'id', true);
    }

    public function down(): void
    {
        // Não reverter automaticamente: evita perda de dados em produção.
    }

    private function columnIsNullable(string $database, string $table, string $column): bool
    {
        $row = DB::selectOne(
            'SELECT IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
            [$database, $table, $column]
        );

        return $row && strtoupper((string) $row->IS_NULLABLE) === 'YES';
    }

    /**
     * @return list<string> constraint names
     */
    private function foreignKeyNamesOnColumn(string $database, string $table, string $column): array
    {
        $rows = DB::select(
            'SELECT DISTINCT CONSTRAINT_NAME AS name FROM information_schema.KEY_COLUMN_USAGE
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL',
            [$database, $table, $column]
        );

        return array_values(array_filter(array_map(fn ($r) => $r->name ?? null, $rows)));
    }

    private function dropForeignKeysOnColumn(string $database, string $table, string $column): void
    {
        foreach ($this->foreignKeyNamesOnColumn($database, $table, $column) as $name) {
            if ($name === '') {
                continue;
            }
            DB::statement('ALTER TABLE `'.$table.'` DROP FOREIGN KEY `'.$name.'`');
        }
    }

    private function foreignKeyExists(string $database, string $table, string $column, string $referencedTable): bool
    {
        $rows = DB::select(
            'SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ? AND REFERENCED_TABLE_NAME = ?',
            [$database, $table, $column, $referencedTable]
        );

        return count($rows) > 0;
    }

    private function ensureForeignKey(
        string $database,
        string $table,
        string $column,
        string $referencedTable,
        string $referencedColumn,
        bool $nullOnDelete = false,
    ): void {
        if ($this->foreignKeyExists($database, $table, $column, $referencedTable)) {
            return;
        }

        Schema::table($table, function (Blueprint $blueprint) use ($column, $referencedTable, $referencedColumn, $nullOnDelete) {
            $fk = $blueprint->foreign($column)->references($referencedColumn)->on($referencedTable);
            if ($nullOnDelete) {
                $fk->nullOnDelete();
            }
        });
    }
};
