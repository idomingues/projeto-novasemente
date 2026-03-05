<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChurchService extends Model
{
    protected $fillable = [
        'church_id',
        'day_of_week',
        'name',
        'start_time',
        'end_time',
        'sort_order',
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
}
