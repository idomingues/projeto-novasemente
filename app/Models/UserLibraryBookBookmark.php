<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserLibraryBookBookmark extends Model
{
    protected $fillable = [
        'user_id',
        'library_book_id',
    ];

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<LibraryBook, $this>
     */
    public function libraryBook(): BelongsTo
    {
        return $this->belongsTo(LibraryBook::class);
    }
}
