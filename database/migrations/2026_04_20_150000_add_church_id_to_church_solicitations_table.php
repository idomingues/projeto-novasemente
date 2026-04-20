<?php

use App\Models\Church;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('church_solicitations')) {
            return;
        }

        if (! Schema::hasColumn('church_solicitations', 'church_id')) {
            Schema::table('church_solicitations', function (Blueprint $table) {
                $table->foreignId('church_id')->nullable()->after('id')->constrained('churches')->nullOnDelete();
                $table->index(['church_id', 'updated_at']);
            });
        }

        $firstChurchId = (int) (Church::query()->orderByDesc('active')->orderBy('name')->value('id') ?? 0);

        // Backfill church_id from users.church_id (portable across DBs).
        DB::table('church_solicitations')
            ->select(['id', 'user_id'])
            ->whereNull('church_id')
            ->orderBy('id')
            ->chunkById(500, function ($rows) use ($firstChurchId) {
                foreach ($rows as $row) {
                    $uid = isset($row->user_id) ? (int) $row->user_id : 0;
                    $cid = (int) (User::query()->whereKey($uid)->value('church_id') ?? 0);
                    if (! $cid && $firstChurchId) {
                        $cid = $firstChurchId;
                    }
                    if ($cid) {
                        DB::table('church_solicitations')->where('id', (int) $row->id)->update(['church_id' => $cid]);
                    }
                }
            });
    }

    public function down(): void
    {
        if (! Schema::hasTable('church_solicitations') || ! Schema::hasColumn('church_solicitations', 'church_id')) {
            return;
        }

        Schema::table('church_solicitations', function (Blueprint $table) {
            try {
                $table->dropIndex(['church_id', 'updated_at']);
            } catch (\Throwable) {
                // ignore
            }
            $table->dropConstrainedForeignId('church_id');
        });
    }
};

