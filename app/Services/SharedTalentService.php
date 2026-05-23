<?php

namespace App\Services;

use App\Models\Church;
use App\Models\SharedTalentAuditLog;
use App\Models\SharedTalentCategory;
use App\Models\SharedTalentEnrollment;
use App\Models\SharedTalentListing;
use App\Models\SharedTalentModuleMembership;
use App\Models\User;
use App\Support\SharedTalentEnrollmentStatus;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class SharedTalentService
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
            return SharedTalentModuleMembership::query()
                ->where('user_id', $user->id)
                ->exists();
        }

        return SharedTalentModuleMembership::query()
            ->where('user_id', $user->id)
            ->where('church_id', $churchId)
            ->exists();
    }

    public function confirmMembership(User $user, ?int $churchId): void
    {
        SharedTalentModuleMembership::query()->firstOrCreate(
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
        SharedTalentAuditLog::create([
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
        return SharedTalentCategory::query()
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
            ->map(fn (SharedTalentCategory $c) => ['id' => $c->id, 'name' => $c->name])
            ->all();
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public function modalityOptions(): array
    {
        return [
            ['value' => SharedTalentListing::MODALITY_IN_PERSON, 'label' => SharedTalentListing::modalityLabel(SharedTalentListing::MODALITY_IN_PERSON)],
            ['value' => SharedTalentListing::MODALITY_ONLINE, 'label' => SharedTalentListing::modalityLabel(SharedTalentListing::MODALITY_ONLINE)],
            ['value' => SharedTalentListing::MODALITY_HYBRID, 'label' => SharedTalentListing::modalityLabel(SharedTalentListing::MODALITY_HYBRID)],
        ];
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public function ageRangeOptions(): array
    {
        return [
            ['value' => SharedTalentListing::AGE_ALL, 'label' => SharedTalentListing::ageRangeLabel(SharedTalentListing::AGE_ALL)],
            ['value' => SharedTalentListing::AGE_CHILDREN, 'label' => SharedTalentListing::ageRangeLabel(SharedTalentListing::AGE_CHILDREN)],
            ['value' => SharedTalentListing::AGE_TEENS, 'label' => SharedTalentListing::ageRangeLabel(SharedTalentListing::AGE_TEENS)],
            ['value' => SharedTalentListing::AGE_ADULTS, 'label' => SharedTalentListing::ageRangeLabel(SharedTalentListing::AGE_ADULTS)],
            ['value' => SharedTalentListing::AGE_SENIORS, 'label' => SharedTalentListing::ageRangeLabel(SharedTalentListing::AGE_SENIORS)],
            ['value' => SharedTalentListing::AGE_CUSTOM, 'label' => SharedTalentListing::ageRangeLabel(SharedTalentListing::AGE_CUSTOM)],
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
    public function listingRules(bool $requireDeclaration = true, bool $forAdmin = false): array
    {
        $rules = [
            'title' => ['required', 'string', 'max:120'],
            'category_id' => ['required', 'exists:shared_talent_categories,id'],
            'description' => ['required', 'string', 'max:5000'],
            'slots_total' => ['required', 'integer', 'min:1', 'max:100'],
            'age_range' => ['required', Rule::in([
                SharedTalentListing::AGE_ALL,
                SharedTalentListing::AGE_CHILDREN,
                SharedTalentListing::AGE_TEENS,
                SharedTalentListing::AGE_ADULTS,
                SharedTalentListing::AGE_SENIORS,
                SharedTalentListing::AGE_CUSTOM,
            ])],
            'age_range_notes' => ['nullable', 'string', 'max:200'],
            'modality' => ['required', Rule::in([
                SharedTalentListing::MODALITY_IN_PERSON,
                SharedTalentListing::MODALITY_ONLINE,
                SharedTalentListing::MODALITY_HYBRID,
            ])],
            'locality' => ['nullable', 'string', 'max:120'],
            'available_days' => ['nullable', 'string', 'max:500'],
            'schedule_time' => ['nullable', 'string', 'max:120'],
            'frequency' => ['nullable', 'string', 'max:120'],
            'duration_estimate' => ['nullable', 'string', 'max:120'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'photo' => ['nullable', 'image', 'max:5120'],
        ];

        if ($forAdmin) {
            $rules['user_id'] = ['required', 'integer', 'exists:users,id'];
            $rules['auto_approve'] = ['boolean'];
        }

        if ($requireDeclaration) {
            $rules['member_declaration'] = ['accepted'];
        }

        return $rules;
    }

    public function recalculateSlotsFilled(SharedTalentListing $listing): void
    {
        $filled = $listing->enrollments()
            ->whereIn('status', [
                SharedTalentEnrollment::STATUS_CONFIRMED,
                SharedTalentEnrollment::STATUS_IN_PROGRESS,
                SharedTalentEnrollment::STATUS_COMPLETED,
            ])
            ->count();

        $listing->slots_filled = $filled;

        if ($filled >= $listing->slots_total && $listing->status === SharedTalentListing::STATUS_ACTIVE) {
            $listing->status = SharedTalentListing::STATUS_FULL;
        } elseif ($listing->status === SharedTalentListing::STATUS_FULL && $filled < $listing->slots_total) {
            $listing->status = SharedTalentListing::STATUS_ACTIVE;
        }

        $listing->save();
    }

    public function confirmEnrollment(SharedTalentEnrollment $enrollment): void
    {
        DB::transaction(function () use ($enrollment) {
            $listing = $enrollment->listing()->lockForUpdate()->first();
            if ($listing === null) {
                return;
            }

            if ($listing->slotsRemaining() <= 0) {
                throw ValidationException::withMessages([
                    'status' => 'Não há vagas disponíveis para esta publicação.',
                ]);
            }

            $enrollment->update(['status' => SharedTalentEnrollment::STATUS_CONFIRMED]);
            $this->recalculateSlotsFilled($listing);
        });
    }

    public function releaseEnrollmentSlot(SharedTalentEnrollment $enrollment): void
    {
        DB::transaction(function () use ($enrollment) {
            $listing = $enrollment->listing()->lockForUpdate()->first();
            if ($listing === null) {
                return;
            }

            if (SharedTalentEnrollmentStatus::countsTowardSlots($enrollment->status)) {
                $this->recalculateSlotsFilled($listing);
            }
        });
    }
}
