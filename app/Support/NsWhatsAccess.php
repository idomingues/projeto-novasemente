<?php

namespace App\Support;

use App\Models\Church;
use App\Models\ChurchConversation;
use App\Models\Ministry;
use App\Models\User;
use App\Models\Volunteer;

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
        if (! $user->isMinistryLeaderAccount()) {
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
        return $user->isMinistryLeaderAccount();
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

    public static function involvesMinor(?User $member): bool
    {
        if ($member?->birth_date === null) {
            return false;
        }

        return $member->birth_date->greaterThan(now()->subYears(18));
    }

    /**
     * Departamentos com pelo menos um líder ou membro com conta (excluindo o próprio usuário).
     * Departamentos em que o usuário serve (`i_serve`) vêm primeiro.
     *
     * @return list<array{id: int, name: string, description: string|null, icon: string|null, leaders_count: int, members_count: int, i_serve: bool}>
     */
    public static function ministriesWithContacts(int $churchId, ?User $exclude = null): array
    {
        $servedIds = $exclude !== null
            ? array_fill_keys(self::ministryIdsWhereUserServes($exclude, $churchId), true)
            : [];

        $ministries = Ministry::query()
            ->where('church_id', $churchId)
            ->withCount([
                'users as leaders_count' => function ($q) use ($exclude) {
                    $q->where(function ($roleQ) {
                        $roleQ->where('is_ministry_leader', true);
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
            $id = (int) $m->id;
            $out[] = [
                'id' => $id,
                'name' => (string) $m->name,
                'description' => $m->description,
                'icon' => $m->icon,
                'leaders_count' => $leadersCount,
                'members_count' => $membersCount,
                'i_serve' => isset($servedIds[$id]),
            ];
        }

        usort($out, static function (array $a, array $b): int {
            if ($a['i_serve'] !== $b['i_serve']) {
                return $a['i_serve'] ? -1 : 1;
            }

            return strcasecmp($a['name'], $b['name']);
        });

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
                $roleQ->where('is_ministry_leader', true);
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

    /**
     * Busca líderes e voluntários por nome (uma entrada por pessoa).
     * Se a pessoa atua em vários departamentos, `ministry_name` lista todos separados por vírgula.
     *
     * @return list<array{id: int, name: string, photo_url: string|null, role: string, ministry_id: int, ministry_name: string}>
     */
    public static function searchPeople(int $churchId, string $term, ?User $exclude = null, int $limit = 40): array
    {
        $term = trim($term);
        if (mb_strlen($term) < 2) {
            return [];
        }

        $like = '%'.$term.'%';

        /** @var array<int, array{id: int, name: string, photo_url: string|null, is_leader: bool, ministries: array<int, string>}> $byUser */
        $byUser = [];

        $addMinistry = static function (
            array &$byUser,
            int $userId,
            string $name,
            ?string $photoUrl,
            int $ministryId,
            string $ministryName,
            bool $asLeader,
        ): void {
            if (! isset($byUser[$userId])) {
                $byUser[$userId] = [
                    'id' => $userId,
                    'name' => $name,
                    'photo_url' => $photoUrl,
                    'is_leader' => false,
                    'ministries' => [],
                ];
            }
            if ($asLeader) {
                $byUser[$userId]['is_leader'] = true;
            }
            if (! isset($byUser[$userId]['ministries'][$ministryId])) {
                $byUser[$userId]['ministries'][$ministryId] = $ministryName;
            }
        };

        $leaders = User::query()
            ->where('church_id', $churchId)
            ->where(function ($roleQ) {
                $roleQ->where('is_ministry_leader', true);
            })
            ->where('name', 'like', $like)
            ->when($exclude, fn ($q) => $q->where('users.id', '!=', $exclude->id))
            ->whereHas('ministries', fn ($mq) => $mq->where('ministries.church_id', $churchId))
            ->with(['ministries' => fn ($mq) => $mq->where('ministries.church_id', $churchId)->orderBy('name')])
            ->orderBy('name')
            ->limit($limit)
            ->get(['id', 'name', 'photo_url']);

        foreach ($leaders as $leader) {
            foreach ($leader->ministries as $ministry) {
                $addMinistry(
                    $byUser,
                    (int) $leader->id,
                    (string) $leader->name,
                    $leader->photo_url,
                    (int) $ministry->id,
                    (string) $ministry->name,
                    true,
                );
            }
        }

        $volunteers = Volunteer::query()
            ->where('active', true)
            ->whereNotNull('user_id')
            ->when($exclude, fn ($q) => $q->where('user_id', '!=', $exclude->id))
            ->whereHas('user', function ($uq) use ($churchId, $like) {
                $uq->where('church_id', $churchId)->where('name', 'like', $like);
            })
            ->whereHas('ministries', fn ($mq) => $mq->where('ministries.church_id', $churchId))
            ->with([
                'user:id,name,photo_url',
                'ministries' => fn ($mq) => $mq->where('ministries.church_id', $churchId)->orderBy('name'),
            ])
            ->orderBy('name')
            ->limit($limit)
            ->get();

        foreach ($volunteers as $volunteer) {
            $userId = (int) $volunteer->user_id;
            foreach ($volunteer->ministries as $ministry) {
                $addMinistry(
                    $byUser,
                    $userId,
                    (string) ($volunteer->user?->name ?: $volunteer->display_name),
                    $volunteer->user?->photo_url,
                    (int) $ministry->id,
                    (string) $ministry->name,
                    false,
                );
            }
        }

        $results = [];
        foreach ($byUser as $row) {
            $ministries = $row['ministries'];
            asort($ministries, SORT_NATURAL | SORT_FLAG_CASE);
            $ministryIds = array_keys($ministries);
            $ministryNames = array_values($ministries);
            if ($ministryIds === []) {
                continue;
            }

            $results[] = [
                'id' => $row['id'],
                'name' => $row['name'],
                'photo_url' => $row['photo_url'],
                'role' => $row['is_leader'] ? 'leader' : 'member',
                'ministry_id' => (int) $ministryIds[0],
                'ministry_name' => implode(', ', $ministryNames),
            ];
        }

        usort($results, static function (array $a, array $b): int {
            return strcasecmp($a['name'], $b['name'])
                ?: strcasecmp($a['ministry_name'], $b['ministry_name']);
        });

        return array_slice(array_values($results), 0, $limit);
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
