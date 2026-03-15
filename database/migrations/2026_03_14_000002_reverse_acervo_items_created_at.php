<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $items = DB::table('acervo_items')
            ->orderBy('created_at')
            ->get(['id', 'created_at']);

        if ($items->isEmpty()) {
            return;
        }

        $timestamps = $items->pluck('created_at')->values()->all();
        $reversed = array_reverse($timestamps);

        foreach ($items as $i => $item) {
            DB::table('acervo_items')
                ->where('id', $item->id)
                ->update(['created_at' => $reversed[$i]]);
        }
    }

    public function down(): void
    {
        $items = DB::table('acervo_items')
            ->orderBy('created_at')
            ->get(['id', 'created_at']);

        if ($items->isEmpty()) {
            return;
        }

        $timestamps = $items->pluck('created_at')->values()->all();
        $reversed = array_reverse($timestamps);

        foreach ($items as $i => $item) {
            DB::table('acervo_items')
                ->where('id', $item->id)
                ->update(['created_at' => $reversed[$i]]);
        }
    }
};
