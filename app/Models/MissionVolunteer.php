<?php

namespace App\Models;

use App\Support\StorageUrl;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MissionVolunteer extends Model
{
    protected $fillable = [
        'church_id',
        'mission_phase_id',
        'phase_entered_at',
        'submitted_by_user_id',
        'photo_path',
        'full_name',
        'email',
        'birth_date',
        'phone',
        'full_address',
        'profession',
        'profession_other',
        'has_belief',
        'belief_which',
        'belief_which_other',
        'participates_religion',
        'religion_which',
        'religion_which_other',
        'baptized',
        'seeks_in_community',
        'seeks_in_community_other',
        'studied_bible',
        'studied_bible_structured',
        'first_time_nova_semente',
        'first_contact_via',
        'first_contact_via_other',
        'wants_bible_study_partner',
        'if_not_how_long',
        'insight_duration',
        'participated_groups',
        'participated_groups_other',
        'engagement_level',
        'closer_to_god_text',
        'belonging_people',
        'belonging_location',
        'belonging_availability',
        'belonging_spirituality',
        'social_actions_interest',
        'profile_type',
        'ministry_preference',
        'social_action_type',
        'weekday_availability',
        'time_per_week',
        'work_preference',
        'can_contact_week',
        'contact_period',
        'contact_format',
        'nps_score',
        'lgpd_consent',
        'last_invite_sent_at',
    ];

    protected $casts = [
        'birth_date' => 'date',
        'has_belief' => 'boolean',
        'participates_religion' => 'boolean',
        'baptized' => 'boolean',
        'studied_bible_structured' => 'boolean',
        'first_time_nova_semente' => 'boolean',
        'seeks_in_community' => 'array',
        'participated_groups' => 'array',
        'can_contact_week' => 'boolean',
        'lgpd_consent' => 'boolean',
        'nps_score' => 'integer',
        'last_invite_sent_at' => 'datetime',
        'phase_entered_at' => 'datetime',
    ];

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }

    public function phase(): BelongsTo
    {
        return $this->belongsTo(MissionPhase::class, 'mission_phase_id');
    }

    public function submittedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by_user_id');
    }

    public function invitations(): HasMany
    {
        return $this->hasMany(MissionInvitation::class);
    }

    public function notes(): HasMany
    {
        return $this->hasMany(MissionVolunteerNote::class);
    }

    public function phaseHistories(): HasMany
    {
        return $this->hasMany(MissionVolunteerPhaseHistory::class)->orderByDesc('created_at');
    }

    public function getPhotoUrlAttribute(): ?string
    {
        if (! $this->photo_path) {
            return null;
        }

        return StorageUrl::publicMediaUrl($this->photo_path);
    }

    public function getDisplayEmailAttribute(): ?string
    {
        $email = trim((string) ($this->email ?? ''));

        return $email !== '' ? $email : null;
    }
}
