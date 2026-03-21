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
    use HasFactory, Notifiable, HasRoles;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'member_id',
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
