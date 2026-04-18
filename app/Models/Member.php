<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

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

    /** Conta de acesso à app (opcional). */
    public function user(): HasOne
    {
        return $this->hasOne(User::class);
    }

    /** Registos de voluntariado ligados a este membro (opcional). */
    public function volunteers(): HasMany
    {
        return $this->hasMany(Volunteer::class);
    }

    protected $casts = [
        'birth_date' => 'date',
    ];
}
