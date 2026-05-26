<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MissionAboutSection extends Model
{
    public const KEY_WHO_WE_ARE = 'who_we_are';

    public const KEY_WHAT_WE_DO = 'what_we_do';

    public const KEY_WHAT_WE_PLAN = 'what_we_plan';

    /** @var array<string, string> */
    public const DEFAULT_TITLES = [
        self::KEY_WHO_WE_ARE => 'Quem somos',
        self::KEY_WHAT_WE_DO => 'O que fazemos',
        self::KEY_WHAT_WE_PLAN => 'O que pretendemos fazer',
    ];

    protected $fillable = [
        'church_id',
        'key',
        'title',
        'body',
    ];

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }
}
