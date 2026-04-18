<?php

namespace App\Support;

use App\Models\Ministry;
use App\Models\Volunteer;

/**
 * Dados completos do cadastro de voluntário (formulário público / ficha).
 */
class VolunteerSignupDetailPresenter
{
    /**
     * @return array<string, mixed>
     */
    public static function forVolunteer(Volunteer $v): array
    {
        $v->loadMissing([
            'ministries:id,name,church_id',
            'user:id,email,name',
            'user.roles:id,name',
            'user.ministries:id,name',
        ]);

        return [
            'id' => $v->id,
            'name' => $v->name,
            'email' => $v->email,
            'phone' => $v->phone,
            'birth_date' => $v->birth_date?->format('Y-m-d'),
            'has_whatsapp' => $v->has_whatsapp,
            'has_social_networks' => $v->has_social_networks,
            'attendance_duration' => $v->attendance_duration,
            'is_official_member' => $v->is_official_member,
            'member_record_at_nova_semente' => $v->member_record_at_nova_semente,
            'member_record_church' => $v->member_record_church,
            'has_previous_ministry_volunteer_experience' => $v->has_previous_ministry_volunteer_experience,
            'previous_ministry_details' => $v->previous_ministry_details,
            'ministry_involvement' => $v->ministry_involvement,
            'other_ministry_interest' => $v->other_ministry_interest,
            'gifts_to_develop' => $v->gifts_to_develop,
            'professional_area' => $v->professional_area,
            'needs_pastoral_guidance' => $v->needs_pastoral_guidance,
            'lgpd_data_consent' => $v->lgpd_data_consent,
            'role' => $v->role,
            'active' => (bool) $v->active,
            'app_access_only' => (bool) ($v->app_access_only ?? false),
            'created_at' => $v->created_at?->toIso8601String(),
            'updated_at' => $v->updated_at?->toIso8601String(),
            'ministries' => $v->ministries->map(fn (Ministry $m) => [
                'id' => $m->id,
                'name' => $m->name,
            ])->values()->all(),
            'user' => $v->user ? [
                'id' => $v->user->id,
                'email' => $v->user->email,
                'name' => $v->user->name,
                'roles' => $v->user->roles->pluck('name')->values()->all(),
                'ministry_ids' => $v->user->ministries->pluck('id')->map(fn ($id) => (int) $id)->values()->all(),
            ] : null,
        ];
    }
}
