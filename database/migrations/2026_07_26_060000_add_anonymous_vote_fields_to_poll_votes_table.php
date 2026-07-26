<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // O UNIQUE (poll_option_id, user_id) também indexa a FK de poll_option_id.
        // Precisa dropar essa FK antes de remover o índice único.
        $this->dropForeignIfExists('poll_votes', 'poll_votes_poll_option_id_foreign');
        $this->dropForeignIfExists('poll_votes', 'poll_votes_user_id_foreign');

        Schema::table('poll_votes', function (Blueprint $table) {
            $table->dropUnique(['poll_option_id', 'user_id']);
        });

        Schema::table('poll_votes', function (Blueprint $table) {
            $table->index('poll_option_id');
            $table->unsignedBigInteger('user_id')->nullable()->change();
            $table->string('voter_ip', 45)->nullable()->after('user_id');
            $table->string('voter_key', 80)->nullable()->after('voter_ip');
        });

        Schema::table('poll_votes', function (Blueprint $table) {
            $table->foreign('poll_option_id')->references('id')->on('poll_options')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
        });

        DB::table('poll_votes')
            ->whereNotNull('user_id')
            ->whereNull('voter_key')
            ->orderBy('id')
            ->chunkById(200, function ($rows) {
                foreach ($rows as $row) {
                    DB::table('poll_votes')->where('id', $row->id)->update([
                        'voter_key' => 'u:'.$row->user_id,
                    ]);
                }
            });

        $dupes = DB::table('poll_votes')
            ->select('poll_id', 'voter_key', DB::raw('MIN(id) as keep_id'))
            ->whereNotNull('voter_key')
            ->groupBy('poll_id', 'voter_key')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        foreach ($dupes as $dupe) {
            DB::table('poll_votes')
                ->where('poll_id', $dupe->poll_id)
                ->where('voter_key', $dupe->voter_key)
                ->where('id', '!=', $dupe->keep_id)
                ->delete();
        }

        DB::table('poll_votes')
            ->whereNull('voter_key')
            ->orderBy('id')
            ->chunkById(200, function ($rows) {
                foreach ($rows as $row) {
                    DB::table('poll_votes')->where('id', $row->id)->update([
                        'voter_key' => 'legacy:'.$row->id,
                    ]);
                }
            });

        Schema::table('poll_votes', function (Blueprint $table) {
            $table->string('voter_key', 80)->nullable(false)->change();
            $table->unique(['poll_id', 'voter_key']);
            $table->index(['poll_id', 'voter_ip']);
        });
    }

    public function down(): void
    {
        Schema::table('poll_votes', function (Blueprint $table) {
            $table->dropUnique(['poll_id', 'voter_key']);
            $table->dropIndex(['poll_id', 'voter_ip']);
            $table->dropColumn(['voter_ip', 'voter_key']);
        });

        $this->dropForeignIfExists('poll_votes', 'poll_votes_user_id_foreign');
        $this->dropForeignIfExists('poll_votes', 'poll_votes_poll_option_id_foreign');

        DB::table('poll_votes')->whereNull('user_id')->delete();

        Schema::table('poll_votes', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable(false)->change();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('poll_option_id')->references('id')->on('poll_options')->cascadeOnDelete();
            $table->unique(['poll_option_id', 'user_id']);
        });
    }

    private function dropForeignIfExists(string $table, string $constraint): void
    {
        if (! Schema::hasTable($table)) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'sqlite') {
            // SQLite recreates tables on dropForeign; ignore missing constraints.
            try {
                Schema::table($table, function (Blueprint $blueprint) use ($constraint) {
                    $blueprint->dropForeign($constraint);
                });
            } catch (\Throwable) {
                //
            }

            return;
        }

        if ($driver === 'mysql') {
            $dbName = DB::getDatabaseName();
            $exists = DB::table('information_schema.TABLE_CONSTRAINTS')
                ->where('CONSTRAINT_SCHEMA', $dbName)
                ->where('TABLE_NAME', $table)
                ->where('CONSTRAINT_NAME', $constraint)
                ->where('CONSTRAINT_TYPE', 'FOREIGN KEY')
                ->exists();

            if (! $exists) {
                return;
            }

            DB::statement("ALTER TABLE `{$table}` DROP FOREIGN KEY `{$constraint}`");

            return;
        }

        try {
            Schema::table($table, function (Blueprint $blueprint) use ($constraint) {
                $blueprint->dropForeign($constraint);
            });
        } catch (\Throwable) {
            //
        }
    }
};
