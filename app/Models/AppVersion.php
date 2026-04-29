<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Schema;
use Throwable;

class AppVersion extends Model
{
    protected $fillable = [
        'version',
        'released_at',
        'notes',
    ];

    protected $casts = [
        'released_at' => 'datetime',
    ];

    public function supportTickets(): HasMany
    {
        return $this->hasMany(AppSupportTicket::class);
    }

    public static function latestLabel(): ?string
    {
        try {
            if (! Schema::hasTable('app_versions')) {
                return null;
            }

            return static::query()
                ->orderByRaw('COALESCE(released_at, created_at) DESC')
                ->orderByDesc('id')
                ->value('version');
        } catch (Throwable) {
            return null;
        }
    }
}
