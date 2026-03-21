<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Inverte a ordem de exibição do acervo (mesma regra do app: order DESC, title ASC),
 * atualizando apenas a coluna `order` no banco.
 */
return new class extends Migration
{
    public function up(): void
    {
        $ids = DB::table('acervo_items')
            ->orderByDesc('order')
            ->orderBy('title')
            ->pluck('id');

        if ($ids->isEmpty()) {
            return;
        }

        $reversed = $ids->reverse()->values();
        $n = $reversed->count();
        foreach ($reversed as $index => $id) {
            DB::table('acervo_items')
                ->where('id', $id)
                ->update(['order' => $n - $index]);
        }
    }

    public function down(): void
    {
        // Mesma operação inverte de volta (simétrico).
        $ids = DB::table('acervo_items')
            ->orderByDesc('order')
            ->orderBy('title')
            ->pluck('id');

        if ($ids->isEmpty()) {
            return;
        }

        $reversed = $ids->reverse()->values();
        $n = $reversed->count();
        foreach ($reversed as $index => $id) {
            DB::table('acervo_items')
                ->where('id', $id)
                ->update(['order' => $n - $index]);
        }
    }
};
