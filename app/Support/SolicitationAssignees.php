<?php

namespace App\Support;

use App\Models\Pastor;
use App\Models\Volunteer;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SolicitationAssignees
{
    /**
     * @return list<array{value: int, label: string}>
     */
    public static function pastorOptions(?int $churchId): array
    {
        if ($churchId === null) {
            return [];
        }

        return Pastor::query()
            ->where('church_id', $churchId)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (Pastor $p) => ['value' => (int) $p->id, 'label' => (string) $p->name])
            ->values()
            ->all();
    }

    /**
     * @return list<array{value: int, label: string}>
     */
    public static function volunteerOptions(?int $churchId): array
    {
        if ($churchId === null) {
            return [];
        }

        return Volunteer::query()
            ->where('active', true)
            ->whereHas('ministries', fn ($q) => $q->where('church_id', $churchId))
            ->with(['member:id,name', 'ministries:id,name,church_id'])
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

    /**
     * Líderes com conta na app (user_id) — para «Falar com líder».
     *
     * @return list<array{value: int, label: string}>
     */
    public static function leaderContactVolunteerOptions(?int $churchId): array
    {
        if ($churchId === null) {
            return [];
        }

        return Volunteer::query()
            ->where('active', true)
            ->whereNotNull('user_id')
            ->whereHas('ministries', fn ($q) => $q->where('church_id', $churchId))
            ->with(['member:id,name', 'ministries:id,name,church_id'])
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

    /**
     * @return array<string, mixed>
     */
    public static function assignmentRules(?int $churchId): array
    {
        $pastorRule = ['nullable', 'integer'];
        $volunteerRule = ['nullable', 'integer'];

        if ($churchId !== null) {
            $pastorRule[] = Rule::exists('pastors', 'id')->where('church_id', $churchId);
            $volunteerRule[] = self::volunteerExistsInChurchRule($churchId);
        } else {
            $pastorRule[] = 'prohibited';
            $volunteerRule[] = 'prohibited';
        }

        return [
            'preferred_date' => ['nullable', 'date'],
            'assigned_pastor_id' => $pastorRule,
            'assigned_volunteer_id' => $volunteerRule,
        ];
    }

    private static function volunteerExistsInChurchRule(int $churchId): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail) use ($churchId): void {
            if ($value === null || $value === '') {
                return;
            }
            $id = (int) $value;
            $ok = Volunteer::query()
                ->where('id', $id)
                ->where('active', true)
                ->whereHas('ministries', fn ($q) => $q->where('church_id', $churchId))
                ->exists();
            if (! $ok) {
                $fail('O voluntário não é válido para esta igreja.');
            }
        };
    }

    /** Normaliza strings vazias vindas de selects / date para null antes da validação. */
    public static function normalizeAssignmentRequest(Request $request): void
    {
        foreach (['preferred_date', 'assigned_pastor_id', 'assigned_volunteer_id'] as $key) {
            if ($request->has($key) && $request->input($key) === '') {
                $request->merge([$key => null]);
            }
        }
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public static function assertSingleAssignee(array $data): void
    {
        $p = $data['assigned_pastor_id'] ?? null;
        $v = $data['assigned_volunteer_id'] ?? null;
        if ($p !== null && $p !== '' && $v !== null && $v !== '') {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'assigned_volunteer_id' => 'Escolha apenas um pastor ou um voluntário, não ambos.',
            ]);
        }
    }
}
