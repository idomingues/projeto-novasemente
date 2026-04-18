<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Pastor extends Model
{
    protected $fillable = [
        'church_id',
        'user_id',
        'agenda_delegate_user_ids',
        'name',
        'bio',
        'photo_path',
        'sort_order',
        'weekly_schedule',
    ];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
            'user_id' => 'integer',
            'agenda_delegate_user_ids' => 'array',
            'weekly_schedule' => 'array',
        ];
    }

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }

    public function linkedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function userIsAgendaDelegate(?User $user): bool
    {
        if ($user === null) {
            return false;
        }

        $ids = $this->agenda_delegate_user_ids ?? [];
        if (! is_array($ids) || $ids === []) {
            return false;
        }

        $uid = (int) $user->id;

        foreach ($ids as $id) {
            if ((int) $id === $uid) {
                return true;
            }
        }

        return false;
    }
}
