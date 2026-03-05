<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Church extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'logo_url',
        'city',
        'state',
        'country',
        'description',
        'active',
        'email',
        'phone',
        'whatsapp',
        'address',
        'pix_key',
        'donation_url',
    ];

    protected $casts = [
        'active' => 'boolean',
    ];

    public function services(): HasMany
    {
        return $this->hasMany(ChurchService::class)->orderBy('day_of_week')->orderBy('sort_order')->orderBy('start_time');
    }
}
