<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ministry extends Model
{
    use HasFactory;

    protected $fillable = [
        'church_id',
        'name',
        'icon',
        'description',
    ];

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }

    /**
     * Usuários (líderes) vinculados a este departamento para gerir escalas.
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(\App\Models\User::class, 'ministry_user')
            ->orderBy('users.name')
            ->withTimestamps();
    }

    public function volunteers(): BelongsToMany
    {
        return $this->belongsToMany(Volunteer::class, 'ministry_volunteer')
            ->orderBy('volunteers.name')
            ->withPivot(['id', 'clearance_status', 'cleared_at', 'cleared_by_user_id'])
            ->withTimestamps();
    }

    public function clearanceCriteria(): HasMany
    {
        return $this->hasMany(VolunteerClearanceCriterion::class)->orderBy('sort_order');
    }
}
