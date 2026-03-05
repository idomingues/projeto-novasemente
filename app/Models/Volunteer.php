<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Volunteer extends Model
{
    use HasFactory;

    protected $fillable = [
        'member_id',
        'name',
        'email',
        'phone',
        'role',
        'active',
    ];

    /**
     * Nome para exibição: do membro vinculado ou do cadastro do voluntário (quando não é membro).
     */
    public function getDisplayNameAttribute(): string
    {
        return $this->member_id ? ($this->member?->name ?? '') : ($this->name ?? 'Sem nome');
    }

    protected $casts = [
        'active' => 'boolean',
    ];

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    public function ministries(): BelongsToMany
    {
        return $this->belongsToMany(Ministry::class, 'ministry_volunteer')->withTimestamps();
    }
}

