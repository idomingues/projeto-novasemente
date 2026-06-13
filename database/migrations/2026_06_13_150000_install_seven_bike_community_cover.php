<?php

use App\Models\ChurchCommunity;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

return new class extends Migration
{
    private const COVER_RELATIVE_PATH = 'communities/covers/seven-bike-nova-semente.jpg';

    public function up(): void
    {
        if (! Schema::hasTable('church_communities')) {
            return;
        }

        $source = database_path('seed-assets/communities/seven-bike-nova-semente.jpg');
        if (! is_file($source)) {
            return;
        }

        Storage::disk('public')->makeDirectory('communities/covers');
        $target = Storage::disk('public')->path(self::COVER_RELATIVE_PATH);

        if (! is_file($target)) {
            File::copy($source, $target);
        }

        DB::table('church_communities')
            ->where('name', 'Seven Bike Nova Semente')
            ->where(function ($q) {
                $q->whereNull('cover_path')->orWhere('cover_path', '');
            })
            ->update([
                'cover_path' => self::COVER_RELATIVE_PATH,
                'updated_at' => now(),
            ]);

        // Referência na BD sem arquivo (ex.: deploy anterior) — reinstala a arte.
        $rows = DB::table('church_communities')
            ->where('name', 'Seven Bike Nova Semente')
            ->where('cover_path', self::COVER_RELATIVE_PATH)
            ->get(['id']);

        if ($rows->isNotEmpty() && ! is_file($target)) {
            File::copy($source, $target);
        }
    }

    public function down(): void
    {
        // Mantém arte e capa — dado de conteúdo, não estrutura.
    }
};
