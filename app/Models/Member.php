<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Member extends Model
{
    /** @use HasFactory<\Database\Factories\MemberFactory> */
    use HasFactory;

    protected $fillable = [
        'church_id',
        'name',
        'photo_url',
        'email',
        'phone',
        'birth_date',
        'address',
        'status',
    ];

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }

    protected $casts = [
        'birth_date' => 'date',
    ];
}
