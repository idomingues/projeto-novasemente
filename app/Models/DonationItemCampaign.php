<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DonationItemCampaign extends Model
{
    public const STATUS_ACTIVE = 'active';
    public const STATUS_CLOSED = 'closed';
    public const STATUS_ARCHIVED = 'archived';

    protected $fillable = [
        'church_id',
        'title',
        'description',
        'goal_quantity',
        'collected_quantity',
        'unit_label',
        'status',
        'ends_at',
        'created_by',
    ];

    protected $casts = [
        'goal_quantity' => 'integer',
        'collected_quantity' => 'integer',
        'ends_at' => 'date',
    ];

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }

    public function remainingQuantity(): int
    {
        return max(0, (int) $this->goal_quantity - (int) $this->collected_quantity);
    }

    public function progressPercent(): int
    {
        $goal = (int) $this->goal_quantity;
        if ($goal <= 0) {
            return 0;
        }

        return (int) min(100, floor(((int) $this->collected_quantity / $goal) * 100));
    }

    public function isActiveOrClosedForMobile(): bool
    {
        if ($this->status === self::STATUS_ACTIVE) {
            if ($this->ends_at !== null && $this->ends_at->copy()->endOfDay()->isPast()) {
                return false;
            }

            return true;
        }

        return $this->status === self::STATUS_CLOSED;
    }

    public function toMobileArray(bool $includeDescription = false): array
    {
        $data = [
            'id' => $this->id,
            'title' => $this->title,
            'goal_quantity' => (int) $this->goal_quantity,
            'collected_quantity' => (int) $this->collected_quantity,
            'remaining_quantity' => $this->remainingQuantity(),
            'progress_percent' => $this->progressPercent(),
            'unit_label' => $this->unit_label,
            'status' => $this->status,
            'ends_at' => $this->ends_at?->format('Y-m-d'),
        ];

        if ($includeDescription) {
            $data['description'] = $this->description;
        }

        return $data;
    }
}

