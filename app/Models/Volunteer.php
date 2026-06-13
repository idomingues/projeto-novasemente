<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Volunteer extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'email',
        'phone',
        'birth_date',
        'has_whatsapp',
        'has_social_networks',
        'social_network_profiles',
        'attendance_duration',
        'volunteer_phase',
        'service_ease_areas',
        'comfortable_with_digital_tools',
        'is_official_member',
        'member_record_at_nova_semente',
        'member_record_church',
        'has_previous_ministry_volunteer_experience',
        'previous_ministry_details',
        'ministry_involvement',
        'other_ministry_interest',
        'gifts_to_develop',
        'service_greatest_strength',
        'service_greatest_challenge',
        'professional_area',
        'needs_pastoral_guidance',
        'lgpd_data_consent',
        'role',
        'active',
        'app_access_only',
    ];

    /**
     * Nome para exibição: do utilizador vinculado ou do cadastro do voluntário (quando não há user).
     */
    public function getDisplayNameAttribute(): string
    {
        return $this->name ?? 'Sem nome';
    }

    protected $casts = [
        'app_access_only' => 'boolean',
        'active' => 'boolean',
        'birth_date' => 'date',
        'has_whatsapp' => 'boolean',
        'has_social_networks' => 'boolean',
        'comfortable_with_digital_tools' => 'boolean',
        'is_official_member' => 'boolean',
        'member_record_at_nova_semente' => 'boolean',
        'has_previous_ministry_volunteer_experience' => 'boolean',
        'needs_pastoral_guidance' => 'boolean',
        'lgpd_data_consent' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function ministries(): BelongsToMany
    {
        return $this->belongsToMany(Ministry::class, 'ministry_volunteer')
            ->orderBy('ministries.name')
            ->withPivot(['id', 'clearance_status', 'cleared_at', 'cleared_by_user_id'])
            ->withTimestamps();
    }

    public function clearanceChecks(): HasMany
    {
        return $this->hasMany(VolunteerClearanceCheck::class);
    }

    public function churchPipelines(): HasMany
    {
        return $this->hasMany(VolunteerChurchPipeline::class);
    }

    public function leaderNotes(): HasMany
    {
        return $this->hasMany(VolunteerLeaderNote::class);
    }

    public function ministryInvitations(): HasMany
    {
        return $this->hasMany(VolunteerMinistryInvitation::class);
    }
}
