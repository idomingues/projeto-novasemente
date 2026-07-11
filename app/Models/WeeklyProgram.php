<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WeeklyProgram extends Model
{
    public const TIME_MODE_FIXED = 'fixed';

    public const TIME_MODE_SUNSET = 'sunset';

    public const TIME_MODES = [
        self::TIME_MODE_FIXED,
        self::TIME_MODE_SUNSET,
    ];

    protected $fillable = [
        'church_id',
        'day_of_week',
        'when_label',
        'title',
        'body',
        'lines',
        'time_mode',
        'start_time',
        'end_time',
        'display_time',
        'home_message',
        'image_url',
        'show_on_home',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'lines' => 'array',
        'show_on_home' => 'boolean',
        'is_active' => 'boolean',
        'day_of_week' => 'integer',
        'sort_order' => 'integer',
    ];

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }

    public static function dayName(int $dayOfWeek): string
    {
        $days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

        return $days[$dayOfWeek] ?? '';
    }

    public static function dayOptions(): array
    {
        return [
            0 => 'Domingo',
            1 => 'Segunda',
            2 => 'Terça',
            3 => 'Quarta',
            4 => 'Quinta',
            5 => 'Sexta',
            6 => 'Sábado',
        ];
    }

    public function isSunset(): bool
    {
        return $this->time_mode === self::TIME_MODE_SUNSET;
    }
}
