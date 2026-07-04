<?php

namespace App\Models;

use App\Support\StorageUrl;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CharityDonation extends Model
{
    public const SOURCE_APP = 'app';

    public const SOURCE_MANUAL = 'manual';

    public const DISPUTE_PENDING = 'pending';

    public const DISPUTE_RESOLVED = 'resolved';

    protected $fillable = [
        'campaign_id',
        'source',
        'user_id',
        'external_donor_name',
        'amount',
        'ocr_suggested_amount',
        'receipt_path',
        'receipt_hash',
        'is_anonymous',
        'manual_registration_note',
        'registered_by',
        'donor_email_confirmation_requested',
        'confirmed_at',
        'dispute_message',
        'dispute_status',
        'disputed_at',
        'dispute_resolution_note',
        'dispute_resolved_at',
        'amount_before_adjustment',
        'adjustment_note',
        'adjusted_by',
        'adjusted_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'ocr_suggested_amount' => 'decimal:2',
        'amount_before_adjustment' => 'decimal:2',
        'is_anonymous' => 'boolean',
        'donor_email_confirmation_requested' => 'boolean',
        'confirmed_at' => 'datetime',
        'disputed_at' => 'datetime',
        'dispute_resolved_at' => 'datetime',
        'adjusted_at' => 'datetime',
    ];

    protected function receiptUrl(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->receipt_path
                ? StorageUrl::publicMediaUrl($this->receipt_path)
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

    public function adjustedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'adjusted_by');
    }

    public function adjustments(): HasMany
    {
        return $this->hasMany(CharityDonationAdjustment::class, 'charity_donation_id')->orderByDesc('created_at');
    }

    public function registeredByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'registered_by');
    }

    public function isManual(): bool
    {
        return $this->source === self::SOURCE_MANUAL;
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

    /**
     * @return array<string, mixed>
     */
    public function toMobileArray(): array
    {
        return [
            'id' => $this->id,
            'campaign_id' => $this->campaign_id,
            'campaign_title' => $this->campaign?->title,
            'amount' => (float) $this->amount,
            'ocr_suggested_amount' => $this->ocr_suggested_amount !== null ? (float) $this->ocr_suggested_amount : null,
            'amount_before_adjustment' => $this->amount_before_adjustment !== null ? (float) $this->amount_before_adjustment : null,
            'confirmed_at' => $this->confirmed_at->toIso8601String(),
            'receipt_url' => $this->receipt_url,
            'dispute_status' => $this->dispute_status,
            'dispute_message' => $this->dispute_message,
            'disputed_at' => $this->disputed_at?->toIso8601String(),
            'dispute_resolution_note' => $this->dispute_resolution_note,
            'dispute_resolved_at' => $this->dispute_resolved_at?->toIso8601String(),
            'adjustment_note' => $this->adjustment_note,
            'adjusted_at' => $this->adjusted_at?->toIso8601String(),
            'adjustment_history' => $this->relationLoaded('adjustments')
                ? $this->adjustments->map(fn (CharityDonationAdjustment $a) => [
                    'amount_before' => (float) $a->amount_before,
                    'amount_after' => (float) $a->amount_after,
                    'adjustment_note' => $a->adjustment_note,
                    'created_at' => $a->created_at->toIso8601String(),
                ])->values()->all()
                : [],
            'can_dispute' => $this->dispute_status !== self::DISPUTE_PENDING,
        ];
    }
}
