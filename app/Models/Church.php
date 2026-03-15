<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
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

    /** URL pública da logo (path local vira asset, URL externa mantida). */
    protected function logoUrl(): Attribute
    {
        return Attribute::make(
            get: fn (?string $value) => $value ? (str_starts_with($value, 'http') ? $value : asset('storage/' . $value)) : null,
        );
    }

    public function services(): HasMany
    {
        return $this->hasMany(ChurchService::class)->orderBy('day_of_week')->orderBy('sort_order')->orderBy('start_time');
    }
}
