<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() === 'sqlite') {
            // SQLite não suporta `ALTER TABLE ... MODIFY ...`.
            // Para manter a suite de testes funcional, recriamos a tabela com o esquema esperado.
            Schema::rename('volunteers', 'volunteers__old');

            Schema::create('volunteers', function (Blueprint $table) {
                $table->id();
                $table->foreignId('member_id')->nullable()->constrained()->cascadeOnDelete();
                $table->string('name')->nullable()->after('member_id');
                $table->string('email')->nullable()->after('name');
                $table->string('phone')->nullable()->after('email');
                $table->foreignId('ministry_id')->constrained()->cascadeOnDelete();
                $table->string('role')->nullable();
                $table->boolean('active')->default(true);
                $table->timestamps();
            });

            DB::table('volunteers')->insertUsing(
                ['id', 'member_id', 'ministry_id', 'role', 'active', 'created_at', 'updated_at'],
                DB::table('volunteers__old')->select([
                    'id',
                    'member_id',
                    'ministry_id',
                    'role',
                    'active',
                    'created_at',
                    'updated_at',
                ])
            );

            Schema::drop('volunteers__old');

            return;
        }

        Schema::table('volunteers', function (Blueprint $table) {
            $table->dropForeign(['member_id']);
        });
        DB::statement('ALTER TABLE volunteers MODIFY member_id BIGINT UNSIGNED NULL');
        Schema::table('volunteers', function (Blueprint $table) {
            $table->string('name')->nullable()->after('member_id');
            $table->string('email')->nullable()->after('name');
            $table->string('phone')->nullable()->after('email');
            $table->foreign('member_id')->references('id')->on('members')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'sqlite') {
            Schema::rename('volunteers', 'volunteers__old');

            Schema::create('volunteers', function (Blueprint $table) {
                $table->id();
                $table->foreignId('member_id')->constrained()->cascadeOnDelete();
                $table->foreignId('ministry_id')->constrained()->cascadeOnDelete();
                $table->string('role')->nullable();
                $table->boolean('active')->default(true);
                $table->timestamps();
            });

            DB::table('volunteers')->insertUsing(
                ['id', 'member_id', 'ministry_id', 'role', 'active', 'created_at', 'updated_at'],
                DB::table('volunteers__old')->select([
                    'id',
                    'member_id',
                    'ministry_id',
                    'role',
                    'active',
                    'created_at',
                    'updated_at',
                ])
            );

            Schema::drop('volunteers__old');

            return;
        }

        Schema::table('volunteers', function (Blueprint $table) {
            $table->dropForeign(['member_id']);
        });
        DB::statement('ALTER TABLE volunteers MODIFY member_id BIGINT UNSIGNED NOT NULL');
        Schema::table('volunteers', function (Blueprint $table) {
            $table->dropColumn(['name', 'email', 'phone']);
            $table->foreign('member_id')->references('id')->on('members')->cascadeOnDelete();
        });
    }
};
