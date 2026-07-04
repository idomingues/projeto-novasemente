<?php

namespace App\Http\Controllers;

use App\Models\CharityCampaign;
use App\Models\CharityDonation;
use App\Models\CharityItemDonation;
use App\Models\Church;
use App\Models\User;
use App\Support\SearchTerm;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CharityTreasurerDashboardController extends Controller
{
    private const DONATIONS_PER_PAGE = 100;

    private function assertCanView(?User $user): void
    {
        if (! $user) {
            abort(403);
        }
        if ($user->hasAnyRole(['super_admin', 'admin'])) {
            return;
        }
        if ($user->can('finance.view')) {
            return;
        }
        abort(403);
    }

    private function currentChurchId(): ?int
    {
        return Church::resolveWorkingId(request());
    }

    public function index(Request $request): Response
    {
        $this->assertCanView($request->user());

        $churchId = $this->currentChurchId();
        $month = $request->input('month', now()->format('Y-m'));
        $search = trim((string) $request->input('search', ''));
        $campaignId = $request->input('campaign_id');
        $disputesOnly = $request->boolean('disputes_only');
        $campaignType = $request->input('campaign_type', CharityCampaign::TYPE_MONEY);
        if (! in_array($campaignType, [CharityCampaign::TYPE_MONEY, CharityCampaign::TYPE_ITEMS], true)) {
            $campaignType = CharityCampaign::TYPE_MONEY;
        }

        try {
            $monthStart = Carbon::createFromFormat('Y-m', $month)->startOfMonth();
        } catch (\Throwable) {
            $monthStart = now()->startOfMonth();
            $month = $monthStart->format('Y-m');
        }
        $monthEnd = $monthStart->copy()->endOfMonth();
        $prevMonthStart = $monthStart->copy()->subMonth()->startOfMonth();
        $prevMonthEnd = $prevMonthStart->copy()->endOfMonth();

        if ($campaignType === CharityCampaign::TYPE_ITEMS) {
            $baseQuery = CharityItemDonation::query()
                ->with([
                    'user:id,name',
                    'campaign:id,title,church_id,unit_label',
                    'receivedByUser:id,name',
                    'adjustedByUser:id,name',
                ])
                ->whereHas('campaign', function ($q) use ($churchId) {
                    if ($churchId !== null) {
                        $q->where('church_id', $churchId);
                    } else {
                        $q->whereRaw('1 = 0');
                    }
                });

            $monthTotal = (float) (clone $baseQuery)
                ->whereBetween('pledged_at', [$monthStart, $monthEnd])
                ->sum('quantity');

            $previousMonthTotal = (float) (clone $baseQuery)
                ->whereBetween('pledged_at', [$prevMonthStart, $prevMonthEnd])
                ->sum('quantity');

            $filteredQuery = clone $baseQuery;

            if ($search !== '') {
                $filteredQuery->where(function ($q) use ($search) {
                    $q->whereHas('user', fn ($uq) => SearchTerm::whereAnyColumnLike($uq, ['name'], $search));
                    $q->orWhere('external_donor_name', 'like', '%'.$search.'%');
                    $q->orWhere('item_description', 'like', '%'.$search.'%');
                    $q->orWhereHas('campaign', fn ($cq) => SearchTerm::whereAnyColumnLike($cq, ['title'], $search));
                });
            }

            if ($campaignId !== null && $campaignId !== '') {
                $filteredQuery->where('campaign_id', (int) $campaignId);
            }

            if ($request->filled('month')) {
                $filteredQuery->whereBetween('pledged_at', [$monthStart, $monthEnd]);
            }

            if ($disputesOnly) {
                $filteredQuery->where('status', CharityItemDonation::STATUS_PLEDGED);
            }

            $pendingDisputesCount = (clone $baseQuery)
                ->where('status', CharityItemDonation::STATUS_PLEDGED)
                ->count();

            $donations = $filteredQuery
                ->orderByDesc('pledged_at')
                ->paginate(self::DONATIONS_PER_PAGE)
                ->withQueryString()
                ->through(fn (CharityItemDonation $d) => [
                    'id' => $d->id,
                    'entry_type' => 'item',
                    'donor_name' => $d->donorDisplayName(),
                    'donor_real_name' => $d->user?->name,
                    'campaign_title' => $d->campaign?->title,
                    'campaign_id' => $d->campaign_id,
                    'item_description' => $d->item_description,
                    'quantity' => $d->quantity,
                    'quantity_before_adjustment' => $d->quantity_before_adjustment,
                    'unit_label' => $d->unit_label ?: $d->campaign?->unit_label,
                    'status' => $d->status,
                    'notes' => $d->notes,
                    'staff_note' => $d->staff_note,
                    'adjustment_note' => $d->adjustment_note,
                    'adjusted_at' => $d->adjusted_at?->toIso8601String(),
                    'adjusted_by_name' => $d->adjustedByUser?->name,
                    'adjustment_history' => [],
                    'is_anonymous' => $d->is_anonymous,
                    'confirmed_at' => ($d->received_at ?? $d->pledged_at)?->toIso8601String(),
                    'pledged_at' => $d->pledged_at?->toIso8601String(),
                    'received_at' => $d->received_at?->toIso8601String(),
                    'received_by_name' => $d->receivedByUser?->name,
                    'receipt_url' => $d->evidence_photo_url,
                    'dispute_status' => null,
                    'dispute_message' => null,
                    'disputed_at' => null,
                    'dispute_resolution_note' => null,
                ]);
        } else {
            $baseQuery = CharityDonation::query()
                ->with([
                    'user:id,name',
                    'campaign:id,title,church_id',
                    'adjustedByUser:id,name',
                    'adjustments' => fn ($q) => $q->with('adjustedByUser:id,name')->limit(5),
                ])
                ->whereHas('campaign', function ($q) use ($churchId) {
                    if ($churchId !== null) {
                        $q->where('church_id', $churchId);
                    } else {
                        $q->whereRaw('1 = 0');
                    }
                });

            $monthTotal = (float) (clone $baseQuery)
                ->whereBetween('confirmed_at', [$monthStart, $monthEnd])
                ->sum('amount');

            $previousMonthTotal = (float) (clone $baseQuery)
                ->whereBetween('confirmed_at', [$prevMonthStart, $prevMonthEnd])
                ->sum('amount');

            $filteredQuery = clone $baseQuery;

            if ($search !== '') {
                $amountLike = '%'.str_replace(['%', '_'], ['\\%', '\\_'], $search).'%';
                $filteredQuery->where(function ($q) use ($search, $amountLike) {
                    $q->where('amount', 'like', $amountLike);
                    $q->orWhereHas('user', fn ($uq) => SearchTerm::whereAnyColumnLike($uq, ['name'], $search));
                    $q->orWhereHas('campaign', fn ($cq) => SearchTerm::whereAnyColumnLike($cq, ['title'], $search));
                });
            }

            if ($campaignId !== null && $campaignId !== '') {
                $filteredQuery->where('campaign_id', (int) $campaignId);
            }

            if ($request->filled('month')) {
                $filteredQuery->whereBetween('confirmed_at', [$monthStart, $monthEnd]);
            }

            if ($disputesOnly) {
                $filteredQuery->where('dispute_status', CharityDonation::DISPUTE_PENDING);
            }

            $pendingDisputesCount = (clone $baseQuery)
                ->where('dispute_status', CharityDonation::DISPUTE_PENDING)
                ->count();

            $donations = $filteredQuery
                ->orderByDesc('confirmed_at')
                ->paginate(self::DONATIONS_PER_PAGE)
                ->withQueryString()
                ->through(fn (CharityDonation $d) => [
                    'id' => $d->id,
                    'entry_type' => 'money',
                    'donor_name' => $d->donorDisplayName(),
                    'donor_real_name' => $d->user?->name,
                    'campaign_title' => $d->campaign?->title,
                    'campaign_id' => $d->campaign_id,
                    'amount' => (float) $d->amount,
                    'ocr_suggested_amount' => $d->ocr_suggested_amount !== null ? (float) $d->ocr_suggested_amount : null,
                    'amount_before_adjustment' => $d->amount_before_adjustment !== null ? (float) $d->amount_before_adjustment : null,
                    'adjustment_note' => $d->adjustment_note,
                    'adjusted_at' => $d->adjusted_at?->toIso8601String(),
                    'adjusted_by_name' => $d->adjustedByUser?->name,
                    'adjustment_history' => $d->adjustments->map(fn ($a) => [
                        'id' => $a->id,
                        'amount_before' => (float) $a->amount_before,
                        'amount_after' => (float) $a->amount_after,
                        'adjustment_note' => $a->adjustment_note,
                        'adjusted_by_name' => $a->adjustedByUser?->name,
                        'created_at' => $a->created_at->toIso8601String(),
                    ])->values()->all(),
                    'is_anonymous' => $d->is_anonymous,
                    'confirmed_at' => $d->confirmed_at->toIso8601String(),
                    'receipt_url' => $d->receipt_url,
                    'dispute_status' => $d->dispute_status,
                    'dispute_message' => $d->dispute_message,
                    'disputed_at' => $d->disputed_at?->toIso8601String(),
                    'dispute_resolution_note' => $d->dispute_resolution_note,
                ]);
        }

        $campaigns = CharityCampaign::query()
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->where('type', $campaignType)
            ->orderBy('title')
            ->get(['id', 'title']);

        return Inertia::render('Finance/DonationTreasurerDashboard', [
            'donations' => $donations,
            'campaigns' => $campaigns,
            'filters' => [
                'search' => $search,
                'month' => $month,
                'campaign_id' => $campaignId !== null && $campaignId !== '' ? (int) $campaignId : null,
                'disputes_only' => $disputesOnly,
                'campaign_type' => $campaignType,
            ],
            'monthTotal' => $monthTotal,
            'previousMonthTotal' => $previousMonthTotal,
            'pendingDisputesCount' => $pendingDisputesCount,
            'summaryMode' => $campaignType === CharityCampaign::TYPE_ITEMS ? 'quantity' : 'currency',
            'canManageDonations' => $request->user()->hasAnyRole(['super_admin', 'admin'])
                || $request->user()->can('finance.view')
                || $request->user()->can('donations.manage'),
        ]);
    }
}
