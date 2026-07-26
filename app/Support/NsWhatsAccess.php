<?php

namespace App\Support;

use App\Models\Church;
use App\Models\ChurchConversation;
use App\Models\Ministry;
use App\Models\User;
use App\Models\Volunteer;
use Carbon\Carbon;

final class NsWhatsAccess
{
    public static function isModuleAdmin(User $user): bool
    {
        if ($user->hasAnyRole(['super_admin', 'admin'])) {
            return true;
        }

        return $user->can('conversations.admin') || $user->can('conversations.manage');
    }

    public static function leadsMinistry(User $user, int $ministryId): bool
    {
        if (! ($user->hasRole('lider_ministerio') || (bool) ($user->is_ministry_leader ?? false))) {
            return false;
        }

        return $user->ministries()->where('ministries.id', $ministryId)->exists();
    }

    public static function servesInMinistry(User $user, int $ministryId): bool
    {
        return Volunteer::query()
            ->where('user_id', $user->id)
            ->where('active', true)
            ->whereHas('ministries', fn ($q) => $q->where('ministries.id', $ministryId))
            ->exists();
    }

    /**
     * Departamentos em que o usuário serve como voluntário ativo.
     *
     * @return list<int>
     */
    public static function ministryIdsWhereUserServes(User $user, int $churchId): array
    {
        if ($churchId < 1) {
            return [];
        }

        return Volunteer::query()
            ->where('user_id', $user->id)
            ->where('active', true)
            ->whereHas('ministries', fn ($q) => $q->where('ministries.church_id', $churchId))
            ->with(['ministries:id'])
            ->get()
            ->flatMap(fn (Volunteer $v) => $v->ministries->pluck('id'))
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();
    }

    public static function canViewAsStaff(User $user, ChurchConversation $conversation): bool
    {
        if (self::isModuleAdmin($user)) {
            return true;
        }

        if ((int) ($conversation->assignee_user_id ?? 0) === (int) $user->id) {
            return true;
        }

        if ((int) ($conversation->preferred_leader_user_id ?? 0) === (int) $user->id) {
            return true;
        }

        return self::leadsMinistry($user, (int) $conversation->current_ministry_id);
    }

    public static function canReplyAsStaff(User $user, ChurchConversation $conversation): bool
    {
        if (! $conversation->allowsChat()) {
            return false;
        }

        if (self::isModuleAdmin($user)) {
            return true;
        }

        if ((int) ($conversation->assignee_user_id ?? 0) === (int) $user->id) {
            return true;
        }

        if ((int) ($conversation->preferred_leader_user_id ?? 0) === (int) $user->id) {
            return true;
        }

        // Fila do departamento (sem líder específico): líder do depto pode responder e assume a conversa.
        if ($conversation->assignee_user_id === null) {
            return self::leadsMinistry($user, (int) $conversation->current_ministry_id);
        }

        return false;
    }

    public static function isMinistryLeaderAccount(User $user): bool
    {
        return $user->hasRole('lider_ministerio') || (bool) ($user->is_ministry_leader ?? false);
    }

    /**
     * Conversas em «Minhas Mensagens» aguardando resposta do usuário (membro ou destinatário).
     */
    public static function pendingReplyCount(User $user, int $churchId): int
    {
        if ($churchId < 1) {
            return 0;
        }

        return (int) ChurchConversation::query()
            ->where('church_id', $churchId)
            ->where('status', '!=', ChurchConversation::STATUS_CLOSED)
            ->where(function ($q) use ($user) {
                $q->where(function ($member) use ($user) {
                    $member->where('member_user_id', $user->id)
                        ->where('status', ChurchConversation::STATUS_AWAITING_MEMBER);
                })->orWhere(function ($staff) use ($user) {
                    $staff->where(function ($role) use ($user) {
                        $role->where('assignee_user_id', $user->id)
                            ->orWhere('preferred_leader_user_id', $user->id);
                    })->where('status', ChurchConversation::STATUS_AWAITING_DEPARTMENT);
                });
            })
            ->count();
    }

    public static function hasStaffInboxAccess(User $user, int $churchId): bool
    {
        if (self::isModuleAdmin($user) || self::isMinistryLeaderAccount($user)) {
            return true;
        }

        return ChurchConversation::query()
            ->where('church_id', $churchId)
            ->where(function ($q) use ($user) {
                $q->where('assignee_user_id', $user->id)
                    ->orWhere('preferred_leader_user_id', $user->id);
            })
            ->exists();
    }

    public static function reopenDaysForChurch(?Church $church): int
    {
        $days = (int) ($church?->conversation_reopen_days ?? 15);

        return max(1, min(365, $days));
    }

    public static function reopenUntilFrom(Carbon $closedAt, ?Church $church): Carbon
    {
        return $closedAt->copy()->addDays(self::reopenDaysForChurch($church));
    }

    public static function involvesMinor(?User $member): bool
    {
        if ($member?->birth_date === null) {
            return false;
        }

        return $member->birth_date->greaterThan(now()->subYears(18));
    }

    /**
     * Departamentos com pelo menos um líder ou membro com conta (excluindo o próprio usuário).
     *
     * @return list<array{id: int, name: string, description: string|null, icon: string|null, leaders_count: int, members_count: int}>
     */
    public static function ministriesWithContacts(int $churchId, ?User $exclude = null): array
    {
        $ministries = Ministry::query()
            ->where('church_id', $churchId)
            ->withCount([
                'users as leaders_count' => function ($q) use ($exclude) {
                    $q->where(function ($roleQ) {
                        $roleQ->where('is_ministry_leader', true)
                            ->orWhereHas('roles', fn ($r) => $r->where('name', 'lider_ministerio'));
                    });
                    if ($exclude) {
                        $q->where('users.id', '!=', $exclude->id);
                    }
                },
            ])
            ->orderBy('name')
            ->get(['id', 'name', 'description', 'icon']);

        $out = [];
        foreach ($ministries as $m) {
            $membersCount = self::membersCountForMinistry($churchId, (int) $m->id, $exclude);
            $leadersCount = (int) $m->leaders_count;
            if ($leadersCount < 1 && $membersCount < 1) {
                continue;
            }
            $out[] = [
                'id' => (int) $m->id,
                'name' => (string) $m->name,
                'description' => $m->description,
                'icon' => $m->icon,
                'leaders_count' => $leadersCount,
                'members_count' => $membersCount,
            ];
        }

        return $out;
    }

    /** @deprecated Use ministriesWithContacts */
    public static function ministriesWithLeaders(int $churchId, ?User $exclude = null): array
    {
        return self::ministriesWithContacts($churchId, $exclude);
    }

    public static function membersCountForMinistry(int $churchId, int $ministryId, ?User $exclude = null): int
    {
        $leaderIds = collect(self::leadersForMinistry($churchId, $ministryId, null))->pluck('id')->all();

        return Volunteer::query()
            ->where('active', true)
            ->whereNotNull('user_id')
            ->when($exclude, fn ($q) => $q->where('user_id', '!=', $exclude->id))
            ->when($leaderIds !== [], fn ($q) => $q->whereNotIn('user_id', $leaderIds))
            ->whereHas('user', fn ($uq) => $uq->where('church_id', $churchId))
            ->whereHas('ministries', fn ($mq) => $mq->where('ministries.id', $ministryId))
            ->count();
    }

    /**
     * @return list<array{id: int, name: string, photo_url: string|null, role: string}>
     */
    public static function leadersForMinistry(int $churchId, int $ministryId, ?User $exclude = null): array
    {
        return User::query()
            ->where('church_id', $churchId)
            ->where(function ($roleQ) {
                $roleQ->where('is_ministry_leader', true)
                    ->orWhereHas('roles', fn ($r) => $r->where('name', 'lider_ministerio'));
            })
            ->whereHas('ministries', fn ($mq) => $mq->where('ministries.id', $ministryId))
            ->when($exclude, fn ($q) => $q->where('users.id', '!=', $exclude->id))
            ->orderBy('name')
            ->get(['id', 'name', 'photo_url'])
            ->map(fn (User $u) => [
                'id' => (int) $u->id,
                'name' => (string) $u->name,
                'photo_url' => $u->photo_url,
                'role' => 'leader',
            ])
            ->values()
            ->all();
    }

    /**
     * Membros do departamento com conta (voluntários ativos), excluindo líderes já listados e o próprio usuário.
     *
     * @return list<array{id: int, name: string, photo_url: string|null, role: string}>
     */
    public static function membersForMinistry(int $churchId, int $ministryId, ?User $exclude = null): array
    {
        $leaderIds = collect(self::leadersForMinistry($churchId, $ministryId, null))->pluck('id')->all();

        return Volunteer::query()
            ->where('active', true)
            ->whereNotNull('user_id')
            ->when($exclude, fn ($q) => $q->where('user_id', '!=', $exclude->id))
            ->when($leaderIds !== [], fn ($q) => $q->whereNotIn('user_id', $leaderIds))
            ->whereHas('user', fn ($uq) => $uq->where('church_id', $churchId))
            ->whereHas('ministries', fn ($mq) => $mq->where('ministries.id', $ministryId))
            ->with(['user:id,name,photo_url'])
            ->orderBy('name')
            ->get()
            ->map(fn (Volunteer $v) => [
                'id' => (int) $v->user_id,
                'name' => (string) ($v->user?->name ?: $v->display_name),
                'photo_url' => $v->user?->photo_url,
                'role' => 'member',
            ])
            ->unique('id')
            ->values()
            ->all();
    }

    /**
     * Destinatários possíveis: líderes + membros do departamento.
     *
     * @return list<array{id: int, name: string, photo_url: string|null, role: string}>
     */
    public static function recipientsForMinistry(int $churchId, int $ministryId, ?User $exclude = null): array
    {
        return array_values(array_merge(
            self::leadersForMinistry($churchId, $ministryId, $exclude),
            self::membersForMinistry($churchId, $ministryId, $exclude),
        ));
    }

    public static function isValidRecipient(int $userId, int $churchId, int $ministryId, User $from): bool
    {
        if ($userId === (int) $from->id) {
            return false;
        }

        return collect(self::recipientsForMinistry($churchId, $ministryId, $from))
            ->contains(fn (array $r) => (int) $r['id'] === $userId);
    }
}
