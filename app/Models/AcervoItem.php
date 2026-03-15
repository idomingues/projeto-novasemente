<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AcervoItem extends Model
{
    protected $fillable = ['url', 'title', 'thumbnail_url', 'video_count', 'order'];

    protected $casts = [
        'video_count' => 'integer',
        'order' => 'integer',
    ];
}
