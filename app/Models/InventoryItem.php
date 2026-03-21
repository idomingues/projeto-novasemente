<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class InventoryItem extends Model
{
    public const STATUS_ACTIVE = 'active';
    public const STATUS_INACTIVE = 'inactive';
    public const STATUS_MAINTENANCE = 'maintenance';
    public const STATUS_DISPOSED = 'disposed';

    protected $fillable = [
        'church_id',
        'barcode',
        'serial_number',
        'name',
        'description',
        'location',
        'category',
        'brand',
        'item_type',
        'classification',
        'acquisition_date',
        'acquisition_value',
        'current_value',
        'status',
        'photo_path',
    ];

    protected $appends = [
        'photo_url',
    ];

    protected $casts = [
        'acquisition_date' => 'date',
        'acquisition_value' => 'decimal:2',
        'current_value' => 'decimal:2',
    ];

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }

    public function movements(): HasMany
    {
        return $this->hasMany(InventoryMovement::class)->orderByDesc('created_at');
    }

    protected function photoUrl(): Attribute
    {
        return Attribute::get(function (): ?string {
            if (! $this->photo_path) {
                return null;
            }

            return Storage::disk('public')->url($this->photo_path);
        });
    }
}
