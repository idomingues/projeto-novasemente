<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BibleVerse extends Model
{
    protected $table = 'bible_verses';

    protected $fillable = [
        'book_id',
        'chapter',
        'verse',
        'text',
    ];

    /**
     * @return BelongsTo<BibleBook, $this>
     */
    public function book(): BelongsTo
    {
        return $this->belongsTo(BibleBook::class, 'book_id');
    }
}

