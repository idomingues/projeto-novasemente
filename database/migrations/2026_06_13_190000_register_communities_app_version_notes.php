<?php

use App\Models\AppVersion;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('app_versions')) {
            return;
        }

        $notesFile = base_path('deployment/release-notes.txt');
        if (! is_file($notesFile)) {
            return;
        }

        $notes = trim((string) file_get_contents($notesFile));
        if ($notes === '') {
            return;
        }

        $row = AppVersion::query()
            ->whereIn('version', ['20.0.5', 'v20.0.5'])
            ->orderByDesc('id')
            ->first();

        if ($row) {
            $row->update([
                'notes' => $notes,
                'released_at' => $row->released_at ?? now(),
            ]);

            return;
        }

        AppVersion::query()->create([
            'version' => '20.0.5',
            'released_at' => now(),
            'notes' => $notes,
        ]);
    }

    public function down(): void
    {
        if (! Schema::hasTable('app_versions')) {
            return;
        }

        AppVersion::query()
            ->whereIn('version', ['20.0.5', 'v20.0.5'])
            ->update(['notes' => null]);
    }
};
