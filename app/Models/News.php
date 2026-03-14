<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class News extends Model
{
    protected $fillable = [
        'church_id',
        'title',
        'slug',
        'excerpt',
        'body',
        'image_url',
        'published_at',
        'created_by',
    ];

    protected $casts = [
        'published_at' => 'datetime',
    ];

    protected function imageUrl(): Attribute
    {
        return Attribute::make(
            get: function (?string $value): ?string {
                if (empty($value)) {
                    return null;
                }
                if (str_starts_with($value, '/')) {
                    return $value;
                }
                if (preg_match('#^https?://[^/]+(/storage/.*)$#', $value, $m)) {
                    return $m[1];
                }
                return $value;
            },
        );
    }

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

