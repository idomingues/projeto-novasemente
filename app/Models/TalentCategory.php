<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class TalentCategory extends Model
{
    protected $fillable = [
        'church_id',
        'name',
        'slug',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    protected static function booted(): void
    {
        static::creating(function (TalentCategory $category) {
            if ($category->slug === '') {
                $category->slug = Str::slug($category->name);
            }
        });
    }

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }

    public function listings(): HasMany
    {
        return $this->hasMany(TalentListing::class, 'category_id');
    }
}
