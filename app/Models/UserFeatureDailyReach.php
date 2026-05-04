<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserFeatureDailyReach extends Model
{
    protected $table = 'user_feature_daily_reach';

    protected $fillable = [
        'user_id',
        'church_id',
        'route_name',
        'visited_on',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'visited_on' => 'date',
            'church_id' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
