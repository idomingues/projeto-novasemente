<?php

use App\Models\Church;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private function defaultChurchId(): ?int
    {
        if (! Schema::hasTable('churches')) {
            return null;
        }

        $cid = Church::query()->where('slug', 'nova-semente')->value('id');
        if ($cid) {
            return (int) $cid;
        }

        if (Schema::hasColumn('churches', 'active')) {
            $cid = Church::query()->where('active', true)->orderBy('name')->value('id');
            if ($cid) {
                return (int) $cid;
            }
        }

        $cid = Church::query()->orderBy('id')->value('id');

        return $cid ? (int) $cid : null;
    }

    public function up(): void
    {
        $cid = $this->defaultChurchId();
        if (! $cid) {
            return;
        }

        // Tabelas que podem ter sido criadas antes do cadastro de igreja.
        $tables = [
            'users',
            'ministries',
            'rooms',
            'inventory_items',
            'cultos',
            'musicas',
            'news',
            'events',
            'pastors',
            'pastoral_appointments',
            'pastoral_availabilities',
            'prayer_requests',
            'app_notifications',
            'room_bookings',
            'inventory_sessions',
            'volunteer_church_pipelines',
            'volunteer_pipeline_stages',
            'volunteer_leader_notes',
            'volunteer_self_signup_tokens',
            'church_solicitations',
        ];

        foreach ($tables as $table) {
            if (! Schema::hasTable($table) || ! Schema::hasColumn($table, 'church_id')) {
                continue;
            }

            try {
                DB::table($table)->whereNull('church_id')->update(['church_id' => $cid]);
            } catch (\Throwable) {
                // Ignora tabelas em estados intermediários/DBs diferentes.
            }
        }
    }

    public function down(): void
    {
        // Backfill não é reversível de forma segura.
    }
};

