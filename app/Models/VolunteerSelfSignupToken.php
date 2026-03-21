<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class VolunteerSelfSignupToken extends Model
{
    protected $fillable = [
        'church_id',
        'token',
    ];

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }

    /**
     * Devolve null se a migration ainda não foi executada (tabela inexistente).
     */
    public static function ensurePublicSignupUrl(int $churchId): ?string
    {
        if (! Schema::hasTable('volunteer_self_signup_tokens')) {
            return null;
        }

        $row = self::query()->firstOrCreate(
            ['church_id' => $churchId],
            ['token' => (string) Str::uuid()]
        );

        return route('volunteers.self-signup', ['token' => $row->token], absolute: true);
    }
}
