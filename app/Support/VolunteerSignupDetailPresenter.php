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
        // Garantir colunas completas do usuário (ex.: photo_url) se a relação veio parcial de outro load().
        if ($v->relationLoaded('user')) {
            $v->unsetRelation('user');
        }

        $v->loadMissing([
            'ministries:id,name,church_id',
            'user:id,email,name,photo_url,phone,is_ministry_leader,status,birth_date,notify_via_app,notify_via_email,notify_via_whatsapp',
            'user.roles:id,name',
            'user.ministries:id,name,church_id',
        ]);

        $user = $v->user;
        $displayEmail = $user?->email ?: $v->email;
        $displayPhone = $v->phone ?: $user?->phone;

        return [
            'id' => $v->id,
            'name' => $v->name,
            'photo_url' => $user?->photo_url,
            'email' => $v->email,
            'display_email' => $displayEmail,
            'phone' => $v->phone,
            'display_phone' => $displayPhone,
            'has_app_account' => $user !== null,
            'app_login_ready' => $user !== null && is_string($user->email) && trim($user->email) !== '',
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
            'ministries' => $v->ministries
                ->sortBy(fn (Ministry $m) => mb_strtolower($m->name))
                ->map(fn (Ministry $m) => [
                'id' => $m->id,
                'name' => $m->name,
            ])->values()->all(),
            'user' => $user ? [
                'id' => $user->id,
                'email' => $user->email,
                'name' => $user->name,
                'photo_url' => $user->photo_url,
                'phone' => $user->phone,
                'is_ministry_leader' => (bool) ($user->is_ministry_leader ?? false),
                'status' => $user->status ?? 'active',
                'birth_date' => $user->birth_date?->format('Y-m-d'),
                'notify_via_app' => (bool) ($user->notify_via_app ?? true),
                'notify_via_email' => (bool) ($user->notify_via_email ?? true),
                'notify_via_whatsapp' => (bool) ($user->notify_via_whatsapp ?? false),
                'roles' => $user->roles->pluck('name')->values()->all(),
                'ministry_ids' => $user->ministries->pluck('id')->map(fn ($id) => (int) $id)->values()->all(),
                'led_ministries' => $user->ministries
                    ->sortBy(fn (Ministry $m) => mb_strtolower($m->name))
                    ->map(fn (Ministry $m) => ['id' => $m->id, 'name' => $m->name])
                    ->values()
                    ->all(),
            ] : null,
        ];
    }
}
