<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\SharedTalentAuditLog;
use App\Models\SharedTalentCategory;
use App\Models\SharedTalentEnrollment;
use App\Models\SharedTalentListing;
use App\Models\SharedTalentReport;
use App\Models\SharedTalentReview;
use App\Services\SharedTalentNotifier;
use App\Services\SharedTalentService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SharedTalentAdminController extends Controller
{
    public function __construct(
        private readonly SharedTalentService $sharedTalents,
        private readonly SharedTalentNotifier $notifier,
    ) {}

    private function currentChurchId(): ?int
    {
        return Church::resolveWorkingId(request());
    }

    private function assertCanModerate(Request $request): void
    {
        $user = $request->user();
        if ($user === null) {
            abort(403);
        }

        if ($user->can('shared_talents.moderate') || $user->can('shared_talents.manage')
            || $user->hasAnyRole(['super_admin', 'admin'])) {
            return;
        }

        abort(403);
    }

    private function assertCanManage(Request $request): void
    {
        $user = $request->user();
        if ($user === null) {
            abort(403);
        }

        if ($user->can('shared_talents.manage') || $user->hasAnyRole(['super_admin', 'admin'])) {
            return;
        }

        abort(403);
    }

    public function dashboard(Request $request): Response
    {
        $this->assertCanModerate($request);
        $churchId = $this->currentChurchId();

        $listingQuery = SharedTalentListing::query()
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'));

        $reportQuery = SharedTalentReport::query()
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'));

        $topListings = (clone $listingQuery)
            ->withCount(['enrollments' => fn ($q) => $q->whereNotIn('status', ['cancelled', 'rejected'])])
            ->whereIn('status', [SharedTalentListing::STATUS_ACTIVE, SharedTalentListing::STATUS_FULL])
            ->orderByDesc('enrollments_count')
            ->limit(5)
            ->get(['id', 'title'])
            ->map(fn (SharedTalentListing $l) => [
                'id' => $l->id,
                'title' => $l->title,
                'enrollments_count' => $l->enrollments_count,
            ]);

        return Inertia::render('SharedTalent/Admin/Dashboard', [
            'metrics' => [
                'listings_active' => (clone $listingQuery)->whereIn('status', [
                    SharedTalentListing::STATUS_ACTIVE,
                    SharedTalentListing::STATUS_FULL,
                ])->count(),
                'listings_pending' => (clone $listingQuery)->where('status', SharedTalentListing::STATUS_PENDING)->count(),
                'enrollments_total' => SharedTalentEnrollment::query()
                    ->whereHas('listing', fn ($q) => $churchId !== null ? $q->where('church_id', $churchId) : $q->whereRaw('1 = 0'))
                    ->count(),
                'enrollments_pending' => SharedTalentEnrollment::query()
                    ->where('status', SharedTalentEnrollment::STATUS_AWAITING_APPROVAL)
                    ->whereHas('listing', fn ($q) => $churchId !== null ? $q->where('church_id', $churchId) : $q->whereRaw('1 = 0'))
                    ->count(),
                'reports_pending' => (clone $reportQuery)->where('status', SharedTalentReport::STATUS_PENDING)->count(),
                'listings_closed' => (clone $listingQuery)->where('status', SharedTalentListing::STATUS_CLOSED)->count(),
            ],
            'topListings' => $topListings,
            'canModerate' => $request->user()?->can('shared_talents.moderate')
                || $request->user()?->hasAnyRole(['super_admin', 'admin']),
        ]);
    }

    public function listings(Request $request): Response
    {
        $this->assertCanModerate($request);
        $churchId = $this->currentChurchId();
        $status = $request->input('status', SharedTalentListing::STATUS_PENDING);

        $listings = SharedTalentListing::query()
            ->with(['author:id,name', 'category:id,name'])
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->orderByDesc('created_at')
            ->limit(100)
            ->get()
            ->map(fn (SharedTalentListing $l) => [
                'id' => $l->id,
                'user_id' => $l->user_id,
                'title' => $l->title,
                'category_id' => $l->category_id,
                'category_name' => $l->category?->name,
                'description' => $l->description,
                'locality' => $l->locality,
                'modality' => $l->modality,
                'modality_label' => SharedTalentListing::modalityLabel($l->modality),
                'slots_total' => $l->slots_total,
                'slots_filled' => $l->slots_filled,
                'author_name' => $l->author?->name,
                'status' => $l->status,
                'status_label' => SharedTalentListing::statusLabel($l->status),
                'created_at' => $l->created_at?->format('d/m/Y H:i'),
                'rejection_reason' => $l->rejection_reason,
            ]);

        return Inertia::render('SharedTalent/Admin/Listings', [
            'listings' => $listings,
            'statusFilter' => $status,
            'categories' => $this->sharedTalents->categoriesForChurch($churchId),
            'modalityOptions' => $this->sharedTalents->modalityOptions(),
            'ageRangeOptions' => $this->sharedTalents->ageRangeOptions(),
            'publisherOptions' => $churchId !== null ? $this->sharedTalents->publisherOptionsForChurch($churchId) : [],
            'statusOptions' => [
                ['value' => SharedTalentListing::STATUS_PENDING, 'label' => SharedTalentListing::statusLabel(SharedTalentListing::STATUS_PENDING)],
                ['value' => SharedTalentListing::STATUS_ACTIVE, 'label' => SharedTalentListing::statusLabel(SharedTalentListing::STATUS_ACTIVE)],
                ['value' => SharedTalentListing::STATUS_REJECTED, 'label' => SharedTalentListing::statusLabel(SharedTalentListing::STATUS_REJECTED)],
                ['value' => 'all', 'label' => 'Todas'],
            ],
        ]);
    }

    public function storeListing(Request $request): RedirectResponse
    {
        $this->assertCanModerate($request);
        $churchId = $this->currentChurchId();
        if ($churchId === null) {
            return redirect()->back()->with('error', 'Selecione a igreja de trabalho antes de cadastrar.');
        }

        $admin = $request->user();
        $data = $request->validate($this->sharedTalents->listingRules(forAdmin: true));

        $publisher = $this->sharedTalents->assertPublisherBelongsToChurch((int) $data['user_id'], $churchId);
        $this->sharedTalents->confirmMembership($publisher, $churchId);

        $photoPath = null;
        if ($request->hasFile('photo')) {
            $photoPath = $request->file('photo')->store('shared-talents/listings', 'public');
        }

        $autoApprove = $request->boolean('auto_approve', true);
        $status = $autoApprove ? SharedTalentListing::STATUS_ACTIVE : SharedTalentListing::STATUS_PENDING;

        $listing = SharedTalentListing::create([
            'church_id' => $churchId,
            'user_id' => $publisher->id,
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
            'status' => $status,
            'member_declaration_at' => now(),
            'moderated_by' => $autoApprove ? $admin?->id : null,
            'moderated_at' => $autoApprove ? now() : null,
        ]);

        $this->sharedTalents->log('listing.admin_created', $churchId, $admin, SharedTalentListing::class, $listing->id);

        if ($status === SharedTalentListing::STATUS_PENDING) {
            $this->notifier->notifyModeratorsOfPendingListing($listing);
        } elseif ((int) $publisher->id !== (int) $admin?->id) {
            $this->notifier->notifyPublisherOfListingModeration($listing, 'approved');
        }

        return redirect()
            ->route('shared-talents.admin.listings', ['status' => $status])
            ->with('success', $autoApprove ? 'Talento cadastrado e publicado.' : 'Talento cadastrado e enviado para análise.');
    }

    public function updateListing(Request $request, SharedTalentListing $sharedTalentListing): RedirectResponse
    {
        $this->assertCanModerate($request);
        $churchId = $this->currentChurchId();

        if ($churchId !== null && (int) $sharedTalentListing->church_id !== $churchId) {
            abort(404);
        }

        $admin = $request->user();
        $data = $request->validate($this->sharedTalents->listingRules(forAdmin: true));

        $publisher = $this->sharedTalents->assertPublisherBelongsToChurch((int) $data['user_id'], (int) $sharedTalentListing->church_id);

        if ($request->hasFile('photo')) {
            if ($sharedTalentListing->photo_path) {
                Storage::disk('public')->delete($sharedTalentListing->photo_path);
            }
            $sharedTalentListing->photo_path = $request->file('photo')->store('shared-talents/listings', 'public');
        }

        $sharedTalentListing->fill([
            'user_id' => $publisher->id,
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

        $sharedTalentListing->save();
        $this->sharedTalents->recalculateSlotsFilled($sharedTalentListing);

        $this->sharedTalents->log('listing.admin_updated', $sharedTalentListing->church_id, $admin, SharedTalentListing::class, $sharedTalentListing->id);

        return redirect()->back()->with('success', 'Publicação atualizada.');
    }

    public function moderateListing(Request $request, SharedTalentListing $sharedTalentListing): RedirectResponse
    {
        $this->assertCanModerate($request);
        $churchId = $this->currentChurchId();

        if ($churchId !== null && (int) $sharedTalentListing->church_id !== $churchId) {
            abort(404);
        }

        $data = $request->validate([
            'action' => ['required', Rule::in(['approve', 'reject', 'suspend'])],
            'rejection_reason' => ['nullable', 'string', 'max:1000'],
        ]);

        $user = $request->user();

        if ($data['action'] === 'approve') {
            $status = $sharedTalentListing->slotsRemaining() > 0
                ? SharedTalentListing::STATUS_ACTIVE
                : SharedTalentListing::STATUS_FULL;
            $sharedTalentListing->update([
                'status' => $status,
                'rejection_reason' => null,
                'moderated_by' => $user->id,
                'moderated_at' => now(),
            ]);
            $this->sharedTalents->log('listing.approved', $sharedTalentListing->church_id, $user, SharedTalentListing::class, $sharedTalentListing->id);
            $this->notifier->notifyPublisherOfListingModeration($sharedTalentListing->fresh(), 'approved');
        } elseif ($data['action'] === 'reject') {
            $sharedTalentListing->update([
                'status' => SharedTalentListing::STATUS_REJECTED,
                'rejection_reason' => $data['rejection_reason'] ?? 'Não atende aos critérios da comunidade.',
                'moderated_by' => $user->id,
                'moderated_at' => now(),
            ]);
            $this->sharedTalents->log('listing.rejected', $sharedTalentListing->church_id, $user, SharedTalentListing::class, $sharedTalentListing->id);
            $this->notifier->notifyPublisherOfListingModeration($sharedTalentListing->fresh(), 'rejected');
        } else {
            $sharedTalentListing->update([
                'status' => SharedTalentListing::STATUS_PAUSED,
                'moderated_by' => $user->id,
                'moderated_at' => now(),
            ]);
            $this->sharedTalents->log('listing.suspended', $sharedTalentListing->church_id, $user, SharedTalentListing::class, $sharedTalentListing->id);
            $this->notifier->notifyPublisherOfListingModeration($sharedTalentListing->fresh(), 'suspended');
        }

        return redirect()->back()->with('success', 'Publicação atualizada.');
    }

    public function enrollments(Request $request): Response
    {
        $this->assertCanModerate($request);
        $churchId = $this->currentChurchId();

        $enrollments = SharedTalentEnrollment::query()
            ->with(['user:id,name', 'listing:id,title'])
            ->whereHas('listing', fn ($q) => $churchId !== null ? $q->where('church_id', $churchId) : $q->whereRaw('1 = 0'))
            ->orderByDesc('created_at')
            ->limit(100)
            ->get()
            ->map(fn (SharedTalentEnrollment $e) => [
                'id' => $e->id,
                'status' => $e->status,
                'status_label' => SharedTalentEnrollment::statusLabel($e->status),
                'participant_name' => $e->user?->name,
                'listing_title' => $e->listing?->title,
                'created_at' => $e->created_at?->format('d/m/Y H:i'),
            ]);

        return Inertia::render('SharedTalent/Admin/Enrollments', [
            'enrollments' => $enrollments,
        ]);
    }

    public function reports(Request $request): Response
    {
        $this->assertCanModerate($request);
        $churchId = $this->currentChurchId();

        $reports = SharedTalentReport::query()
            ->with(['reporter:id,name', 'listing:id,title', 'reportedUser:id,name'])
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->orderByDesc('created_at')
            ->limit(100)
            ->get()
            ->map(fn (SharedTalentReport $r) => [
                'id' => $r->id,
                'reason' => $r->reason,
                'reason_label' => SharedTalentReport::reasonLabel($r->reason),
                'status' => $r->status,
                'status_label' => SharedTalentReport::statusLabel($r->status),
                'description' => $r->description,
                'reporter_name' => $r->reporter?->name,
                'listing_title' => $r->listing?->title,
                'reported_user_name' => $r->reportedUser?->name,
                'created_at' => $r->created_at?->format('d/m/Y H:i'),
                'resolution_notes' => $r->resolution_notes,
            ]);

        return Inertia::render('SharedTalent/Admin/Reports', [
            'reports' => $reports,
        ]);
    }

    public function resolveReport(Request $request, SharedTalentReport $sharedTalentReport): RedirectResponse
    {
        $this->assertCanModerate($request);
        $churchId = $this->currentChurchId();

        if ($churchId !== null && (int) $sharedTalentReport->church_id !== $churchId) {
            abort(404);
        }

        $data = $request->validate([
            'status' => ['required', Rule::in([
                SharedTalentReport::STATUS_REVIEWING,
                SharedTalentReport::STATUS_RESOLVED,
                SharedTalentReport::STATUS_DISMISSED,
            ])],
            'resolution_notes' => ['nullable', 'string', 'max:2000'],
            'pause_listing' => ['boolean'],
        ]);

        $sharedTalentReport->update([
            'status' => $data['status'],
            'resolution_notes' => $data['resolution_notes'] ?? null,
            'resolved_by' => $request->user()->id,
            'resolved_at' => now(),
        ]);

        if ($request->boolean('pause_listing') && $sharedTalentReport->listing_id) {
            $listing = SharedTalentListing::query()->find($sharedTalentReport->listing_id);
            if ($listing !== null) {
                $listing->update(['status' => SharedTalentListing::STATUS_PAUSED]);
                $this->notifier->notifyPublisherOfListingModeration($listing->fresh(), 'suspended');
            }
        }

        $this->sharedTalents->log('report.resolved', $sharedTalentReport->church_id, $request->user(), SharedTalentReport::class, $sharedTalentReport->id);
        $this->notifier->notifyReporterOfReportResolution($sharedTalentReport->fresh());

        return redirect()->back()->with('success', 'Denúncia atualizada.');
    }

    public function categories(Request $request): Response
    {
        $this->assertCanModerate($request);
        $churchId = $this->currentChurchId();

        $categories = SharedTalentCategory::query()
            ->where(function ($q) use ($churchId) {
                $q->whereNull('church_id');
                if ($churchId !== null) {
                    $q->orWhere('church_id', $churchId);
                }
            })
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn (SharedTalentCategory $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'slug' => $c->slug,
                'sort_order' => $c->sort_order,
                'is_active' => $c->is_active,
                'church_id' => $c->church_id,
            ]);

        return Inertia::render('SharedTalent/Admin/Categories', [
            'categories' => $categories,
        ]);
    }

    public function storeCategory(Request $request): RedirectResponse
    {
        $this->assertCanModerate($request);
        $churchId = $this->currentChurchId();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:999'],
        ]);

        SharedTalentCategory::create([
            'church_id' => $churchId,
            'name' => $data['name'],
            'slug' => Str::slug($data['name']),
            'sort_order' => $data['sort_order'] ?? 99,
            'is_active' => true,
        ]);

        return redirect()->back()->with('success', 'Categoria criada.');
    }

    public function updateCategory(Request $request, SharedTalentCategory $sharedTalentCategory): RedirectResponse
    {
        $this->assertCanModerate($request);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:999'],
            'is_active' => ['boolean'],
        ]);

        $sharedTalentCategory->update([
            'name' => $data['name'],
            'slug' => Str::slug($data['name']),
            'sort_order' => $data['sort_order'] ?? $sharedTalentCategory->sort_order,
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()->back()->with('success', 'Categoria atualizada.');
    }

    public function reviews(Request $request): Response
    {
        $this->assertCanModerate($request);
        $churchId = $this->currentChurchId();

        $reviews = SharedTalentReview::query()
            ->with(['reviewer:id,name', 'reviewedUser:id,name', 'listing:id,title'])
            ->whereHas('listing', fn ($q) => $churchId !== null ? $q->where('church_id', $churchId) : $q->whereRaw('1 = 0'))
            ->orderByDesc('created_at')
            ->limit(100)
            ->get()
            ->map(fn (SharedTalentReview $r) => [
                'id' => $r->id,
                'rating' => $r->rating,
                'comment' => $r->comment,
                'status' => $r->status,
                'reviewer_name' => $r->reviewer?->name,
                'reviewed_name' => $r->reviewedUser?->name,
                'listing_title' => $r->listing?->title,
                'created_at' => $r->created_at?->format('d/m/Y H:i'),
            ]);

        return Inertia::render('SharedTalent/Admin/Reviews', [
            'reviews' => $reviews,
        ]);
    }

    public function hideReview(Request $request, SharedTalentReview $sharedTalentReview): RedirectResponse
    {
        $this->assertCanModerate($request);

        $sharedTalentReview->update([
            'status' => SharedTalentReview::STATUS_HIDDEN,
            'moderated_by' => $request->user()->id,
            'moderated_at' => now(),
        ]);

        return redirect()->back()->with('success', 'Avaliação ocultada.');
    }

    public function logs(Request $request): Response
    {
        $this->assertCanManage($request);
        $churchId = $this->currentChurchId();

        $logs = SharedTalentAuditLog::query()
            ->with('user:id,name')
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->orderByDesc('created_at')
            ->limit(200)
            ->get()
            ->map(fn (SharedTalentAuditLog $log) => [
                'id' => $log->id,
                'action' => $log->action,
                'user_name' => $log->user?->name,
                'subject_type' => $log->subject_type,
                'subject_id' => $log->subject_id,
                'created_at' => $log->created_at?->format('d/m/Y H:i'),
            ]);

        return Inertia::render('SharedTalent/Admin/Logs', [
            'logs' => $logs,
        ]);
    }
}
