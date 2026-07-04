<?php

namespace App\Models;

use App\Support\StorageUrl;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CharityItemDonation extends Model
{
    public const SOURCE_APP = 'app';

    public const SOURCE_MANUAL = 'manual';

    public const STATUS_PLEDGED = 'pledged';

    public const STATUS_RECEIVED = 'received';

    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'campaign_id',
        'source',
        'user_id',
        'external_donor_name',
        'item_description',
        'quantity',
        'unit_label',
        'notes',
        'staff_note',
        'status',
        'is_anonymous',
        'evidence_photo_path',
        'quantity_before_adjustment',
        'adjustment_note',
        'registered_by',
        'received_by',
        'adjusted_by',
        'pledged_at',
        'received_at',
        'cancelled_at',
        'adjusted_at',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'quantity_before_adjustment' => 'integer',
        'is_anonymous' => 'boolean',
        'pledged_at' => 'datetime',
        'received_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'adjusted_at' => 'datetime',
    ];

    protected function evidencePhotoUrl(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->evidence_photo_path
                ? StorageUrl::publicMediaUrl($this->evidence_photo_path)
                : null,
        );
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(CharityCampaign::class, 'campaign_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function registeredByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'registered_by');
    }

    public function receivedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    public function adjustedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'adjusted_by');
    }

    public function donorDisplayName(): string
    {
        if ($this->is_anonymous) {
            return 'Anônimo';
        }

        if ($this->user?->name) {
            return $this->user->name;
        }

        $external = trim((string) ($this->external_donor_name ?? ''));

        return $external !== '' ? $external : 'Doador';
    }

    public function quantityLabel(): string
    {
        $unit = trim((string) ($this->unit_label ?: $this->campaign?->unit_label ?: 'itens'));

        return trim($this->quantity.' '.$unit);
    }

    public function toMobileArray(): array
    {
        return [
            'id' => $this->id,
            'campaign_id' => $this->campaign_id,
            'campaign_title' => $this->campaign?->title,
            'entry_type' => 'item',
            'item_description' => $this->item_description,
            'quantity' => $this->quantity,
            'unit_label' => $this->unit_label ?: $this->campaign?->unit_label,
            'quantity_label' => $this->quantityLabel(),
            'notes' => $this->notes,
            'staff_note' => $this->staff_note,
            'status' => $this->status,
            'pledged_at' => $this->pledged_at?->toIso8601String(),
            'received_at' => $this->received_at?->toIso8601String(),
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'adjusted_at' => $this->adjusted_at?->toIso8601String(),
            'quantity_before_adjustment' => $this->quantity_before_adjustment,
            'adjustment_note' => $this->adjustment_note,
            'adjustment_history' => [],
            'evidence_photo_url' => $this->evidence_photo_url,
            'can_dispute' => false,
        ];
    }
}
