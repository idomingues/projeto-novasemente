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
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    public function member(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Member::class);
    }

    public function volunteerProfile(): HasOne
    {
        return $this->hasOne(\App\Models\Volunteer::class);
    }

    protected static function booted(): void
    {
        static::created(function (User $user) {
            $user->ensureVolunteerProfile();
        });
    }

    /**
     * Garante que todo usuário autenticado também exista como voluntário (perfil no app).
     * Um voluntário pode existir sem acesso ao app; por isso mantemos `user_id` opcional na tabela.
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
            $name = $email !== '' ? (strstr($email, '@', true) ?: 'Membro') : 'Membro';
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

        $ministryIds = $this->ministries()->pluck('ministries.id')->toArray();
        $volunteer->ministries()->sync($ministryIds);
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
        ];
    }
}
