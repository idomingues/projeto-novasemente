<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('polls') && ! Schema::hasColumn('polls', 'response_type')) {
            Schema::table('polls', function (Blueprint $table) {
                $table->string('response_type', 20)->default('choice')->after('allow_multiple');
            });
        }

        if (! Schema::hasTable('poll_votes')) {
            return;
        }

        if (! Schema::hasColumn('poll_votes', 'answer_text')) {
            Schema::table('poll_votes', function (Blueprint $table) {
                $table->string('answer_text', 200)->nullable()->after('poll_option_id');
            });
        }

        $driver = Schema::getConnection()->getDriverName();

        // Texto livre não usa opção: FK precisa permitir NULL.
        if ($driver === 'mysql') {
            $dbName = DB::getDatabaseName();
            $exists = DB::table('information_schema.TABLE_CONSTRAINTS')
                ->where('CONSTRAINT_SCHEMA', $dbName)
                ->where('TABLE_NAME', 'poll_votes')
                ->where('CONSTRAINT_NAME', 'poll_votes_poll_option_id_foreign')
                ->where('CONSTRAINT_TYPE', 'FOREIGN KEY')
                ->exists();
            if ($exists) {
                DB::statement('ALTER TABLE `poll_votes` DROP FOREIGN KEY `poll_votes_poll_option_id_foreign`');
            }
            DB::statement('ALTER TABLE `poll_votes` MODIFY `poll_option_id` BIGINT UNSIGNED NULL');
            DB::statement('ALTER TABLE `poll_votes` ADD CONSTRAINT `poll_votes_poll_option_id_foreign` FOREIGN KEY (`poll_option_id`) REFERENCES `poll_options` (`id`) ON DELETE CASCADE');
        } elseif ($driver === 'sqlite') {
            // SQLite: change() / dropForeign já recria a tabela no Laravel.
            try {
                Schema::table('poll_votes', function (Blueprint $table) {
                    $table->dropForeign(['poll_option_id']);
                });
            } catch (\Throwable) {
                //
            }
            Schema::table('poll_votes', function (Blueprint $table) {
                $table->unsignedBigInteger('poll_option_id')->nullable()->change();
            });
            try {
                Schema::table('poll_votes', function (Blueprint $table) {
                    $table->foreign('poll_option_id')->references('id')->on('poll_options')->cascadeOnDelete();
                });
            } catch (\Throwable) {
                //
            }
        } else {
            Schema::table('poll_votes', function (Blueprint $table) {
                $table->dropForeign(['poll_option_id']);
            });
            Schema::table('poll_votes', function (Blueprint $table) {
                $table->unsignedBigInteger('poll_option_id')->nullable()->change();
                $table->foreign('poll_option_id')->references('id')->on('poll_options')->cascadeOnDelete();
            });
        }

        // Garante a enquete de sugestão do app (texto livre, sem resultado).
        if (Schema::hasTable('polls') && Schema::hasColumn('polls', 'response_type')) {
            $churchId = DB::table('churches')->where('slug', 'nova-semente')->value('id')
                ?? DB::table('churches')->orderBy('id')->value('id');
            if ($churchId) {
                $question = 'O que você gostaria de encontrar em nosso App?';
                $exists = DB::table('polls')
                    ->where('church_id', $churchId)
                    ->where('question', $question)
                    ->exists();
                if (! $exists) {
                    $creatorId = DB::table('users')->where('church_id', $churchId)->orderBy('id')->value('id');
                    $token = bin2hex(random_bytes(20));
                    DB::table('polls')->insert([
                        'church_id' => $churchId,
                        'created_by' => $creatorId,
                        'question' => $question,
                        'allow_multiple' => false,
                        'response_type' => 'text',
                        'status' => 'open',
                        'public_token' => $token,
                        'display_bg_color' => '#0f172a',
                        'display_font' => 'sans',
                        'display_chart' => 'bar',
                        'display_logo' => 'horizontal-color',
                        'display_enabled' => false,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                } else {
                    DB::table('polls')
                        ->where('church_id', $churchId)
                        ->where('question', $question)
                        ->update([
                            'response_type' => 'text',
                            'display_enabled' => false,
                            'status' => 'open',
                            'updated_at' => now(),
                        ]);
                }
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('poll_votes') && Schema::hasColumn('poll_votes', 'answer_text')) {
            DB::table('poll_votes')->whereNull('poll_option_id')->delete();

            Schema::table('poll_votes', function (Blueprint $table) {
                $table->dropColumn('answer_text');
            });
        }

        if (Schema::hasTable('polls') && Schema::hasColumn('polls', 'response_type')) {
            Schema::table('polls', function (Blueprint $table) {
                $table->dropColumn('response_type');
            });
        }
    }
};
