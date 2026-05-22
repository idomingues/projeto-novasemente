<?php

namespace App\Support;

use App\Models\Ministry;
use App\Models\Pastor;
use App\Models\User;
use App\Models\Volunteer;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SolicitationAssignees
{
    /** Departamento fixo em «Falar com líder» (equipe de voluntariado). */
    public const LEADER_CONTACT_MINISTRY_NAME = 'Voluntariado';

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
            ->with(['user:id,name', 'ministries:id,name,church_id'])
            ->orderBy('name')
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
     * Líderes com conta na app do departamento Voluntariado (contato fixo para todos os membros).
     *
     * @return list<array{value: int, label: string}>
     */
    public static function leaderContactVolunteerOptions(?int $churchId, ?User $member = null): array
    {
        if ($churchId === null) {
            return [];
        }

        $ministryId = self::leaderContactMinistryId($churchId);
        if ($ministryId === null) {
            return [];
        }

        return Volunteer::query()
            ->where('active', true)
            ->whereNotNull('user_id')
            ->whereHas('user', function ($uq) use ($churchId, $ministryId) {
                $uq->where(function ($roleQ) {
                    $roleQ->where('is_ministry_leader', true)
                        ->orWhereHas('roles', fn ($r) => $r->where('name', 'lider_ministerio'));
                })->whereHas('ministries', fn ($mq) => $mq
                    ->where('church_id', $churchId)
                    ->where('ministries.id', $ministryId));
            })
            ->with(['user:id,name,is_ministry_leader', 'user.ministries:id,name,church_id', 'user.roles:id,name'])
            ->orderBy('name')
            ->get()
            ->map(function (Volunteer $v) {
                return ['value' => (int) $v->id, 'label' => $v->display_name];
            })
            ->values()
            ->all();
    }

    public static function isValidLeaderContactVolunteer(int $volunteerId, int $churchId, User $member): bool
    {
        $ministryId = self::leaderContactMinistryId($churchId);
        if ($ministryId === null) {
            return false;
        }

        return Volunteer::query()
            ->whereKey($volunteerId)
            ->where('active', true)
            ->whereNotNull('user_id')
            ->whereHas('user', function ($uq) use ($churchId, $ministryId) {
                $uq->where(function ($roleQ) {
                    $roleQ->where('is_ministry_leader', true)
                        ->orWhereHas('roles', fn ($r) => $r->where('name', 'lider_ministerio'));
                })->whereHas('ministries', fn ($mq) => $mq
                    ->where('church_id', $churchId)
                    ->where('ministries.id', $ministryId));
            })
            ->exists();
    }

    /**
     * Departamento fixo exibido em «Falar com líder».
     *
     * @return array{id: int, name: string}|null
     */
    public static function leaderContactMinistryForChurch(?int $churchId): ?array
    {
        if ($churchId === null) {
            return null;
        }

        $ministry = Ministry::query()
            ->where('church_id', $churchId)
            ->where('name', self::LEADER_CONTACT_MINISTRY_NAME)
            ->first(['id', 'name']);

        if ($ministry === null) {
            return null;
        }

        return ['id' => (int) $ministry->id, 'name' => (string) $ministry->name];
    }

    private static function leaderContactMinistryId(int $churchId): ?int
    {
        $id = Ministry::query()
            ->where('church_id', $churchId)
            ->where('name', self::LEADER_CONTACT_MINISTRY_NAME)
            ->value('id');

        return $id !== null ? (int) $id : null;
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
        foreach (['preferred_date', 'assigned_pastor_id', 'assigned_volunteer_id', 'preferred_modality'] as $key) {
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
