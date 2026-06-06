<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\TalentAuditLog;
use App\Models\TalentCategory;
use App\Models\TalentListing;
use App\Models\TalentReport;
use App\Models\TalentReview;
use App\Services\TalentConnectionNotifier;
use App\Services\TalentConnectionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class TalentConnectionAdminController extends Controller
{
    public function __construct(
        private readonly TalentConnectionService $talents,
        private readonly TalentConnectionNotifier $notifier,
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

        if ($user->can('talents.moderate') || $user->hasAnyRole(['super_admin', 'admin'])) {
            return;
        }

        abort(403);
    }

    private function assertCanTreasurer(Request $request): void
    {
        $user = $request->user();
        if ($user === null) {
            abort(403);
        }

        if ($user->can('talents.treasurer') || $user->can('talents.moderate') || $user->can('finance.view')
            || $user->hasAnyRole(['super_admin', 'admin'])) {
            return;
        }

        abort(403);
    }

    public function dashboard(Request $request): Response
    {
        $this->assertCanTreasurer($request);
        $churchId = $this->currentChurchId();

        $listingQuery = TalentListing::query()
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'));

        $reportQuery = TalentReport::query()
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'));

        $canModerate = $request->user()?->can('talents.moderate')
            || $request->user()?->hasAnyRole(['super_admin', 'admin']);

        return Inertia::render('TalentConnection/Admin/Dashboard', [
            'metrics' => [
                'listings_total' => (clone $listingQuery)->count(),
                'listings_pending' => (clone $listingQuery)->where('status', TalentListing::STATUS_PENDING)->count(),
                'listings_approved' => (clone $listingQuery)->where('status', TalentListing::STATUS_APPROVED)->count(),
                'reports_pending' => (clone $reportQuery)->where('status', TalentReport::STATUS_PENDING)->count(),
                'reports_commercial' => (clone $reportQuery)
                    ->where('reason', TalentReport::REASON_COMMERCIAL_ABUSE)
                    ->whereIn('status', [TalentReport::STATUS_PENDING, TalentReport::STATUS_REVIEWING])
                    ->count(),
                'interests_active' => \App\Models\TalentInterest::query()
                    ->whereHas('listing', fn ($q) => $churchId !== null ? $q->where('church_id', $churchId) : $q->whereRaw('1 = 0'))
                    ->whereIn('status', [
                        \App\Models\TalentInterest::STATUS_PENDING,
                        \App\Models\TalentInterest::STATUS_IN_CONVERSATION,
                        \App\Models\TalentInterest::STATUS_AGREED,
                    ])
                    ->count(),
            ],
            'canModerate' => $canModerate,
        ]);
    }

    public function listings(Request $request): Response
    {
        $this->assertCanModerate($request);
        $churchId = $this->currentChurchId();

        $status = $request->input('status', TalentListing::STATUS_PENDING);

        $listings = TalentListing::query()
            ->with(['author:id,name', 'category:id,name'])
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->orderByDesc('created_at')
            ->limit(100)
            ->get()
            ->map(fn (TalentListing $l) => [
                'id' => $l->id,
                'user_id' => $l->user_id,
                'title' => $l->title,
                'type' => $l->type,
                'type_label' => TalentListing::typeLabel($l->type),
                'category_id' => $l->category_id,
                'category_name' => $l->category?->name,
                'description' => $l->description,
                'locality' => $l->locality,
                'availability' => $l->availability,
                'contact_phone' => $l->contact_phone,
                'contact_whatsapp' => $l->contact_whatsapp,
                'contact_email' => $l->contact_email,
                'contact_instagram' => $l->contact_instagram,
                'notes' => $l->notes,
                'allows_exchange' => $l->allows_exchange,
                'allows_negotiation' => $l->allows_negotiation,
                'photo_url' => $l->photo_url,
                'author_name' => $l->author?->name,
                'status' => $l->status,
                'status_label' => TalentListing::statusLabel($l->status),
                'created_at' => $l->created_at?->format('d/m/Y H:i'),
                'rejection_reason' => $l->rejection_reason,
            ]);

        return Inertia::render('TalentConnection/Admin/Listings', [
            'listings' => $listings,
            'statusFilter' => $status,
            'categories' => $this->talents->categoriesForChurch($churchId),
            'typeOptions' => $this->talents->typeOptions(),
            'publisherOptions' => $churchId !== null ? $this->talents->publisherOptionsForChurch($churchId) : [],
            'statusOptions' => [
                ['value' => TalentListing::STATUS_PENDING, 'label' => TalentListing::statusLabel(TalentListing::STATUS_PENDING)],
                ['value' => TalentListing::STATUS_APPROVED, 'label' => TalentListing::statusLabel(TalentListing::STATUS_APPROVED)],
                ['value' => TalentListing::STATUS_REJECTED, 'label' => TalentListing::statusLabel(TalentListing::STATUS_REJECTED)],
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
        $data = $request->validate($this->talents->listingPayloadRules(forAdmin: true));
        $this->talents->assertHasContactChannel($data);
        $contact = $this->talents->normalizedContactPayload($data);

        $publisher = $this->talents->assertPublisherBelongsToChurch((int) $data['user_id'], $churchId);
        $this->talents->confirmMembership($publisher, $churchId);

        $photoPath = null;
        if ($request->hasFile('photo')) {
            $photoPath = $request->file('photo')->store('talents/listings', 'public');
        }

        $autoApprove = $request->boolean('auto_approve', true);
        $status = $autoApprove ? TalentListing::STATUS_APPROVED : TalentListing::STATUS_PENDING;

        $listing = TalentListing::create([
            'church_id' => $churchId,
            'user_id' => $publisher->id,
            'category_id' => $data['category_id'],
            'title' => $data['title'],
            'type' => $data['type'],
            'description' => $data['description'],
            'locality' => $data['locality'] ?? null,
            'availability' => $data['availability'] ?? null,
            ...$contact,
            'allows_exchange' => $request->boolean('allows_exchange'),
            'allows_negotiation' => $request->boolean('allows_negotiation', true),
            'notes' => $data['notes'] ?? null,
            'photo_path' => $photoPath,
            'status' => $status,
            'member_declaration_at' => now(),
            'moderated_by' => $autoApprove ? $admin?->id : null,
            'moderated_at' => $autoApprove ? now() : null,
        ]);

        $this->talents->log('listing.admin_created', $churchId, $admin, TalentListing::class, $listing->id, [
            'publisher_user_id' => $publisher->id,
            'auto_approve' => $autoApprove,
        ]);

        if ($status === TalentListing::STATUS_PENDING) {
            $this->notifier->notifyModeratorsOfPendingListing($listing);
        } elseif ((int) $publisher->id !== (int) $admin?->id) {
            $this->notifier->notifyPublisherOfListingModeration($listing, 'approved');
        }

        return redirect()
            ->route('talents.admin.listings', ['status' => $status])
            ->with('success', $autoApprove
                ? 'Publicação cadastrada e publicada com sucesso.'
                : 'Publicação cadastrada e enviada para análise.');
    }

    public function updateListing(Request $request, TalentListing $talentListing): RedirectResponse
    {
        $this->assertCanModerate($request);
        $churchId = $this->currentChurchId();

        if ($churchId !== null && (int) $talentListing->church_id !== $churchId) {
            abort(404);
        }

        $admin = $request->user();
        $data = $request->validate($this->talents->listingPayloadRules(forAdmin: true));
        $this->talents->assertHasContactChannel($data);
        $contact = $this->talents->normalizedContactPayload($data);

        $publisher = $this->talents->assertPublisherBelongsToChurch((int) $data['user_id'], (int) $talentListing->church_id);

        if ($request->hasFile('photo')) {
            if ($talentListing->photo_path) {
                Storage::disk('public')->delete($talentListing->photo_path);
            }
            $talentListing->photo_path = $request->file('photo')->store('talents/listings', 'public');
        }

        $previousStatus = $talentListing->status;
        $newStatus = $data['status'] ?? $talentListing->status;

        $talentListing->fill([
            'user_id' => $publisher->id,
            'category_id' => $data['category_id'],
            'title' => $data['title'],
            'type' => $data['type'],
            'description' => $data['description'],
            'locality' => $data['locality'] ?? null,
            'availability' => $data['availability'] ?? null,
            ...$contact,
            'allows_exchange' => $request->boolean('allows_exchange'),
            'allows_negotiation' => $request->boolean('allows_negotiation', true),
            'notes' => $data['notes'] ?? null,
            'status' => $newStatus,
        ]);

        if ($newStatus === TalentListing::STATUS_APPROVED && $previousStatus !== TalentListing::STATUS_APPROVED) {
            $talentListing->rejection_reason = null;
            $talentListing->moderated_by = $admin?->id;
            $talentListing->moderated_at = now();
        }

        $talentListing->save();

        $this->talents->log('listing.admin_updated', $talentListing->church_id, $admin, TalentListing::class, $talentListing->id);

        if ($previousStatus !== $newStatus) {
            if ($newStatus === TalentListing::STATUS_APPROVED) {
                $this->notifier->notifyPublisherOfListingModeration($talentListing->fresh(), 'approved');
            } elseif ($newStatus === TalentListing::STATUS_REJECTED) {
                $this->notifier->notifyPublisherOfListingModeration($talentListing->fresh(), 'rejected');
            } elseif ($newStatus === TalentListing::STATUS_PAUSED) {
                $this->notifier->notifyPublisherOfListingModeration($talentListing->fresh(), 'suspended');
                $this->notifier->notifyInterestedPartiesOfListingUnavailable($talentListing->fresh(), 'paused');
            }
        }

        return redirect()
            ->route('talents.admin.listings', ['status' => $newStatus])
            ->with('success', 'Publicação atualizada.');
    }

    public function moderateListing(Request $request, TalentListing $talentListing): RedirectResponse
    {
        $this->assertCanModerate($request);
        $churchId = $this->currentChurchId();

        if ($churchId !== null && (int) $talentListing->church_id !== $churchId) {
            abort(404);
        }

        $data = $request->validate([
            'action' => ['required', Rule::in(['approve', 'reject', 'suspend'])],
            'rejection_reason' => ['nullable', 'string', 'max:1000'],
        ]);

        $user = $request->user();

        if ($data['action'] === 'approve') {
            $talentListing->update([
                'status' => TalentListing::STATUS_APPROVED,
                'rejection_reason' => null,
                'moderated_by' => $user->id,
                'moderated_at' => now(),
            ]);
            $this->talents->log('listing.approved', $talentListing->church_id, $user, TalentListing::class, $talentListing->id);
            $this->notifier->notifyPublisherOfListingModeration($talentListing->fresh(), 'approved');
        } elseif ($data['action'] === 'reject') {
            $talentListing->update([
                'status' => TalentListing::STATUS_REJECTED,
                'rejection_reason' => $data['rejection_reason'] ?? 'Não atende aos critérios da comunidade.',
                'moderated_by' => $user->id,
                'moderated_at' => now(),
            ]);
            $this->talents->log('listing.rejected', $talentListing->church_id, $user, TalentListing::class, $talentListing->id);
            $this->notifier->notifyPublisherOfListingModeration($talentListing->fresh(), 'rejected');
        } else {
            $talentListing->update([
                'status' => TalentListing::STATUS_PAUSED,
                'moderated_by' => $user->id,
                'moderated_at' => now(),
            ]);
            $this->talents->log('listing.suspended', $talentListing->church_id, $user, TalentListing::class, $talentListing->id);
            $this->notifier->notifyPublisherOfListingModeration($talentListing->fresh(), 'suspended');
            $this->notifier->notifyInterestedPartiesOfListingUnavailable($talentListing->fresh(), 'paused');
        }

        return redirect()->back()->with('success', 'Publicação atualizada.');
    }

    public function reports(Request $request): Response
    {
        $this->assertCanModerate($request);
        $churchId = $this->currentChurchId();

        $reports = TalentReport::query()
            ->with(['reporter:id,name', 'listing:id,title', 'reportedUser:id,name'])
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->orderByDesc('created_at')
            ->limit(100)
            ->get()
            ->map(fn (TalentReport $r) => [
                'id' => $r->id,
                'reason' => $r->reason,
                'reason_label' => TalentReport::reasonLabel($r->reason),
                'status' => $r->status,
                'status_label' => TalentReport::statusLabel($r->status),
                'description' => $r->description,
                'reporter_name' => $r->reporter?->name,
                'listing_title' => $r->listing?->title,
                'reported_user_name' => $r->reportedUser?->name,
                'created_at' => $r->created_at?->format('d/m/Y H:i'),
                'resolution_notes' => $r->resolution_notes,
            ]);

        return Inertia::render('TalentConnection/Admin/Reports', [
            'reports' => $reports,
        ]);
    }

    public function resolveReport(Request $request, TalentReport $talentReport): RedirectResponse
    {
        $this->assertCanModerate($request);
        $churchId = $this->currentChurchId();

        if ($churchId !== null && (int) $talentReport->church_id !== $churchId) {
            abort(404);
        }

        $data = $request->validate([
            'status' => ['required', Rule::in([
                TalentReport::STATUS_REVIEWING,
                TalentReport::STATUS_RESOLVED,
                TalentReport::STATUS_DISMISSED,
            ])],
            'resolution_notes' => ['nullable', 'string', 'max:2000'],
            'pause_listing' => ['boolean'],
        ]);

        $talentReport->update([
            'status' => $data['status'],
            'resolution_notes' => $data['resolution_notes'] ?? null,
            'resolved_by' => $request->user()->id,
            'resolved_at' => now(),
        ]);

        if ($request->boolean('pause_listing') && $talentReport->listing_id) {
            $listing = TalentListing::query()->find($talentReport->listing_id);
            if ($listing !== null) {
                $listing->update(['status' => TalentListing::STATUS_PAUSED]);
                $this->notifier->notifyPublisherOfListingModeration($listing->fresh(), 'suspended');
                $this->notifier->notifyInterestedPartiesOfListingUnavailable($listing->fresh(), 'paused');
            }
        }

        $this->talents->log('report.resolved', $talentReport->church_id, $request->user(), TalentReport::class, $talentReport->id);

        $this->notifier->notifyReporterOfReportResolution($talentReport->fresh());

        return redirect()->back()->with('success', 'Denúncia atualizada.');
    }

    public function categories(Request $request): Response
    {
        $this->assertCanModerate($request);
        $churchId = $this->currentChurchId();

        $categories = TalentCategory::query()
            ->where(function ($q) use ($churchId) {
                $q->whereNull('church_id');
                if ($churchId !== null) {
                    $q->orWhere('church_id', $churchId);
                }
            })
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn (TalentCategory $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'slug' => $c->slug,
                'sort_order' => $c->sort_order,
                'is_active' => $c->is_active,
                'church_id' => $c->church_id,
            ]);

        return Inertia::render('TalentConnection/Admin/Categories', [
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

        TalentCategory::create([
            'church_id' => $churchId,
            'name' => $data['name'],
            'slug' => Str::slug($data['name']),
            'sort_order' => $data['sort_order'] ?? 99,
            'is_active' => true,
        ]);

        return redirect()->back()->with('success', 'Categoria criada.');
    }

    public function updateCategory(Request $request, TalentCategory $talentCategory): RedirectResponse
    {
        $this->assertCanModerate($request);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:999'],
            'is_active' => ['boolean'],
        ]);

        $talentCategory->update([
            'name' => $data['name'],
            'slug' => Str::slug($data['name']),
            'sort_order' => $data['sort_order'] ?? $talentCategory->sort_order,
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()->back()->with('success', 'Categoria atualizada.');
    }

    public function logs(Request $request): Response
    {
        $this->assertCanModerate($request);
        $churchId = $this->currentChurchId();

        $logs = TalentAuditLog::query()
            ->with('user:id,name')
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->orderByDesc('created_at')
            ->limit(200)
            ->get()
            ->map(fn (TalentAuditLog $log) => [
                'id' => $log->id,
                'action' => $log->action,
                'user_name' => $log->user?->name,
                'subject_type' => $log->subject_type,
                'subject_id' => $log->subject_id,
                'created_at' => $log->created_at?->format('d/m/Y H:i'),
            ]);

        return Inertia::render('TalentConnection/Admin/Logs', [
            'logs' => $logs,
        ]);
    }

    public function hideReview(Request $request, TalentReview $talentReview): RedirectResponse
    {
        $this->assertCanModerate($request);

        $talentReview->update([
            'status' => TalentReview::STATUS_HIDDEN,
            'moderated_by' => $request->user()->id,
            'moderated_at' => now(),
        ]);

        return redirect()->back()->with('success', 'Avaliação ocultada.');
    }
}
