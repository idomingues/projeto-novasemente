<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SharedTalentCategory extends Model
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
    ];

    public function listings(): HasMany
    {
        return $this->hasMany(SharedTalentListing::class, 'category_id');
    }
}
