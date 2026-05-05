<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BibleBook extends Model
{
    protected $table = 'bible_books';

    protected $fillable = [
        'key',
        'abbrev',
        'name',
        'testament',
        'position',
        'chapters_count',
    ];

    /**
     * @return HasMany<BibleVerse, $this>
     */
    public function verses(): HasMany
    {
        return $this->hasMany(BibleVerse::class, 'book_id');
    }
}

