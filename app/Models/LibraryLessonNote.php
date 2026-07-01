<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LibraryLessonNote extends Model
{
    protected $fillable = [
        'church_id',
        'user_id',
        'lesson_source_url',
        'lesson_source_hash',
        'day_slug',
        'body',
        'answer_body',
    ];

    public static function hashSourceUrl(string $url): string
    {
        return hash('sha256', trim($url));
    }

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
