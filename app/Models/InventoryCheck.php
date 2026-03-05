<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryCheck extends Model
{
    public const STATUS_OK = 'ok';
    public const STATUS_MISSING = 'missing';
    public const STATUS_DIVERGENT = 'divergent';

    protected $fillable = [
        'inventory_session_id',
        'inventory_item_id',
        'checked_at',
        'location_found',
        'status',
        'notes',
        'user_id',
    ];

    protected $casts = [
        'checked_at' => 'datetime',
    ];

    public function inventorySession(): BelongsTo
    {
        return $this->belongsTo(InventorySession::class);
    }

    public function inventoryItem(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
