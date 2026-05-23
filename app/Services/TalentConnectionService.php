<?php

namespace App\Services;

use App\Models\Church;
use App\Models\TalentAuditLog;
use App\Models\TalentCategory;
use App\Models\TalentListing;
use App\Models\TalentModuleMembership;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class TalentConnectionService
{
    public function resolveChurchId(?Request $request = null): ?int
    {
        $request ??= request();

        return Church::resolveWorkingId($request)
            ?? Church::query()->where('active', true)->orderBy('name')->value('id');
    }

    public function hasModuleMembership(User $user, ?int $churchId): bool
    {
        if ($churchId === null) {
            return TalentModuleMembership::query()
                ->where('user_id', $user->id)
                ->exists();
        }

        return TalentModuleMembership::query()
            ->where('user_id', $user->id)
            ->where('church_id', $churchId)
            ->exists();
    }

    public function confirmMembership(User $user, ?int $churchId): void
    {
        TalentModuleMembership::query()->firstOrCreate(
            [
                'user_id' => $user->id,
                'church_id' => $churchId,
            ],
            ['confirmed_at' => now()],
        );
    }

    public function log(
        string $action,
        ?int $churchId = null,
        ?User $user = null,
        ?string $subjectType = null,
        ?int $subjectId = null,
        ?array $meta = null,
    ): void {
        TalentAuditLog::create([
            'church_id' => $churchId,
            'user_id' => $user?->id,
            'action' => $action,
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
            'meta' => $meta,
        ]);
    }

    public function publisherLocality(User $user): ?string
    {
        $volunteer = $user->volunteerProfile;
        if ($volunteer?->member_record_church) {
            return $volunteer->member_record_church;
        }

        return $user->church?->name;
    }

    /**
     * @return list<array{id: int, name: string}>
     */
    public function categoriesForChurch(?int $churchId): array
    {
        return TalentCategory::query()
            ->where('is_active', true)
            ->where(function ($q) use ($churchId) {
                $q->whereNull('church_id');
                if ($churchId !== null) {
                    $q->orWhere('church_id', $churchId);
                }
            })
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (TalentCategory $c) => ['id' => $c->id, 'name' => $c->name])
            ->all();
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public function typeOptions(): array
    {
        return [
            ['value' => TalentListing::TYPE_OFFER, 'label' => TalentListing::typeLabel(TalentListing::TYPE_OFFER)],
            ['value' => TalentListing::TYPE_SEEK, 'label' => TalentListing::typeLabel(TalentListing::TYPE_SEEK)],
            ['value' => TalentListing::TYPE_EXCHANGE, 'label' => TalentListing::typeLabel(TalentListing::TYPE_EXCHANGE)],
        ];
    }

    /**
     * @return list<array{value: int, label: string}>
     */
    public function publisherOptionsForChurch(int $churchId): array
    {
        return User::query()
            ->where('church_id', $churchId)
            ->orderBy('name')
            ->get(['id', 'name', 'email'])
            ->map(fn (User $u) => [
                'value' => (int) $u->id,
                'label' => trim($u->name.($u->email ? ' ('.$u->email.')' : '')),
            ])
            ->all();
    }

    public function assertPublisherBelongsToChurch(int $userId, int $churchId): User
    {
        $user = User::query()
            ->whereKey($userId)
            ->where('church_id', $churchId)
            ->first();

        if ($user === null) {
            throw ValidationException::withMessages([
                'user_id' => 'Escolha um membro cadastrado nesta igreja.',
            ]);
        }

        return $user;
    }

    /**
     * @return array<string, mixed>
     */
    public function listingPayloadRules(bool $requireMemberDeclaration = false, bool $forAdmin = false): array
    {
        $rules = [
            'title' => ['required', 'string', 'max:120'],
            'category_id' => ['required', 'exists:talent_categories,id'],
            'type' => ['required', Rule::in([
                TalentListing::TYPE_OFFER,
                TalentListing::TYPE_SEEK,
                TalentListing::TYPE_EXCHANGE,
            ])],
            'description' => ['required', 'string', 'max:5000'],
            'locality' => ['nullable', 'string', 'max:120'],
            'availability' => ['nullable', 'string', 'max:500'],
            'allows_exchange' => ['boolean'],
            'allows_negotiation' => ['boolean'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'photo' => ['nullable', 'image', 'max:5120'],
        ];

        if ($forAdmin) {
            $rules['user_id'] = ['required', 'integer', 'exists:users,id'];
            $rules['auto_approve'] = ['boolean'];
            $rules['status'] = ['nullable', Rule::in([
                TalentListing::STATUS_PENDING,
                TalentListing::STATUS_APPROVED,
                TalentListing::STATUS_PAUSED,
                TalentListing::STATUS_CLOSED,
                TalentListing::STATUS_REJECTED,
            ])];
        }

        if ($requireMemberDeclaration) {
            $rules['member_declaration'] = ['accepted'];
        }

        return $rules;
    }
}
