<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $needle = 'Primeira igreja';

        DB::table('churches')
            ->whereNotNull('description')
            ->where(function ($q) use ($needle) {
                $q->where('description', 'like', '%'.$needle.'%')
                    ->orWhere('description', 'like', '%New Church%');
            })
            ->update([
                'description' => null,
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        // Irreversível: texto era placeholder de seed / dados antigos.
    }
};
