<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PageViewDailyStat extends Model
{
    protected $fillable = [
        'church_id',
        'route_name',
        'visited_on',
        'views',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'visited_on' => 'date',
            'views' => 'integer',
            'church_id' => 'integer',
        ];
    }
}
