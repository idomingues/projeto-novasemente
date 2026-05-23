<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CampaignDonationAdjustment extends Model
{
    protected $fillable = [
        'campaign_donation_id',
        'amount_before',
        'amount_after',
        'adjustment_note',
        'adjusted_by',
    ];

    protected $casts = [
        'amount_before' => 'decimal:2',
        'amount_after' => 'decimal:2',
    ];

    public function donation(): BelongsTo
    {
        return $this->belongsTo(CampaignDonation::class, 'campaign_donation_id');
    }

    public function adjustedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'adjusted_by');
    }
}
