<?php

namespace App\Http\Controllers;

use App\Actions\SharedTalents\NotifySharedTalentsModeratorOfPendingListing;
use App\Models\SharedTalentAnnouncement;
use App\Models\SharedTalentEnrollment;
use App\Models\SharedTalentEnrollmentMessage;
use App\Models\SharedTalentListing;
use App\Models\SharedTalentReport;
use App\Models\SharedTalentReview;
use App\Models\User;
use App\Services\SharedTalentNotifier;
use App\Services\SharedTalentService;
use App\Support\SearchTerm;
use App\Support\TalentDemoListing;
use App\Support\SharedTalentEnrollmentStatus;
use App\Support\SharedTalentListingStatus;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class SharedTalentController extends Controller
{
    public function __construct(
        private readonly SharedTalentService $sharedTalents,
        private readonly SharedTalentNotifier $notifier,
    ) {}

    private function assertAuthenticated(Request $request): User
    {
        $user = $request->user();
        if ($user === null) {
            abort(403);
        }

        return $user;
    }

    private function mapListing(SharedTalentListing $listing, ?User $viewer = null, bool $detail = false): array
    {
        $listing->loadMissing(['author:id,name', 'category:id,name', 'church:id,name']);
        $isOwner = $viewer !== null && $listing->user_id === $viewer->id;
        $isNew = $listing->created_at && $listing->created_at->isAfter(now()->subDays(7));

        $data = [
            'id' => $listing->id,
            'title' => $listing->title,
            'category_name' => $listing->category?->name,
            'locality' => $listing->locality,
            'modality' => $listing->modality,
            'modality_label' => SharedTalentListing::modalityLabel($listing->modality),
            'age_range_label' => SharedTalentListing::ageRangeLabel($listing->age_range),
            'status' => $listing->status,
            'status_label' => SharedTalentListing::statusLabel($listing->status),
            'slots_total' => $listing->slots_total,
            'slots_remaining' => $listing->slotsRemaining(),
            'photo_url' => $listing->photo_url,
            'author_name' => $listing->author?->name,
            'church_name' => $listing->church?->name,
            'created_at' => $listing->created_at?->toIso8601String(),
            'is_owner' => $isOwner,
            'is_new' => $isNew,
            'has_slots' => $listing->slotsRemaining() > 0,
            'is_example' => TalentDemoListing::isDemoSharedTalentListing($listing),
        ];

        if ($detail) {
            $data['description'] = $listing->description;
            $data['available_days'] = $listing->available_days;
            $data['schedule_time'] = $listing->schedule_time;
            $data['frequency'] = $listing->frequency;
            $data['duration_estimate'] = $listing->duration_estimate;
            $data['notes'] = $isOwner && ! TalentDemoListing::isDemoSharedTalentListing($listing)
                ? $listing->notes
                : null;
            $data['age_range_notes'] = $listing->age_range_notes;
            $data['rejection_reason'] = $isOwner ? $listing->rejection_reason : null;
            $data['enrollments_count'] = $listing->enrollments()->count();
            $data['can_enroll'] = $viewer !== null
                && ! $isOwner
                && ! TalentDemoListing::isDemoSharedTalentListing($listing)
                && $listing->acceptsEnrollments();
            $data['has_enrollment'] = $viewer !== null
                && $listing->enrollments()->where('user_id', $viewer->id)->exists();
            $data['author_locality'] = $listing->author
                ? $this->sharedTalents->publisherLocality($listing->author)
                : null;
        }

        return $data;
    }

    private function mapEnrollment(SharedTalentEnrollment $enrollment, string $role): array
    {
        $enrollment->loadMissing(['user:id,name', 'listing.category', 'listing.author:id,name']);
        $listing = $enrollment->listing;

        return [
            'id' => $enrollment->id,
            'status' => $enrollment->status,
            'status_label' => SharedTalentEnrollment::statusLabel($enrollment->status),
            'message' => $enrollment->message,
            'created_at' => $enrollment->created_at?->toIso8601String(),
            'listing_id' => $listing->id,
            'listing_title' => $listing->title,
            'category_name' => $listing->category?->name,
            'counterpart_name' => $role === 'participant'
                ? $listing->author?->name
                : $enrollment->user?->name,
            'role' => $role,
            'show_url' => route('mobile.shared-talents.show', $listing->id),
            'can_review' => SharedTalentEnrollmentStatus::allowsReview($enrollment->status)
                && ! $enrollment->reviews()->where('reviewer_user_id', auth()->id())->exists(),
            'messages' => $enrollment->messages()
                ->with('user:id,name')
                ->orderBy('created_at')
                ->get()
                ->map(fn (SharedTalentEnrollmentMessage $m) => [
                    'id' => $m->id,
                    'body' => $m->body,
                    'author_name' => $m->user?->name,
                    'is_mine' => (int) $m->user_id === (int) auth()->id(),
                    'created_at' => $m->created_at?->format('d/m/Y H:i'),
                ]),
        ];
    }

    public function index(Request $request): Response
    {
        $user = $this->assertAuthenticated($request);
        $churchId = $this->sharedTalents->resolveChurchId($request);

        $query = SharedTalentListing::query()
            ->with(['author:id,name', 'category:id,name'])
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->whereIn('status', SharedTalentListingStatus::catalogStatuses());

        if ($search = trim((string) $request->input('q', ''))) {
            SearchTerm::whereAnyColumnLike($query, ['title', 'description'], $search);
        }

        if ($categoryId = $request->integer('category_id')) {
            $query->where('category_id', $categoryId);
        }

        if ($locality = trim((string) $request->input('locality', ''))) {
            $query->where('locality', 'like', '%'.$locality.'%');
        }

        if ($modality = $request->input('modality')) {
            $query->where('modality', $modality);
        }

        if ($ageRange = $request->input('age_range')) {
            $query->where('age_range', $ageRange);
        }

        $sort = is_string($request->query('sort')) ? $request->query('sort') : 'created_desc';
        match ($sort) {
            'created_asc' => $query->orderBy('created_at'),
            'title_asc' => $query->orderBy('title'),
            'title_desc' => $query->orderByDesc('title'),
            default => $query->orderByDesc('created_at'),
        };

        $listings = $query->limit(50)->get()
            ->map(fn (SharedTalentListing $l) => $this->mapListing($l, $user));

        return Inertia::render('Mobile/SharedTalent/Index', [
            'listings' => $listings,
            'categories' => $this->sharedTalents->categoriesForChurch($churchId),
            'filters' => [
                'q' => $request->input('q', ''),
                'category_id' => $request->input('category_id', ''),
                'locality' => $request->input('locality', ''),
                'modality' => $request->input('modality', ''),
                'age_range' => $request->input('age_range', ''),
                'sort' => $sort,
            ],
            'modalityOptions' => $this->sharedTalents->modalityOptions(),
            'ageRangeOptions' => $this->sharedTalents->ageRangeOptions(),
            'hasModuleMembership' => $this->sharedTalents->hasModuleMembership($user, $churchId),
        ]);
    }

    public function show(Request $request, SharedTalentListing $sharedTalentListing): Response
    {
        $user = $this->assertAuthenticated($request);
        $churchId = $this->sharedTalents->resolveChurchId($request);

        if ($churchId !== null && (int) $sharedTalentListing->church_id !== $churchId) {
            abort(404);
        }

        $isOwner = $sharedTalentListing->user_id === $user->id;
        if (! $isOwner && ! $sharedTalentListing->isVisibleInCatalog()) {
            abort(404);
        }

        return Inertia::render('Mobile/SharedTalent/Show', [
            'listing' => $this->mapListing($sharedTalentListing, $user, true),
            'reportReasons' => $this->reportReasonOptions(),
        ]);
    }

    public function myListings(Request $request): Response
    {
        $user = $this->assertAuthenticated($request);
        $churchId = $this->sharedTalents->resolveChurchId($request);

        $listings = SharedTalentListing::query()
            ->with(['category:id,name'])
            ->where('user_id', $user->id)
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->orderByDesc('created_at')
            ->get()
            ->map(function (SharedTalentListing $l) use ($user) {
                $mapped = $this->mapListing($l, $user, true);
                $mapped['category_id'] = $l->category_id;
                $mapped['description'] = $l->description;
                $mapped['modality'] = $l->modality;
                $mapped['age_range'] = $l->age_range;
                $mapped['age_range_notes'] = $l->age_range_notes;
                $mapped['available_days'] = $l->available_days;
                $mapped['schedule_time'] = $l->schedule_time;
                $mapped['frequency'] = $l->frequency;
                $mapped['duration_estimate'] = $l->duration_estimate;
                $mapped['notes'] = $l->notes;
                $mapped['slots_total'] = $l->slots_total;

                return $mapped;
            });

        return Inertia::render('Mobile/SharedTalent/MyListings', [
            'listings' => $listings,
            'categories' => $this->sharedTalents->categoriesForChurch($churchId),
            'modalityOptions' => $this->sharedTalents->modalityOptions(),
            'ageRangeOptions' => $this->sharedTalents->ageRangeOptions(),
            'hasModuleMembership' => $this->sharedTalents->hasModuleMembership($user, $churchId),
        ]);
    }

    public function myEnrollments(Request $request): Response
    {
        $user = $this->assertAuthenticated($request);
        $churchId = $this->sharedTalents->resolveChurchId($request);

        $asParticipant = SharedTalentEnrollment::query()
            ->with(['listing.category', 'listing.author:id,name'])
            ->where('user_id', $user->id)
            ->whereHas('listing', fn ($q) => $churchId !== null ? $q->where('church_id', $churchId) : $q->whereRaw('1 = 0'))
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (SharedTalentEnrollment $e) => $this->mapEnrollment($e, 'participant'));

        return Inertia::render('Mobile/SharedTalent/MyEnrollments', [
            'enrollments' => $asParticipant,
        ]);
    }

    public function enrollments(Request $request): Response
    {
        $user = $this->assertAuthenticated($request);
        $churchId = $this->sharedTalents->resolveChurchId($request);

        $enrollments = SharedTalentEnrollment::query()
            ->with(['listing', 'user:id,name'])
            ->whereHas('listing', function ($q) use ($user, $churchId) {
                $q->where('user_id', $user->id);
                if ($churchId !== null) {
                    $q->where('church_id', $churchId);
                }
            })
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (SharedTalentEnrollment $e) => $this->mapEnrollment($e, 'publisher'));

        $myListings = SharedTalentListing::query()
            ->where('user_id', $user->id)
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->whereIn('status', [
                SharedTalentListing::STATUS_ACTIVE,
                SharedTalentListing::STATUS_FULL,
                SharedTalentListing::STATUS_PAUSED,
            ])
            ->orderBy('title')
            ->get(['id', 'title'])
            ->map(fn (SharedTalentListing $l) => ['id' => $l->id, 'title' => $l->title]);

        return Inertia::render('Mobile/SharedTalent/Enrollments', [
            'enrollments' => $enrollments,
            'myListings' => $myListings,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $this->assertAuthenticated($request);
        $churchId = $this->sharedTalents->resolveChurchId($request);

        if ($churchId === null) {
            return redirect()->back()->with('error', 'Selecione a igreja de trabalho antes de publicar.');
        }

        $data = $request->validate($this->sharedTalents->listingRules());

        $this->sharedTalents->confirmMembership($user, $churchId);

        $photoPath = null;
        if ($request->hasFile('photo')) {
            $photoPath = $request->file('photo')->store('shared-talents/listings', 'public');
        }

        $listing = SharedTalentListing::create([
            'church_id' => $churchId,
            'user_id' => $user->id,
            'category_id' => $data['category_id'],
            'title' => $data['title'],
            'description' => $data['description'],
            'slots_total' => $data['slots_total'],
            'slots_filled' => 0,
            'age_range' => $data['age_range'],
            'age_range_notes' => $data['age_range_notes'] ?? null,
            'modality' => $data['modality'],
            'locality' => $data['locality'] ?? null,
            'available_days' => $data['available_days'] ?? null,
            'schedule_time' => $data['schedule_time'] ?? null,
            'frequency' => $data['frequency'] ?? null,
            'duration_estimate' => $data['duration_estimate'] ?? null,
            'notes' => $data['notes'] ?? null,
            'photo_path' => $photoPath,
            'status' => SharedTalentListing::STATUS_PENDING,
            'member_declaration_at' => now(),
        ]);

        $this->sharedTalents->log('listing.created', $churchId, $user, SharedTalentListing::class, $listing->id);
        app(NotifySharedTalentsModeratorOfPendingListing::class)->handle($listing);

        return redirect()
            ->route('mobile.shared-talents.my-listings')
            ->with('success', 'Talento enviado para análise. Você será avisado quando for aprovado.');
    }

    public function update(Request $request, SharedTalentListing $sharedTalentListing): RedirectResponse
    {
        $user = $this->assertAuthenticated($request);
        $this->authorize('updateAsOwner', $sharedTalentListing);

        $data = $request->validate($this->sharedTalents->listingRules(false));

        if ($request->hasFile('photo')) {
            if ($sharedTalentListing->photo_path) {
                Storage::disk('public')->delete($sharedTalentListing->photo_path);
            }
            $sharedTalentListing->photo_path = $request->file('photo')->store('shared-talents/listings', 'public');
        }

        $wasActive = $sharedTalentListing->status === SharedTalentListing::STATUS_ACTIVE
            || $sharedTalentListing->status === SharedTalentListing::STATUS_FULL;

        $sharedTalentListing->fill([
            'category_id' => $data['category_id'],
            'title' => $data['title'],
            'description' => $data['description'],
            'slots_total' => $data['slots_total'],
            'age_range' => $data['age_range'],
            'age_range_notes' => $data['age_range_notes'] ?? null,
            'modality' => $data['modality'],
            'locality' => $data['locality'] ?? null,
            'available_days' => $data['available_days'] ?? null,
            'schedule_time' => $data['schedule_time'] ?? null,
            'frequency' => $data['frequency'] ?? null,
            'duration_estimate' => $data['duration_estimate'] ?? null,
            'notes' => $data['notes'] ?? null,
        ]);

        if ($wasActive) {
            $sharedTalentListing->status = SharedTalentListing::STATUS_PENDING;
        }

        $sharedTalentListing->save();
        $this->sharedTalents->recalculateSlotsFilled($sharedTalentListing);

        $this->sharedTalents->log('listing.updated', $sharedTalentListing->church_id, $user, SharedTalentListing::class, $sharedTalentListing->id);

        if ($sharedTalentListing->status === SharedTalentListing::STATUS_PENDING) {
            app(NotifySharedTalentsModeratorOfPendingListing::class)->handle($sharedTalentListing);
        }

        return redirect()
            ->route('mobile.shared-talents.my-listings')
            ->with('success', 'Publicação atualizada e enviada para nova análise.');
    }

    public function updateStatus(Request $request, SharedTalentListing $sharedTalentListing): RedirectResponse
    {
        $user = $this->assertAuthenticated($request);

        if ($sharedTalentListing->user_id !== $user->id) {
            abort(403);
        }

        $data = $request->validate([
            'status' => ['required', Rule::in([
                SharedTalentListing::STATUS_PAUSED,
                SharedTalentListing::STATUS_ACTIVE,
                SharedTalentListing::STATUS_CLOSED,
            ])],
        ]);

        $newStatus = $data['status'];
        if ($newStatus === SharedTalentListing::STATUS_ACTIVE && $sharedTalentListing->status !== SharedTalentListing::STATUS_PAUSED) {
            return redirect()->back()->with('error', 'Só é possível reativar publicações pausadas.');
        }

        if ($newStatus === SharedTalentListing::STATUS_PAUSED
            && ! in_array($sharedTalentListing->status, [SharedTalentListing::STATUS_ACTIVE, SharedTalentListing::STATUS_FULL], true)) {
            return redirect()->back()->with('error', 'Só publicações ativas podem ser pausadas.');
        }

        if ($newStatus === SharedTalentListing::STATUS_ACTIVE && $sharedTalentListing->slotsRemaining() <= 0) {
            $newStatus = SharedTalentListing::STATUS_FULL;
        }

        $sharedTalentListing->update(['status' => $newStatus]);
        $this->sharedTalents->log('listing.status_'.$newStatus, $sharedTalentListing->church_id, $user, SharedTalentListing::class, $sharedTalentListing->id);

        return redirect()->back()->with('success', 'Status da publicação atualizado.');
    }

    public function enroll(Request $request, SharedTalentListing $sharedTalentListing): RedirectResponse
    {
        $user = $this->assertAuthenticated($request);

        if (! $sharedTalentListing->acceptsEnrollments() || $sharedTalentListing->user_id === $user->id) {
            abort(403);
        }

        $data = $request->validate(['message' => ['nullable', 'string', 'max:2000']]);

        $existing = SharedTalentEnrollment::query()
            ->where('listing_id', $sharedTalentListing->id)
            ->where('user_id', $user->id)
            ->first();

        if ($existing !== null) {
            return redirect()->back()->with('error', 'Você já possui uma inscrição neste talento.');
        }

        $enrollment = SharedTalentEnrollment::create([
            'listing_id' => $sharedTalentListing->id,
            'user_id' => $user->id,
            'message' => $data['message'] ?? null,
            'status' => SharedTalentEnrollment::STATUS_AWAITING_APPROVAL,
        ]);

        $this->sharedTalents->log('enrollment.created', $sharedTalentListing->church_id, $user, SharedTalentEnrollment::class, $enrollment->id);
        $this->notifier->notifyPublisherOfNewEnrollment($enrollment);

        return redirect()
            ->route('mobile.shared-talents.my-enrollments')
            ->with('success', 'Inscrição enviada! Aguarde a confirmação do responsável.');
    }

    public function updateEnrollmentStatus(Request $request, SharedTalentEnrollment $sharedTalentEnrollment): RedirectResponse
    {
        $user = $this->assertAuthenticated($request);
        $sharedTalentEnrollment->load('listing');

        $isPublisher = $sharedTalentEnrollment->listing->user_id === $user->id;
        $isParticipant = $sharedTalentEnrollment->user_id === $user->id;

        if (! $isPublisher && ! $isParticipant) {
            abort(403);
        }

        $allowed = $isPublisher
            ? SharedTalentEnrollmentStatus::publisherCanSet()
            : SharedTalentEnrollmentStatus::participantCanSet();

        $data = $request->validate([
            'status' => ['required', Rule::in($allowed)],
        ]);

        $previousStatus = $sharedTalentEnrollment->status;
        $newStatus = $data['status'];

        if ($newStatus === SharedTalentEnrollment::STATUS_CONFIRMED) {
            $this->authorize('approve', $sharedTalentEnrollment);
            try {
                $this->sharedTalents->confirmEnrollment($sharedTalentEnrollment);
            } catch (ValidationException $e) {
                return redirect()->back()->withErrors($e->errors());
            }
            $sharedTalentEnrollment->refresh();
        } elseif ($newStatus === SharedTalentEnrollment::STATUS_REJECTED) {
            $this->authorize('reject', $sharedTalentEnrollment);
            if (SharedTalentEnrollmentStatus::countsTowardSlots($previousStatus)) {
                $sharedTalentEnrollment->update(['status' => $newStatus]);
                $this->sharedTalents->recalculateSlotsFilled($sharedTalentEnrollment->listing);
            } else {
                $sharedTalentEnrollment->update(['status' => $newStatus]);
            }
        } elseif ($newStatus === SharedTalentEnrollment::STATUS_CANCELLED) {
            $this->authorize('cancelAsParticipant', $sharedTalentEnrollment);
            if (SharedTalentEnrollmentStatus::countsTowardSlots($previousStatus)) {
                $sharedTalentEnrollment->update(['status' => $newStatus]);
                $this->sharedTalents->recalculateSlotsFilled($sharedTalentEnrollment->listing);
            } else {
                $sharedTalentEnrollment->update(['status' => $newStatus]);
            }
        } else {
            $sharedTalentEnrollment->update(['status' => $newStatus]);
        }

        $this->sharedTalents->log('enrollment.status_'.$newStatus, $sharedTalentEnrollment->listing->church_id, $user, SharedTalentEnrollment::class, $sharedTalentEnrollment->id);
        $this->notifier->notifyParticipantOfEnrollmentStatus($sharedTalentEnrollment->fresh(), $user);

        return redirect()->back()->with('success', 'Status da inscrição atualizado.');
    }

    public function storeMessage(Request $request, SharedTalentEnrollment $sharedTalentEnrollment): RedirectResponse
    {
        $user = $this->assertAuthenticated($request);
        $this->authorize('sendMessage', $sharedTalentEnrollment);

        $data = $request->validate(['body' => ['required', 'string', 'max:2000']]);

        SharedTalentEnrollmentMessage::create([
            'enrollment_id' => $sharedTalentEnrollment->id,
            'user_id' => $user->id,
            'body' => $data['body'],
        ]);

        $this->notifier->notifyCounterpartOfMessage($sharedTalentEnrollment->fresh(), $user, $data['body']);

        return redirect()->back()->with('success', 'Mensagem enviada.');
    }

    public function storeAnnouncement(Request $request, SharedTalentListing $sharedTalentListing): RedirectResponse
    {
        $user = $this->assertAuthenticated($request);
        $this->authorize('sendAnnouncement', $sharedTalentListing);

        $data = $request->validate(['body' => ['required', 'string', 'max:2000']]);

        SharedTalentAnnouncement::create([
            'listing_id' => $sharedTalentListing->id,
            'user_id' => $user->id,
            'body' => $data['body'],
        ]);

        $this->notifier->notifyAnnouncementRecipients($sharedTalentListing, $data['body'], $user);
        $this->sharedTalents->log('announcement.created', $sharedTalentListing->church_id, $user, SharedTalentListing::class, $sharedTalentListing->id);

        return redirect()->back()->with('success', 'Comunicado enviado aos participantes confirmados.');
    }

    public function storeReview(Request $request, SharedTalentEnrollment $sharedTalentEnrollment): RedirectResponse
    {
        $user = $this->assertAuthenticated($request);
        $this->authorize('review', $sharedTalentEnrollment);
        $sharedTalentEnrollment->load('listing');

        $reviewedUserId = $sharedTalentEnrollment->user_id === $user->id
            ? $sharedTalentEnrollment->listing->user_id
            : $sharedTalentEnrollment->user_id;

        $data = $request->validate([
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string', 'max:1000'],
        ]);

        $review = SharedTalentReview::updateOrCreate(
            [
                'enrollment_id' => $sharedTalentEnrollment->id,
                'reviewer_user_id' => $user->id,
            ],
            [
                'listing_id' => $sharedTalentEnrollment->listing_id,
                'reviewed_user_id' => $reviewedUserId,
                'rating' => $data['rating'],
                'comment' => $data['comment'] ?? null,
                'status' => SharedTalentReview::STATUS_VISIBLE,
            ],
        );

        if ($review->wasRecentlyCreated) {
            $this->notifier->notifyReviewedUserOfNewReview($review);
        }

        return redirect()->back()->with('success', 'Avaliação registrada. Obrigado por fortalecer a comunidade!');
    }

    public function storeReport(Request $request, SharedTalentListing $sharedTalentListing): RedirectResponse
    {
        $user = $this->assertAuthenticated($request);

        $data = $request->validate([
            'reason' => ['required', Rule::in(array_keys($this->reportReasonOptions()))],
            'description' => ['nullable', 'string', 'max:2000'],
        ]);

        $report = SharedTalentReport::create([
            'church_id' => $sharedTalentListing->church_id,
            'reporter_user_id' => $user->id,
            'listing_id' => $sharedTalentListing->id,
            'reported_user_id' => $sharedTalentListing->user_id,
            'reason' => $data['reason'],
            'description' => $data['description'] ?? null,
            'status' => SharedTalentReport::STATUS_PENDING,
        ]);

        $this->sharedTalents->log('report.created', $sharedTalentListing->church_id, $user, SharedTalentReport::class, $report->id);
        $this->notifier->notifyModeratorsOfNewReport($report);

        return redirect()->back()->with('success', 'Denúncia registrada. Nossa equipe irá analisar.');
    }

    /**
     * @return array<string, string>
     */
    private function reportReasonOptions(): array
    {
        return [
            SharedTalentReport::REASON_INAPPROPRIATE_CONTENT => SharedTalentReport::reasonLabel(SharedTalentReport::REASON_INAPPROPRIATE_CONTENT),
            SharedTalentReport::REASON_IMPROPER_CONDUCT => SharedTalentReport::reasonLabel(SharedTalentReport::REASON_IMPROPER_CONDUCT),
            SharedTalentReport::REASON_COMMERCIAL_PROMOTION => SharedTalentReport::reasonLabel(SharedTalentReport::REASON_COMMERCIAL_PROMOTION),
            SharedTalentReport::REASON_FALSE_INFO => SharedTalentReport::reasonLabel(SharedTalentReport::REASON_FALSE_INFO),
            SharedTalentReport::REASON_OTHER => SharedTalentReport::reasonLabel(SharedTalentReport::REASON_OTHER),
        ];
    }
}
