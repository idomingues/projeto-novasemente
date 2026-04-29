<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class LeaderSelfSignupToken extends Model
{
    protected $fillable = [
        'church_id',
        'token',
    ];

    protected function casts(): array
    {
        return [
            'token' => 'string',
        ];
    }

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }

    /**
     * @return non-falsy-string|null
     */
    public static function ensureSignupUrl(int $churchId): ?string
    {
        if (! Schema::hasTable('leader_self_signup_tokens')) {
            return null;
        }

        $row = self::query()->firstOrCreate(
            ['church_id' => $churchId],
            ['token' => (string) Str::uuid()]
        );

        return route('leaders.self-signup', ['token' => $row->token], absolute: true);
    }
}
