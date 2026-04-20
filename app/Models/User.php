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
        'photo_url',
        'phone',
        'birth_date',
        'address',
        'status',
        'is_volunteer',
        'notify_via_app',
        'notify_via_email',
        'notify_via_whatsapp',
        'lgpd_accepted_at',
    ];

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }

    public function volunteerProfile(): HasOne
    {
        return $this->hasOne(\App\Models\Volunteer::class);
    }

    /**
     * Garante um registo em `volunteers` ligado a este utilizador (espelho de contacto / app).
     * Ministérios em que a pessoa **serve** vêm do cadastro de voluntário; só para `lider_ministerio`
     * espelhamos aqui os ministérios que a pessoa **lidera** (`ministry_user`).
     *
     * `app_access_only`: conta com app sem serviço em ministérios (ex.: utilizador só com login).
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
            'role' => $volunteer?->role ?? ($this->getRoleNames()->first() ?: null),
        ];

        if (! $volunteer) {
            $volunteer = \App\Models\Volunteer::create($payload);
        } else {
            $volunteer->fill($payload);
            $volunteer->save();
        }

        if ($this->hasRole('lider_ministerio')) {
            $ledMinistryIds = $this->ministries()->pluck('ministries.id')->map(fn ($id) => (int) $id)->values()->all();
            $attachedIds = $volunteer->ministries()->pluck('ministries.id')->map(fn ($id) => (int) $id)->values()->all();
            $volunteer->ministries()->sync(array_values(array_unique(array_merge($ledMinistryIds, $attachedIds))));
        }

        $volunteer->unsetRelation('ministries');

        $volunteer->forceFill([
            'app_access_only' => $this->volunteerRowIsAppAccessOnly($volunteer),
        ])->save();
    }

    /**
     * Utilizador só com conta na app (sem papel de equipe nem ministérios de serviço no registo de voluntário).
     */
    public function volunteerRowIsAppAccessOnly(\App\Models\Volunteer $volunteer): bool
    {
        if ($volunteer->ministries()->exists()) {
            return false;
        }

        if ($this->hasAnyRole(['admin', 'super_admin', 'pastor', 'secretaria', 'lider_ministerio', 'financeiro'])) {
            return false;
        }

        return true;
    }

    /**
     * Departamentos (ministérios) que o usuário lidera. Usado para o papel lider_ministerio na área de escalas.
     */
    public function ministries(): BelongsToMany
    {
        return $this->belongsToMany(\App\Models\Ministry::class, 'ministry_user')->withTimestamps();
    }

    public function inboxNotifications(): HasMany
    {
        return $this->hasMany(UserInboxNotification::class);
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
            'birth_date' => 'date',
            'is_volunteer' => 'boolean',
            'notify_via_app' => 'boolean',
            'notify_via_email' => 'boolean',
            'notify_via_whatsapp' => 'boolean',
            'lgpd_accepted_at' => 'datetime',
        ];
    }
}
