<?php

namespace App\Http\Controllers;

use App\Actions\Talents\NotifyTalentsModeratorOfPendingListing;
use App\Models\TalentCategory;
use App\Models\TalentInterest;
use App\Models\TalentInterestMessage;
use App\Models\TalentListing;
use App\Models\TalentReport;
use App\Models\TalentReview;
use App\Models\User;
use App\Services\TalentConnectionNotifier;
use App\Services\TalentConnectionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class TalentConnectionController extends Controller
{
    public function __construct(
        private readonly TalentConnectionService $talents,
        private readonly TalentConnectionNotifier $notifier,
    ) {}

    private function assertAuthenticated(Request $request): User
    {
        $user = $request->user();
        if ($user === null) {
            abort(403);
        }

        return $user;
    }

    private function listingRules(bool $requireDeclaration = true): array
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

        if ($requireDeclaration) {
            $rules['member_declaration'] = ['accepted'];
        }

        return $rules;
    }

    private function categoriesForChurch(?int $churchId): array
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

    private function mapListing(TalentListing $listing, ?User $viewer = null, bool $detail = false): array
    {
        $listing->loadMissing(['author:id,name', 'category:id,name', 'church:id,name']);

        $isOwner = $viewer !== null && $listing->user_id === $viewer->id;
        $data = [
            'id' => $listing->id,
            'title' => $listing->title,
            'type' => $listing->type,
            'type_label' => TalentListing::typeLabel($listing->type),
            'category_name' => $listing->category?->name,
            'locality' => $listing->locality,
            'status' => $listing->status,
            'status_label' => TalentListing::statusLabel($listing->status),
            'allows_exchange' => $listing->allows_exchange,
            'allows_negotiation' => $listing->allows_negotiation,
            'photo_url' => $listing->photo_url,
            'author_name' => $listing->author?->name,
            'church_name' => $listing->church?->name,
            'created_at' => $listing->created_at?->toIso8601String(),
            'is_owner' => $isOwner,
        ];

        if ($detail) {
            $data['description'] = $listing->description;
            $data['availability'] = $listing->availability;
            $data['notes'] = $listing->notes;
            $data['rejection_reason'] = $isOwner ? $listing->rejection_reason : null;
            $data['interests_count'] = $listing->interests()->count();
            $data['can_express_interest'] = $viewer !== null
                && ! $isOwner
                && $listing->isVisibleToMembers();
            $data['has_interest'] = $viewer !== null
                && $listing->interests()->where('user_id', $viewer->id)->exists();
            $data['author_locality'] = $this->talents->publisherLocality($listing->author);
        }

        return $data;
    }

    public function index(Request $request): Response
    {
        $user = $this->assertAuthenticated($request);
        $churchId = $this->talents->resolveChurchId($request);

        $query = TalentListing::query()
            ->with(['author:id,name', 'category:id,name'])
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->where('status', TalentListing::STATUS_APPROVED);

        if ($search = trim((string) $request->input('q', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', '%'.$search.'%')
                    ->orWhere('description', 'like', '%'.$search.'%');
            });
        }

        if ($categoryId = $request->integer('category_id')) {
            $query->where('category_id', $categoryId);
        }

        if ($locality = trim((string) $request->input('locality', ''))) {
            $query->where('locality', 'like', '%'.$locality.'%');
        }

        if ($type = $request->input('type')) {
            $query->where('type', $type);
        }

        $listings = $query->orderByDesc('created_at')->limit(50)->get()
            ->map(fn (TalentListing $l) => $this->mapListing($l, $user));

        return Inertia::render('Mobile/TalentConnection/Index', [
            'listings' => $listings,
            'categories' => $this->categoriesForChurch($churchId),
            'filters' => [
                'q' => $request->input('q', ''),
                'category_id' => $request->input('category_id', ''),
                'locality' => $request->input('locality', ''),
                'type' => $request->input('type', ''),
            ],
            'typeOptions' => [
                ['value' => TalentListing::TYPE_OFFER, 'label' => TalentListing::typeLabel(TalentListing::TYPE_OFFER)],
                ['value' => TalentListing::TYPE_SEEK, 'label' => TalentListing::typeLabel(TalentListing::TYPE_SEEK)],
                ['value' => TalentListing::TYPE_EXCHANGE, 'label' => TalentListing::typeLabel(TalentListing::TYPE_EXCHANGE)],
            ],
            'hasModuleMembership' => $this->talents->hasModuleMembership($user, $churchId),
        ]);
    }

    public function show(Request $request, TalentListing $talentListing): Response
    {
        $user = $this->assertAuthenticated($request);
        $churchId = $this->talents->resolveChurchId($request);

        if ($churchId !== null && (int) $talentListing->church_id !== $churchId) {
            abort(404);
        }

        $isOwner = $talentListing->user_id === $user->id;
        if (! $isOwner && ! $talentListing->isVisibleToMembers()) {
            abort(404);
        }

        return Inertia::render('Mobile/TalentConnection/Show', [
            'listing' => $this->mapListing($talentListing, $user, true),
            'reportReasons' => $this->reportReasonOptions(),
        ]);
    }

    public function myListings(Request $request): Response
    {
        $user = $this->assertAuthenticated($request);
        $churchId = $this->talents->resolveChurchId($request);

        $listings = TalentListing::query()
            ->with(['category:id,name'])
            ->where('user_id', $user->id)
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->orderByDesc('created_at')
            ->get()
            ->map(function (TalentListing $l) use ($user) {
                $mapped = $this->mapListing($l, $user);
                $mapped['category_id'] = $l->category_id;
                $mapped['type'] = $l->type;
                $mapped['description'] = $l->description;
                $mapped['availability'] = $l->availability;
                $mapped['notes'] = $l->notes;
                $mapped['allows_exchange'] = $l->allows_exchange;
                $mapped['allows_negotiation'] = $l->allows_negotiation;
                $mapped['locality'] = $l->locality;

                return $mapped;
            });

        return Inertia::render('Mobile/TalentConnection/MyListings', [
            'listings' => $listings,
            'categories' => $this->categoriesForChurch($churchId),
            'hasModuleMembership' => $this->talents->hasModuleMembership($user, $churchId),
        ]);
    }

    public function myInterests(Request $request): Response
    {
        $user = $this->assertAuthenticated($request);
        $churchId = $this->talents->resolveChurchId($request);

        $asInterested = TalentInterest::query()
            ->with(['listing.category', 'listing.author:id,name'])
            ->where('user_id', $user->id)
            ->whereHas('listing', fn ($q) => $churchId !== null ? $q->where('church_id', $churchId) : $q->whereRaw('1 = 0'))
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (TalentInterest $i) => $this->mapInterest($i, 'interested'));

        $asPublisher = TalentInterest::query()
            ->with(['listing', 'user:id,name'])
            ->whereHas('listing', function ($q) use ($user, $churchId) {
                $q->where('user_id', $user->id);
                if ($churchId !== null) {
                    $q->where('church_id', $churchId);
                }
            })
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (TalentInterest $i) => $this->mapInterest($i, 'publisher'));

        return Inertia::render('Mobile/TalentConnection/MyInterests', [
            'asInterested' => $asInterested,
            'asPublisher' => $asPublisher,
        ]);
    }

    private function mapInterest(TalentInterest $interest, string $role): array
    {
        $listing = $interest->listing;

        return [
            'id' => $interest->id,
            'status' => $interest->status,
            'status_label' => TalentInterest::statusLabel($interest->status),
            'message' => $interest->message,
            'created_at' => $interest->created_at?->toIso8601String(),
            'listing_id' => $listing->id,
            'listing_title' => $listing->title,
            'listing_type_label' => TalentListing::typeLabel($listing->type),
            'category_name' => $listing->category?->name,
            'counterpart_name' => $role === 'interested'
                ? $listing->author?->name
                : $interest->user?->name,
            'role' => $role,
            'show_url' => route('mobile.talents.show', $listing->id),
            'can_review' => $interest->status === TalentInterest::STATUS_COMPLETED
                && ! $interest->reviews()->where('reviewer_user_id', auth()->id())->exists(),
        ];
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $this->assertAuthenticated($request);
        $churchId = $this->talents->resolveChurchId($request);

        if ($churchId === null) {
            return redirect()->back()->with('error', 'Selecione a igreja de trabalho antes de publicar.');
        }

        $data = $request->validate($this->listingRules());

        $this->talents->confirmMembership($user, $churchId);

        $photoPath = null;
        if ($request->hasFile('photo')) {
            $photoPath = $request->file('photo')->store('talents/listings', 'public');
        }

        $listing = TalentListing::create([
            'church_id' => $churchId,
            'user_id' => $user->id,
            'category_id' => $data['category_id'],
            'title' => $data['title'],
            'type' => $data['type'],
            'description' => $data['description'],
            'locality' => $data['locality'] ?? null,
            'availability' => $data['availability'] ?? null,
            'allows_exchange' => $request->boolean('allows_exchange'),
            'allows_negotiation' => $request->boolean('allows_negotiation', true),
            'notes' => $data['notes'] ?? null,
            'photo_path' => $photoPath,
            'status' => TalentListing::STATUS_PENDING,
            'member_declaration_at' => now(),
        ]);

        $this->talents->log('listing.created', $churchId, $user, TalentListing::class, $listing->id);

        app(NotifyTalentsModeratorOfPendingListing::class)->handle($listing);

        return redirect()
            ->route('mobile.talents.my-listings')
            ->with('success', 'Publicação enviada para análise. Você será avisado quando for aprovada.');
    }

    public function update(Request $request, TalentListing $talentListing): RedirectResponse
    {
        $user = $this->assertAuthenticated($request);

        if ($talentListing->user_id !== $user->id || ! $talentListing->isEditableByOwner()) {
            abort(403);
        }

        $data = $request->validate($this->listingRules(false));

        if ($request->hasFile('photo')) {
            if ($talentListing->photo_path) {
                Storage::disk('public')->delete($talentListing->photo_path);
            }
            $talentListing->photo_path = $request->file('photo')->store('talents/listings', 'public');
        }

        $talentListing->fill([
            'category_id' => $data['category_id'],
            'title' => $data['title'],
            'type' => $data['type'],
            'description' => $data['description'],
            'locality' => $data['locality'] ?? null,
            'availability' => $data['availability'] ?? null,
            'allows_exchange' => $request->boolean('allows_exchange'),
            'allows_negotiation' => $request->boolean('allows_negotiation', true),
            'notes' => $data['notes'] ?? null,
        ]);

        if ($talentListing->status === TalentListing::STATUS_APPROVED) {
            $talentListing->status = TalentListing::STATUS_PENDING;
        }

        $talentListing->save();

        $this->talents->log('listing.updated', $talentListing->church_id, $user, TalentListing::class, $talentListing->id);

        if ($talentListing->status === TalentListing::STATUS_PENDING) {
            app(NotifyTalentsModeratorOfPendingListing::class)->handle($talentListing);
        }

        return redirect()
            ->route('mobile.talents.my-listings')
            ->with('success', 'Publicação atualizada e enviada para nova análise.');
    }

    public function updateStatus(Request $request, TalentListing $talentListing): RedirectResponse
    {
        $user = $this->assertAuthenticated($request);

        if ($talentListing->user_id !== $user->id) {
            abort(403);
        }

        $data = $request->validate([
            'status' => ['required', Rule::in([
                TalentListing::STATUS_PAUSED,
                TalentListing::STATUS_APPROVED,
                TalentListing::STATUS_CLOSED,
            ])],
        ]);

        $newStatus = $data['status'];
        if ($newStatus === TalentListing::STATUS_APPROVED && $talentListing->status !== TalentListing::STATUS_PAUSED) {
            return redirect()->back()->with('error', 'Só é possível reativar publicações pausadas.');
        }

        if ($newStatus === TalentListing::STATUS_PAUSED && $talentListing->status !== TalentListing::STATUS_APPROVED) {
            return redirect()->back()->with('error', 'Só publicações aprovadas podem ser pausadas.');
        }

        $talentListing->update(['status' => $newStatus]);

        $this->talents->log('listing.status_'.$newStatus, $talentListing->church_id, $user, TalentListing::class, $talentListing->id);

        if ($newStatus === TalentListing::STATUS_PAUSED) {
            $this->notifier->notifyInterestedPartiesOfListingUnavailable($talentListing, 'paused');
        } elseif ($newStatus === TalentListing::STATUS_CLOSED) {
            $this->notifier->notifyInterestedPartiesOfListingUnavailable($talentListing, 'closed');
        }

        return redirect()->back()->with('success', 'Status da publicação atualizado.');
    }

    public function destroy(Request $request, TalentListing $talentListing): RedirectResponse
    {
        $user = $this->assertAuthenticated($request);

        if ($talentListing->user_id !== $user->id) {
            abort(403);
        }

        if (! in_array($talentListing->status, [
            TalentListing::STATUS_PENDING,
            TalentListing::STATUS_REJECTED,
            TalentListing::STATUS_CLOSED,
            TalentListing::STATUS_PAUSED,
        ], true)) {
            return redirect()->back()->with('error', 'Encerre a publicação antes de excluir.');
        }

        if ($talentListing->photo_path) {
            Storage::disk('public')->delete($talentListing->photo_path);
        }

        $churchId = $talentListing->church_id;
        $id = $talentListing->id;
        $talentListing->delete();

        $this->talents->log('listing.deleted', $churchId, $user, TalentListing::class, $id);

        return redirect()
            ->route('mobile.talents.my-listings')
            ->with('success', 'Publicação excluída.');
    }

    public function expressInterest(Request $request, TalentListing $talentListing): RedirectResponse
    {
        $user = $this->assertAuthenticated($request);

        if (! $talentListing->isVisibleToMembers() || $talentListing->user_id === $user->id) {
            abort(403);
        }

        $data = $request->validate([
            'message' => ['nullable', 'string', 'max:2000'],
        ]);

        $interest = TalentInterest::firstOrCreate(
            ['listing_id' => $talentListing->id, 'user_id' => $user->id],
            ['message' => $data['message'] ?? null, 'status' => TalentInterest::STATUS_PENDING],
        );

        if ($interest->wasRecentlyCreated) {
            $this->talents->log('interest.created', $talentListing->church_id, $user, TalentInterest::class, $interest->id);
            $this->notifier->notifyPublisherOfNewInterest($interest);
        }

        return redirect()
            ->route('mobile.talents.my-interests')
            ->with('success', 'Interesse registrado! Entre em contato para combinar os detalhes.');
    }

    public function updateInterestStatus(Request $request, TalentInterest $talentInterest): RedirectResponse
    {
        $user = $this->assertAuthenticated($request);
        $talentInterest->load('listing');

        $isPublisher = $talentInterest->listing->user_id === $user->id;
        $isInterested = $talentInterest->user_id === $user->id;

        if (! $isPublisher && ! $isInterested) {
            abort(403);
        }

        $data = $request->validate([
            'status' => ['required', Rule::in([
                TalentInterest::STATUS_IN_CONVERSATION,
                TalentInterest::STATUS_AGREED,
                TalentInterest::STATUS_COMPLETED,
                TalentInterest::STATUS_CANCELLED,
            ])],
        ]);

        $talentInterest->update(['status' => $data['status']]);

        $this->talents->log('interest.status_'.$data['status'], $talentInterest->listing->church_id, $user, TalentInterest::class, $talentInterest->id);

        $this->notifier->notifyCounterpartOfInterestStatusChange($talentInterest->fresh(), $user);

        return redirect()->back()->with('success', 'Status da conexão atualizado.');
    }

    public function storeMessage(Request $request, TalentInterest $talentInterest): RedirectResponse
    {
        $user = $this->assertAuthenticated($request);
        $talentInterest->load('listing');

        $isParticipant = $talentInterest->user_id === $user->id
            || $talentInterest->listing->user_id === $user->id;

        if (! $isParticipant) {
            abort(403);
        }

        $data = $request->validate(['body' => ['required', 'string', 'max:2000']]);

        TalentInterestMessage::create([
            'interest_id' => $talentInterest->id,
            'user_id' => $user->id,
            'body' => $data['body'],
        ]);

        if ($talentInterest->status === TalentInterest::STATUS_PENDING) {
            $talentInterest->update(['status' => TalentInterest::STATUS_IN_CONVERSATION]);
        }

        $this->notifier->notifyCounterpartOfInterestMessage($talentInterest->fresh(), $user, $data['body']);

        return redirect()->back()->with('success', 'Mensagem enviada.');
    }

    public function storeReview(Request $request, TalentInterest $talentInterest): RedirectResponse
    {
        $user = $this->assertAuthenticated($request);
        $talentInterest->load('listing');

        if ($talentInterest->status !== TalentInterest::STATUS_COMPLETED) {
            return redirect()->back()->with('error', 'Avaliações só após a conexão ser concluída.');
        }

        $isInterested = $talentInterest->user_id === $user->id;
        $isPublisher = $talentInterest->listing->user_id === $user->id;

        if (! $isInterested && ! $isPublisher) {
            abort(403);
        }

        $reviewedUserId = $isInterested
            ? $talentInterest->listing->user_id
            : $talentInterest->user_id;

        $data = $request->validate([
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string', 'max:1000'],
        ]);

        $review = TalentReview::updateOrCreate(
            [
                'interest_id' => $talentInterest->id,
                'reviewer_user_id' => $user->id,
            ],
            [
                'listing_id' => $talentInterest->listing_id,
                'reviewed_user_id' => $reviewedUserId,
                'rating' => $data['rating'],
                'comment' => $data['comment'] ?? null,
                'status' => TalentReview::STATUS_VISIBLE,
            ],
        );

        if ($review->wasRecentlyCreated) {
            $this->notifier->notifyReviewedUserOfNewReview($review);
        }

        return redirect()->back()->with('success', 'Avaliação registrada. Obrigado por fortalecer a comunidade!');
    }

    public function storeReport(Request $request, TalentListing $talentListing): RedirectResponse
    {
        $user = $this->assertAuthenticated($request);

        $data = $request->validate([
            'reason' => ['required', Rule::in(array_keys($this->reportReasonOptions()))],
            'description' => ['nullable', 'string', 'max:2000'],
        ]);

        $report = TalentReport::create([
            'church_id' => $talentListing->church_id,
            'reporter_user_id' => $user->id,
            'listing_id' => $talentListing->id,
            'reported_user_id' => $talentListing->user_id,
            'reason' => $data['reason'],
            'description' => $data['description'] ?? null,
            'status' => TalentReport::STATUS_PENDING,
        ]);

        $this->talents->log('report.created', $talentListing->church_id, $user, TalentReport::class, $report->id);

        $this->notifier->notifyModeratorsOfNewReport($report);

        return redirect()->back()->with('success', 'Denúncia registrada. Nossa equipe irá analisar.');
    }

    /**
     * @return array<string, string>
     */
    private function reportReasonOptions(): array
    {
        return [
            TalentReport::REASON_INAPPROPRIATE_CONTENT => TalentReport::reasonLabel(TalentReport::REASON_INAPPROPRIATE_CONTENT),
            TalentReport::REASON_IMPROPER_SERVICE => TalentReport::reasonLabel(TalentReport::REASON_IMPROPER_SERVICE),
            TalentReport::REASON_FALSE_INFO => TalentReport::reasonLabel(TalentReport::REASON_FALSE_INFO),
            TalentReport::REASON_COMMERCIAL_ABUSE => TalentReport::reasonLabel(TalentReport::REASON_COMMERCIAL_ABUSE),
            TalentReport::REASON_INAPPROPRIATE_CONDUCT => TalentReport::reasonLabel(TalentReport::REASON_INAPPROPRIATE_CONDUCT),
            TalentReport::REASON_OTHER => TalentReport::reasonLabel(TalentReport::REASON_OTHER),
        ];
    }
}
