<?php

use App\Support\StorageUrl;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('mission_events')) {
            return;
        }

        if (! Schema::hasColumn('mission_events', 'all_day')) {
            Schema::table('mission_events', function (Blueprint $table) {
                $table->boolean('all_day')->default(false)->after('ends_at');
                $table->text('price')->nullable()->after('location');
                $table->string('purchase_url', 2048)->nullable()->after('price');
                $table->string('video_type', 20)->nullable()->after('purchase_url');
                $table->string('video_url', 500)->nullable()->after('video_type');
                $table->string('image_url', 1024)->nullable()->after('video_url');
                $table->string('color', 50)->nullable()->after('image_url');
            });
        }

        if (Schema::hasColumn('mission_events', 'image_path')) {
            DB::table('mission_events')
                ->whereNotNull('image_path')
                ->orderBy('id')
                ->each(function (object $row): void {
                    DB::table('mission_events')
                        ->where('id', $row->id)
                        ->update([
                            'image_url' => StorageUrl::publicMediaUrl((string) $row->image_path),
                        ]);
                });
        }

        $this->dropLegacyMissionEventIndex();

        if (Schema::hasColumn('mission_events', 'image_path')) {
            Schema::table('mission_events', function (Blueprint $table) {
                $table->dropColumn('image_path');
            });
        }

        if (Schema::hasColumn('mission_events', 'published_at')) {
            Schema::table('mission_events', function (Blueprint $table) {
                $table->dropColumn('published_at');
            });
        }

        $this->ensureChurchStartsAtIndex();
    }

    public function down(): void
    {
        if (! Schema::hasTable('mission_events')) {
            return;
        }

        if ($this->hasIndex('mission_events_church_id_starts_at_index')) {
            Schema::table('mission_events', function (Blueprint $table) {
                $table->dropIndex('mission_events_church_id_starts_at_index');
            });
        }

        if (! Schema::hasColumn('mission_events', 'image_path')) {
            Schema::table('mission_events', function (Blueprint $table) {
                $table->string('image_path')->nullable()->after('location');
            });
        }

        if (! Schema::hasColumn('mission_events', 'published_at')) {
            Schema::table('mission_events', function (Blueprint $table) {
                $table->timestamp('published_at')->nullable()->after('image_path');
            });
        }

        Schema::table('mission_events', function (Blueprint $table) {
            foreach (['all_day', 'price', 'purchase_url', 'video_type', 'video_url', 'image_url', 'color'] as $column) {
                if (Schema::hasColumn('mission_events', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        if (! $this->hasIndex('mission_events_church_id_published_at_starts_at_index')) {
            Schema::table('mission_events', function (Blueprint $table) {
                $table->index(['church_id', 'published_at', 'starts_at'], 'mission_events_church_id_published_at_starts_at_index');
            });
        }
    }

    private function dropLegacyMissionEventIndex(): void
    {
        if (! $this->hasIndex('mission_events_church_id_published_at_starts_at_index')) {
            return;
        }

        Schema::table('mission_events', function (Blueprint $table) {
            $table->dropIndex('mission_events_church_id_published_at_starts_at_index');
        });
    }

    private function ensureChurchStartsAtIndex(): void
    {
        if ($this->hasIndex('mission_events_church_id_starts_at_index')) {
            return;
        }

        Schema::table('mission_events', function (Blueprint $table) {
            $table->index(['church_id', 'starts_at'], 'mission_events_church_id_starts_at_index');
        });
    }

    private function hasIndex(string $indexName): bool
    {
        $connection = Schema::getConnection();
        $driver = $connection->getDriverName();

        if ($driver === 'sqlite') {
            $rows = $connection->select("PRAGMA index_list('mission_events')");

            foreach ($rows as $row) {
                if (($row->name ?? null) === $indexName) {
                    return true;
                }
            }

            return false;
        }

        $database = $connection->getDatabaseName();
        $result = $connection->selectOne(
            'SELECT COUNT(*) AS c FROM information_schema.statistics WHERE table_schema = ? AND table_name = ? AND index_name = ?',
            [$database, 'mission_events', $indexName],
        );

        return (int) ($result->c ?? 0) > 0;
    }
};
