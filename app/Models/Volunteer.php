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
        'user_id',
        'name',
        'email',
        'phone',
        'birth_date',
        'has_whatsapp',
        'has_social_networks',
        'attendance_duration',
        'is_official_member',
        'member_record_at_nova_semente',
        'member_record_church',
        'has_previous_ministry_volunteer_experience',
        'previous_ministry_details',
        'ministry_involvement',
        'other_ministry_interest',
        'gifts_to_develop',
        'needs_pastoral_guidance',
        'lgpd_data_consent',
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
        'birth_date' => 'date',
        'has_whatsapp' => 'boolean',
        'has_social_networks' => 'boolean',
        'is_official_member' => 'boolean',
        'member_record_at_nova_semente' => 'boolean',
        'has_previous_ministry_volunteer_experience' => 'boolean',
        'needs_pastoral_guidance' => 'boolean',
        'lgpd_data_consent' => 'boolean',
    ];

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function ministries(): BelongsToMany
    {
        return $this->belongsToMany(Ministry::class, 'ministry_volunteer')->withTimestamps();
    }
}

