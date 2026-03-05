<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryMovement extends Model
{
    public const TYPE_ENTRY = 'entry';
    public const TYPE_EXIT = 'exit';
    public const TYPE_TRANSFER = 'transfer';
    public const TYPE_ADJUSTMENT = 'adjustment';

    public const TYPES = [
        self::TYPE_ENTRY => 'Entrada',
        self::TYPE_EXIT => 'Saída',
        self::TYPE_TRANSFER => 'Transferência',
        self::TYPE_ADJUSTMENT => 'Ajuste',
    ];

    protected $fillable = [
        'inventory_item_id',
        'type',
        'from_location',
        'to_location',
        'notes',
        'user_id',
    ];

    public function inventoryItem(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
