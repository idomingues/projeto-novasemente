<?php

namespace App\Support;

use App\Models\Volunteer;

class SolicitationHandlerAssignee
{
    /**
     * Voluntários com conta, propriedade de líder de ministério e serviço nesta igreja.
     *
     * @return list<array{value: int, label: string}>
     */
    public static function volunteerOptionsForChurch(int $churchId): array
    {
        return Volunteer::query()
            ->where('active', true)
            ->whereNotNull('user_id')
            ->whereHas('user', fn ($q) => $q->where('is_ministry_leader', true))
            ->whereHas('ministries', fn ($q) => $q->where('church_id', $churchId))
            ->with(['user:id,name', 'ministries:id,name,church_id'])
            ->orderBy('id')
            ->get()
            ->map(function (Volunteer $v) use ($churchId) {
                $name = $v->display_name;
                $ministry = $v->ministries->firstWhere('church_id', $churchId)?->name;
                $label = $ministry ? $name.' ('.$ministry.')' : $name;

                return ['value' => (int) $v->id, 'label' => $label];
            })
            ->values()
            ->all();
    }

    public static function isValidHandlerVolunteer(int $volunteerId, int $churchId): bool
    {
        return Volunteer::query()
            ->whereKey($volunteerId)
            ->where('active', true)
            ->whereNotNull('user_id')
            ->whereHas('user', fn ($q) => $q->where('is_ministry_leader', true))
            ->whereHas('ministries', fn ($q) => $q->where('church_id', $churchId))
            ->exists();
    }
}
