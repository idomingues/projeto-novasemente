<?php

namespace App\Models;

use App\Support\StorageUrl;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DonationCampaignPhoto extends Model
{
    public const KIND_STORY = 'story';

    public const KIND_THANKS = 'thanks';

    protected $fillable = [
        'campaign_id',
        'kind',
        'image_path',
        'sort_order',
    ];

    protected function imageUrl(): Attribute
    {
        return Attribute::make(
            get: fn () => StorageUrl::publicMediaUrl($this->image_path),
        );
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(DonationCampaign::class, 'campaign_id');
    }
}
