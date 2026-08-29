<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Role as SpatieRole;
use Spatie\Permission\PermissionRegistrar;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, HasRoles, Notifiable;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'church_id',
        'role_id',
        'photo_url',
        'phone',
        'birth_date',
        'address',
        'status',
        'is_volunteer',
        'is_ministry_leader',
        'is_mission_team',
        'notify_via_app',
        'notify_via_email',
        'notify_via_whatsapp',
        'lgpd_accepted_at',
    ];

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }

    /**
     * Papel de painel / permissões (espelho do primeiro nome em Spatie `roles` via `model_has_roles`).
     */
    public function panelRole(): BelongsTo
    {
        return $this->belongsTo(SpatieRole::class, 'role_id');
    }

    /**
     * Mantém `users.role_id` alinhado com o primeiro papel Spatie atribuído ao usuário.
     */
    public function syncRoleIdFromSpatieAssignments(): void
    {
        if (! Schema::hasColumn($this->getTable(), 'role_id')) {
            return;
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $this->unsetRelation('roles');

        $name = $this->getRoleNames()->first();
        $guard = (string) config('auth.defaults.guard');

        if ($name === null || $name === '') {
            if ($this->getAttributes()['role_id'] ?? null) {
                $this->forceFill(['role_id' => null])->saveQuietly();
            }

            return;
        }

        $id = SpatieRole::query()
            ->where('name', (string) $name)
            ->where('guard_name', $guard)
            ->value('id');

        $id = $id !== null ? (int) $id : null;

        $current = array_key_exists('role_id', $this->getAttributes()) && $this->getAttributes()['role_id'] !== null
            ? (int) $this->getAttributes()['role_id']
            : null;

        if ($current !== $id) {
            $this->forceFill(['role_id' => $id])->saveQuietly();
        }
    }

    /**
     * Painel web com menu lateral.
     * Perfis de equipe fixos, perfis personalizados (ex.: Missão) com permissões Spatie.
     * Conta só de app (sem perfil / membro) não entra no menu.
     */
    public function canAccessAdminMenu(): bool
    {
        if ($this->hasAnyRole(['admin', 'super_admin', 'pastor', 'secretaria'])) {
            return true;
        }

        return $this->getAllPermissions()->isNotEmpty();
    }

    /**
     * Líder de ministério = propriedade da conta (`is_ministry_leader`), não perfil Spatie.
     */
    public function isMinistryLeaderAccount(): bool
    {
        return (bool) ($this->is_ministry_leader ?? false);
    }

    /**
     * Coordena pelo menos um sábado (ou data extra) em alguma escala.
     */
    public function isScheduleCoordinatorAccount(): bool
    {
        return \App\Support\ScheduleCoordinatorAccess::isCoordinatorAccount($this);
    }

    /**
     * Conta da equipe ou líder — não deve ser reutilizada nem ter papéis alterados pelo cadastro de voluntário.
     */
    public function isPrivilegedTeamAccount(): bool
    {
        return $this->canAccessAdminMenu() || $this->isMinistryLeaderAccount();
    }

    public function volunteerProfile(): HasOne
    {
        return $this->hasOne(\App\Models\Volunteer::class);
    }

    /**
     * Voluntário formal, líder ou conta de equipe do painel — mantém (ou cria) registro em `volunteers`.
     * Membro só com app (sem servir em ministérios) não entra aqui.
     */
    public function shouldMaintainVolunteerRecord(): bool
    {
        if ((bool) ($this->is_volunteer ?? false)) {
            return true;
        }

        if ($this->isMinistryLeaderAccount()) {
            return true;
        }

        if ($this->canAccessAdminMenu()) {
            return true;
        }

        return false;
    }

    /**
     * Questionário de voluntário iniciado (rascunho salvo), ainda sem efetivação como voluntário.
     */
    public function hasVolunteerSignupInProgress(): bool
    {
        $volunteer = $this->volunteerProfile()->first();
        if ($volunteer === null) {
            return false;
        }

        return ! $this->volunteerRecordIsRemovableMirror($volunteer);
    }

    /**
     * Espelho automático criado só para login — pode ser removido sem apagar o usuário.
     * Rascunho do questionário de voluntário (mesmo `app_access_only`) não é removível.
     */
    public function volunteerRecordIsRemovableMirror(?\App\Models\Volunteer $volunteer = null): bool
    {
        $volunteer ??= $this->volunteerProfile()->first();
        if ($volunteer === null) {
            return false;
        }

        if ($volunteer->ministries()->exists()) {
            return false;
        }

        if (filled($volunteer->phone)) {
            return false;
        }

        foreach ([
            'birth_date',
            'attendance_duration',
            'member_record_at_nova_semente',
            'has_previous_ministry_volunteer_experience',
            'ministry_involvement',
            'other_ministry_interest',
            'gifts_to_develop',
            'professional_area',
            'social_network_profiles',
            'volunteer_phase',
            'service_ease_areas',
            'service_activity_types',
            'service_greatest_strength',
            'service_greatest_challenge',
            'lgpd_data_consent',
        ] as $field) {
            $value = $volunteer->{$field};
            if ($value !== null && $value !== '' && $value !== false) {
                return false;
            }
        }

        // Booleanos do questionário: qualquer resposta (Sim/Não) já é rascunho, não espelho vazio.
        if (
            $volunteer->has_whatsapp !== null
            || $volunteer->has_social_networks !== null
            || $volunteer->comfortable_with_digital_tools !== null
            || $volunteer->is_official_member !== null
        ) {
            return false;
        }

        if ($volunteer->churchPipelines()->exists()) {
            return false;
        }

        return true;
    }

    /**
     * Alinha `volunteers` com o papel do usuário: cria/atualiza espelho ou remove espelho só-app.
     */
    public function syncVolunteerRecord(): void
    {
        if ($this->shouldMaintainVolunteerRecord()) {
            $this->ensureVolunteerProfile();

            return;
        }

        $volunteer = $this->volunteerProfile()->first();
        if ($volunteer !== null && $this->volunteerRecordIsRemovableMirror($volunteer)) {
            app(\App\Domain\Volunteers\Actions\DeleteVolunteer::class)($volunteer, false);
        }
    }

    /**
     * Garante um registro em `volunteers` ligado a este usuário (espelho de contato / app).
     * Ministérios em que a pessoa **serve** vêm do cadastro de voluntário; só para `lider_ministerio`
     * espelhamos aqui os ministérios que a pessoa **lidera** (`ministry_user`).
     *
     * `app_access_only`: conta com app sem serviço em ministérios (ex.: usuário só com login).
     */
    public function ensureVolunteerProfile(): void
    {
        $volunteer = $this->volunteerProfile()->first();

        $name = trim((string) ($this->name ?? ''));
        if ($name === '' && $volunteer !== null) {
            $existing = trim((string) ($volunteer->name ?? ''));
            if ($existing !== '') {
                $name = $existing;
            }
        }
        if ($name === '') {
            $email = (string) ($this->email ?? '');
            $name = $email !== '' ? (strstr($email, '@', true) ?: 'Usuário') : 'Usuário';
        }

        $payload = [
            'user_id' => $this->id,
            'active' => true,
            'name' => $name,
            'email' => $this->email,
            'phone' => filled($this->phone) ? $this->phone : ($volunteer?->phone ?? null),
            'role' => $volunteer?->role ?? $this->volunteerRoleMirrorForProfile(),
        ];

        if (! $volunteer) {
            $volunteer = \App\Models\Volunteer::create($payload);
        } else {
            $volunteer->fill($payload);
            $volunteer->save();
        }

        if ($this->shouldMirrorLedMinistriesToVolunteerProfile()) {
            $ledMinistryIds = $this->ministries()->pluck('ministries.id')->map(fn ($id) => (int) $id)->values()->all();
            $attachedIds = $volunteer->ministries()->pluck('ministries.id')->map(fn ($id) => (int) $id)->values()->all();
            $volunteer->ministries()->sync(array_values(array_unique(array_merge($ledMinistryIds, $attachedIds))));
        }

        $volunteer->unsetRelation('ministries');

        $appAccessOnly = (bool) ($this->is_volunteer ?? false)
            ? false
            : $this->volunteerRowIsAppAccessOnly($volunteer);

        $volunteer->forceFill([
            'app_access_only' => $appAccessOnly,
        ])->save();
    }

    /**
     * Papel espelhado em volunteers.role — não copia papéis de equipe.
     */
    private function volunteerRoleMirrorForProfile(): ?string
    {
        if ($this->hasRole('super_admin') || $this->canAccessAdminMenu()) {
            return null;
        }

        $first = $this->getRoleNames()->first();

        return $first !== null ? (string) $first : null;
    }

    /**
     * Só líder de ministério (sem painel de equipe) espelha departamentos liderados no registro de voluntário.
     */
    private function shouldMirrorLedMinistriesToVolunteerProfile(): bool
    {
        return $this->isMinistryLeaderAccount()
            && ! $this->hasRole('super_admin')
            && ! $this->canAccessAdminMenu();
    }

    /**
     * Usuário só com conta na app (sem papel de equipe nem ministérios de serviço no registo de voluntário).
     */
    public function volunteerRowIsAppAccessOnly(\App\Models\Volunteer $volunteer): bool
    {
        if ($volunteer->ministries()->exists()) {
            return false;
        }

        if ($this->isMinistryLeaderAccount()) {
            return false;
        }

        if ($this->hasAnyRole(['admin', 'super_admin', 'pastor', 'secretaria'])) {
            return false;
        }

        return true;
    }

    /**
     * Departamentos (ministérios) que o usuário lidera. Usado para o papel lider_ministerio na área de escalas.
     */
    public function missionPhases(): BelongsToMany
    {
        return $this->belongsToMany(MissionPhase::class, 'mission_user_phases')
            ->withTimestamps()
            ->select('mission_phases.*');
    }

    public function ministries(): BelongsToMany
    {
        return $this->belongsToMany(\App\Models\Ministry::class, 'ministry_user')
            ->orderBy('ministries.name')
            ->withTimestamps();
    }

    public function inboxNotifications(): HasMany
    {
        return $this->hasMany(UserInboxNotification::class);
    }

    public function pushTokens(): HasMany
    {
        return $this->hasMany(PushToken::class);
    }

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role_id' => 'integer',
            'birth_date' => 'date',
            'is_volunteer' => 'boolean',
            'is_ministry_leader' => 'boolean',
            'is_mission_team' => 'boolean',
            'notify_via_app' => 'boolean',
            'notify_via_email' => 'boolean',
            'notify_via_whatsapp' => 'boolean',
            'lgpd_accepted_at' => 'datetime',
        ];
    }
}
