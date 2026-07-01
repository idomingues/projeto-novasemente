<?php

use App\Models\Church;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        Church::query()->each(function (Church $church): void {
            $disabled = $church->disabled_app_features;
            if (! is_array($disabled) || $disabled === []) {
                return;
            }

            $filtered = array_values(array_filter(
                $disabled,
                fn ($key) => ! in_array($key, ['revista_adventista', 'revista_adventista_acervo'], true),
            ));

            if ($filtered === $disabled) {
                return;
            }

            $church->update(['disabled_app_features' => $filtered === [] ? null : $filtered]);
        });
    }

    public function down(): void
    {
        // Sem reversão: reativar a funcionalidade não deve voltar a desativá-la.
    }
};
