<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Normaliza identidade: dados que estavam em `members` passam para `users`;
 * referências `member_id` em outras tabelas passam a `user_id` onde aplicável;
 * remove a tabela `members`.
 *
 * Deve correr depois de `2026_04_20_120000_add_is_volunteer_to_members_table`.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('members')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'church_id')) {
                $table->foreignId('church_id')->nullable()->after('id')->constrained('churches')->nullOnDelete();
            }
            if (! Schema::hasColumn('users', 'photo_url')) {
                $table->string('photo_url')->nullable()->after('email');
            }
            if (! Schema::hasColumn('users', 'phone')) {
                $table->string('phone', 40)->nullable()->after('photo_url');
            }
            if (! Schema::hasColumn('users', 'birth_date')) {
                $table->date('birth_date')->nullable()->after('phone');
            }
            if (! Schema::hasColumn('users', 'address')) {
                $table->text('address')->nullable()->after('birth_date');
            }
            if (! Schema::hasColumn('users', 'status')) {
                $table->string('status', 20)->default('active')->after('address');
            }
            if (! Schema::hasColumn('users', 'is_volunteer')) {
                $table->boolean('is_volunteer')->default(false)->after('status');
            }
        });

        $this->copyMemberFieldsOntoLinkedUsers();
        $this->createUsersForOrphanMembers();
        $this->linkVolunteersToUsersByMemberId();

        $this->addUserIdToScheduleAssignments();
        $this->addUserIdToFinancialTransactions();
        $this->backfillSolicitationsAndSupportTicketsData();

        $this->dropForeignKeysPointingToMembers();

        Schema::disableForeignKeyConstraints();
        try {
            Schema::dropIfExists('members');
        } finally {
            Schema::enableForeignKeyConstraints();
        }

        $this->dropMemberIdColumnsAfterMembersTableGone();
        $this->ensureUserIdForeignKeys();
    }

    public function down(): void
    {
        // Irreversível: recriação manual de `members` se necessário.
    }

    private function sqlite(): bool
    {
        return Schema::getConnection()->getDriverName() === 'sqlite';
    }

    private function copyMemberFieldsOntoLinkedUsers(): void
    {
        foreach (DB::table('users')->whereNotNull('member_id')->cursor() as $u) {
            $m = DB::table('members')->where('id', $u->member_id)->first();
            if ($m === null) {
                continue;
            }
            DB::table('users')->where('id', $u->id)->update([
                'church_id' => $m->church_id ?? $u->church_id,
                'photo_url' => $m->photo_url ?? $u->photo_url,
                'phone' => $m->phone ?? $u->phone,
                'birth_date' => $m->birth_date ?? $u->birth_date,
                'address' => $m->address ?? $u->address,
                'status' => $m->status ?? $u->status ?? 'active',
                'is_volunteer' => (bool) ($m->is_volunteer ?? false),
            ]);
        }
    }

    private function createUsersForOrphanMembers(): void
    {
        $linked = DB::table('users')->whereNotNull('member_id')->pluck('member_id')->all();
        $orphans = DB::table('members')->whereNotIn('id', $linked ?: [0])->get();

        foreach ($orphans as $m) {
            $email = trim((string) ($m->email ?? ''));
            if ($email !== '') {
                $existing = DB::table('users')
                    ->whereRaw('LOWER(TRIM(COALESCE(email, ""))) = ?', [mb_strtolower($email)])
                    ->first();
                if ($existing !== null) {
                    DB::table('users')->where('id', $existing->id)->update([
                        'member_id' => $m->id,
                        'church_id' => $m->church_id ?? $existing->church_id,
                        'photo_url' => $m->photo_url ?? $existing->photo_url,
                        'phone' => $m->phone ?? $existing->phone,
                        'birth_date' => $m->birth_date ?? $existing->birth_date,
                        'address' => $m->address ?? $existing->address,
                        'status' => $m->status ?? $existing->status ?? 'active',
                        'is_volunteer' => (bool) ($m->is_volunteer ?? false),
                        'name' => $m->name ?? $existing->name,
                    ]);

                    continue;
                }
            } else {
                $email = 'legacy-member-'.$m->id.'@invalid.local';
            }

            DB::table('users')->insert([
                'name' => $m->name ?? 'Utilizador',
                'email' => $email,
                'password' => Hash::make(Str::random(40)),
                'member_id' => $m->id,
                'church_id' => $m->church_id,
                'photo_url' => $m->photo_url,
                'phone' => $m->phone,
                'birth_date' => $m->birth_date,
                'address' => $m->address,
                'status' => $m->status ?? 'active',
                'is_volunteer' => (bool) ($m->is_volunteer ?? false),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        foreach (DB::table('users')->whereNotNull('member_id')->cursor() as $u) {
            $m = DB::table('members')->where('id', $u->member_id)->first();
            if ($m === null) {
                continue;
            }
            DB::table('users')->where('id', $u->id)->update([
                'church_id' => $m->church_id ?? $u->church_id,
                'photo_url' => $m->photo_url ?? $u->photo_url,
                'phone' => $m->phone ?? $u->phone,
                'birth_date' => $m->birth_date ?? $u->birth_date,
                'address' => $m->address ?? $u->address,
                'status' => $m->status ?? $u->status ?? 'active',
                'is_volunteer' => (bool) ($m->is_volunteer ?? false),
            ]);
        }
    }

    private function linkVolunteersToUsersByMemberId(): void
    {
        foreach (DB::table('volunteers')->whereNotNull('member_id')->cursor() as $v) {
            $uid = DB::table('users')->where('member_id', $v->member_id)->value('id');
            if ($uid === null) {
                continue;
            }
            DB::table('volunteers')->where('id', $v->id)->update(['user_id' => $uid]);
        }
    }

    private function addUserIdToScheduleAssignments(): void
    {
        if (! Schema::hasTable('schedule_assignments')) {
            return;
        }

        if (! Schema::hasColumn('schedule_assignments', 'user_id')) {
            Schema::table('schedule_assignments', function (Blueprint $table) {
                $table->unsignedBigInteger('user_id')->nullable()->after('member_id');
            });
        }

        foreach (DB::table('schedule_assignments')->whereNotNull('member_id')->cursor() as $row) {
            $uid = DB::table('users')->where('member_id', $row->member_id)->value('id');
            if ($uid !== null) {
                DB::table('schedule_assignments')->where('id', $row->id)->update(['user_id' => $uid]);
            }
        }
    }

    private function addUserIdToFinancialTransactions(): void
    {
        if (! Schema::hasTable('financial_transactions')) {
            return;
        }

        if (! Schema::hasColumn('financial_transactions', 'user_id')) {
            Schema::table('financial_transactions', function (Blueprint $table) {
                $table->unsignedBigInteger('user_id')->nullable()->after('id');
            });
        }

        foreach (DB::table('financial_transactions')->whereNotNull('member_id')->cursor() as $row) {
            $uid = DB::table('users')->where('member_id', $row->member_id)->value('id');
            if ($uid !== null) {
                DB::table('financial_transactions')->where('id', $row->id)->update(['user_id' => $uid]);
            }
        }
    }

    private function backfillSolicitationsAndSupportTicketsData(): void
    {
        if (Schema::hasTable('church_solicitations') && Schema::hasColumn('church_solicitations', 'member_id')) {
            foreach (DB::table('church_solicitations')->whereNotNull('member_id')->cursor() as $row) {
                $uid = DB::table('users')->where('member_id', $row->member_id)->value('id');
                if ($uid !== null && (int) $row->user_id !== (int) $uid) {
                    DB::table('church_solicitations')->where('id', $row->id)->update(['user_id' => $uid]);
                }
            }
        }

        if (Schema::hasTable('app_support_tickets') && Schema::hasColumn('app_support_tickets', 'member_id')) {
            foreach (DB::table('app_support_tickets')->whereNotNull('member_id')->whereNull('user_id')->cursor() as $row) {
                $uid = DB::table('users')->where('member_id', $row->member_id)->value('id');
                if ($uid !== null) {
                    DB::table('app_support_tickets')->where('id', $row->id)->update(['user_id' => $uid]);
                }
            }
        }
    }

    private function dropForeignKeysPointingToMembers(): void
    {
        $tables = [
            'users' => 'member_id',
            'volunteers' => 'member_id',
            'schedule_assignments' => 'member_id',
            'financial_transactions' => 'member_id',
            'church_solicitations' => 'member_id',
            'app_support_tickets' => 'member_id',
        ];

        foreach ($tables as $table => $column) {
            if (! Schema::hasTable($table) || ! Schema::hasColumn($table, $column)) {
                continue;
            }
            $this->dropForeignIfExists($table, $column);
        }
    }

    private function dropMemberIdColumnsAfterMembersTableGone(): void
    {
        $drops = [
            'volunteers',
            'users',
            'schedule_assignments',
            'financial_transactions',
            'church_solicitations',
            'app_support_tickets',
        ];

        foreach ($drops as $table) {
            if (! Schema::hasTable($table) || ! Schema::hasColumn($table, 'member_id')) {
                continue;
            }

            if ($this->sqlite() && in_array($table, ['schedule_assignments', 'financial_transactions'], true)) {
                continue;
            }

            Schema::disableForeignKeyConstraints();
            try {
                Schema::table($table, function (Blueprint $t) {
                    $t->dropColumn('member_id');
                });
            } catch (\Throwable) {
                if (! $this->sqlite()) {
                    throw new \RuntimeException('Não foi possível remover member_id de '.$table);
                }
            } finally {
                Schema::enableForeignKeyConstraints();
            }
        }
    }

    private function ensureUserIdForeignKeys(): void
    {
        if (! Schema::hasTable('schedule_assignments') || ! Schema::hasColumn('schedule_assignments', 'user_id')) {
            return;
        }

        try {
            Schema::table('schedule_assignments', function (Blueprint $table) {
                $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
            });
        } catch (\Throwable) {
            //
        }

        if (! Schema::hasTable('financial_transactions') || ! Schema::hasColumn('financial_transactions', 'user_id')) {
            return;
        }

        try {
            Schema::table('financial_transactions', function (Blueprint $table) {
                $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
            });
        } catch (\Throwable) {
            //
        }
    }

    private function dropForeignIfExists(string $table, string $column): void
    {
        try {
            Schema::table($table, function (Blueprint $t) use ($column) {
                $t->dropForeign([$column]);
            });
        } catch (\Throwable) {
            //
        }
    }
};
