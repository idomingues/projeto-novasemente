<?php

namespace App\Http\Controllers;

use App\Models\CharityCampaign;
use App\Models\CharityCampaignPhoto;
use App\Models\CharityDonation;
use App\Models\CharityItemDonation;
use App\Models\Church;
use App\Models\User;
use App\Services\PublicationBroadcastNotifier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CharityCampaignController extends Controller
{
    private const MAX_GOAL_AMOUNT = 9999999999.99;

    private const MAX_GOAL_QUANTITY = 999999;

    public function __construct(
        private readonly PublicationBroadcastNotifier $publicationBroadcast,
    ) {}

    private function assertCanManage(?User $user): void
    {
        if (! $user) {
            abort(403);
        }
        if ($user->hasAnyRole(['super_admin', 'admin'])) {
            return;
        }
        if ($user->can('donations.manage')) {
            return;
        }
        abort(403);
    }

    private function currentChurchId(): ?int
    {
        return Church::resolveWorkingId(request());
    }

    private function normalizeMoneyInput(mixed $value): mixed
    {
        if (! is_string($value)) {
            return $value;
        }

        $normalized = trim(str_replace('R$', '', $value));
        if ($normalized === '') {
            return $value;
        }

        if (str_contains($normalized, ',')) {
            $normalized = str_replace('.', '', $normalized);
            $normalized = str_replace(',', '.', $normalized);
        }

        return $normalized;
    }

    public function index(Request $request): Response
    {
        $user = $request->user();
        $canManage = $user !== null && ($user->can('donations.manage') || $user->hasAnyRole(['super_admin', 'admin']));
        $canManageMedia = $canManage || ($user !== null && $user->can('finance.view'));

        if (! $canManageMedia && ! $user?->can('donations.view')) {
            abort(403);
        }

        $churchId = $this->currentChurchId();
        $campaigns = CharityCampaign::query()
            ->with('photos')
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->orderByDesc('created_at')
            ->get()
            ->map(function (CharityCampaign $c) {
                $progress = $c->progressSummary();

                return [
                    'id' => $c->id,
                    'title' => $c->title,
                    'description' => $c->description,
                    'type' => $c->type,
                    'progress_mode' => $c->progress_mode,
                    'goal_amount' => (float) $c->goal_amount,
                    'raised_amount' => (float) $c->raised_amount,
                    'remaining_amount' => $c->remainingAmount(),
                    'goal_quantity' => $c->goal_quantity,
                    'pledged_quantity' => $c->pledged_quantity,
                    'collected_quantity' => $c->collected_quantity,
                    'remaining_quantity' => $c->remainingQuantity(),
                    'unit_label' => $c->unit_label,
                    'progress_value' => $progress['raised'],
                    'progress_goal' => $progress['goal'],
                    'progress_remaining' => $progress['remaining'],
                    'progress_pending' => $progress['pending'],
                    'progress_percent' => $c->progressPercent(),
                    'status' => $c->status,
                    'starts_at' => $c->starts_at?->format('Y-m-d'),
                    'ends_at' => $c->ends_at?->format('Y-m-d'),
                    'cover_image_url' => $c->cover_image_url,
                    'allow_over_goal' => $c->allow_over_goal,
                    'donations_count' => $c->isItemCampaign() ? $c->itemDonations()->count() : $c->donations()->count(),
                    'story_video_url' => $c->story_video_url,
                    'story_photos' => $c->photosPayload(CharityCampaignPhoto::KIND_STORY),
                    'thanks_message' => $c->thanks_message,
                    'thanks_is_published' => $c->thanksIsPublished(),
                    'thanks_published_at' => $c->thanks_published_at?->toIso8601String(),
                    'thanks_donors_notified_at' => $c->thanks_donors_notified_at?->toIso8601String(),
                    'thanks_photos' => $c->photosPayload(CharityCampaignPhoto::KIND_THANKS),
                ];
            });

        return Inertia::render('Donations/Index', [
            'campaigns' => $campaigns,
            'canManage' => $canManage,
            'canManageMedia' => $canManageMedia,
            'canManageDonations' => $canManageMedia,
        ]);
    }

    public function store(Request $request)
    {
        $this->assertCanManage($request->user());
        $startsAt = $request->input('starts_at');
        $campaignType = $request->input('type', CharityCampaign::TYPE_MONEY);
        $request->merge([
            'type' => $campaignType,
            'goal_amount' => $this->normalizeMoneyInput($request->input('goal_amount')),
            'starts_at' => filled($startsAt) ? $startsAt : now()->toDateString(),
        ]);

        $data = $request->validate([
            'type' => ['required', Rule::in([CharityCampaign::TYPE_MONEY, CharityCampaign::TYPE_ITEMS])],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'goal_amount' => $campaignType === CharityCampaign::TYPE_MONEY
                ? ['required', 'numeric', 'min:1', 'max:'.self::MAX_GOAL_AMOUNT]
                : ['nullable'],
            'goal_quantity' => $campaignType === CharityCampaign::TYPE_ITEMS
                ? ['required', 'integer', 'min:1', 'max:'.self::MAX_GOAL_QUANTITY]
                : ['nullable'],
            'unit_label' => $campaignType === CharityCampaign::TYPE_ITEMS
                ? ['required', 'string', 'max:100']
                : ['nullable'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'status' => ['required', 'in:active,closed,archived'],
            'allow_over_goal' => ['boolean'],
            'cover_image' => ['nullable', 'image', 'max:5120'],
        ]);

        $churchId = $this->currentChurchId();
        if ($churchId === null) {
            return redirect()->route('charity-campaigns.index')->with('error', 'Nenhuma igreja ativa. Selecione uma igreja para trabalhar.');
        }

        $coverPath = null;
        if ($request->hasFile('cover_image')) {
            $coverPath = $request->file('cover_image')->store('charity/campaign-covers', 'public');
        }

        $campaign = CharityCampaign::create([
            'church_id' => $churchId,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'type' => $data['type'],
            'progress_mode' => $data['type'] === CharityCampaign::TYPE_ITEMS
                ? CharityCampaign::PROGRESS_QUANTITY
                : CharityCampaign::PROGRESS_MONEY,
            'goal_amount' => $data['type'] === CharityCampaign::TYPE_MONEY ? $data['goal_amount'] : 0,
            'goal_quantity' => $data['type'] === CharityCampaign::TYPE_ITEMS ? (int) $data['goal_quantity'] : null,
            'pledged_quantity' => 0,
            'collected_quantity' => 0,
            'unit_label' => $data['type'] === CharityCampaign::TYPE_ITEMS ? trim((string) $data['unit_label']) : null,
            'status' => $data['status'],
            'starts_at' => $data['starts_at'],
            'ends_at' => $data['ends_at'] ?? null,
            'allow_over_goal' => $data['type'] === CharityCampaign::TYPE_MONEY
                ? $request->boolean('allow_over_goal', true)
                : false,
            'cover_image_path' => $coverPath,
            'created_by' => $request->user()?->id,
        ]);

        $this->publicationBroadcast->notifyCharityCampaign($campaign, $request->user()?->id);

        return redirect()->route('charity-campaigns.index')->with('success', 'Campanha criada com sucesso.');
    }

    public function update(Request $request, CharityCampaign $charityCampaign)
    {
        $this->assertCanManage($request->user());
        $startsAt = $request->input('starts_at');
        $campaignType = $request->input('type', $charityCampaign->type);
        $request->merge([
            'type' => $campaignType,
            'goal_amount' => $this->normalizeMoneyInput($request->input('goal_amount')),
            'starts_at' => filled($startsAt)
                ? $startsAt
                : ($charityCampaign->starts_at?->toDateString() ?? $charityCampaign->created_at?->toDateString() ?? now()->toDateString()),
        ]);

        $data = $request->validate([
            'type' => ['required', Rule::in([CharityCampaign::TYPE_MONEY, CharityCampaign::TYPE_ITEMS])],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'goal_amount' => $campaignType === CharityCampaign::TYPE_MONEY
                ? ['required', 'numeric', 'min:1', 'max:'.self::MAX_GOAL_AMOUNT]
                : ['nullable'],
            'goal_quantity' => $campaignType === CharityCampaign::TYPE_ITEMS
                ? ['required', 'integer', 'min:1', 'max:'.self::MAX_GOAL_QUANTITY]
                : ['nullable'],
            'unit_label' => $campaignType === CharityCampaign::TYPE_ITEMS
                ? ['required', 'string', 'max:100']
                : ['nullable'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'status' => ['required', 'in:active,closed,archived'],
            'allow_over_goal' => ['boolean'],
            'cover_image' => ['nullable', 'image', 'max:5120'],
        ]);

        if ($charityCampaign->type !== $data['type']) {
            $hasMoneyDonations = $charityCampaign->donations()->exists();
            $hasItemDonations = $charityCampaign->itemDonations()->exists();

            if ($hasMoneyDonations || $hasItemDonations) {
                return redirect()->back()->with('error', 'Não é possível trocar o tipo de uma campanha que já possui registros.');
            }
        }

        $update = [
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'type' => $data['type'],
            'progress_mode' => $data['type'] === CharityCampaign::TYPE_ITEMS
                ? CharityCampaign::PROGRESS_QUANTITY
                : CharityCampaign::PROGRESS_MONEY,
            'goal_amount' => $data['type'] === CharityCampaign::TYPE_MONEY ? $data['goal_amount'] : 0,
            'raised_amount' => $data['type'] === CharityCampaign::TYPE_ITEMS ? 0 : $charityCampaign->raised_amount,
            'goal_quantity' => $data['type'] === CharityCampaign::TYPE_ITEMS ? (int) $data['goal_quantity'] : null,
            'unit_label' => $data['type'] === CharityCampaign::TYPE_ITEMS ? trim((string) $data['unit_label']) : null,
            'status' => $data['status'],
            'starts_at' => $data['starts_at'],
            'ends_at' => $data['ends_at'] ?? null,
            'allow_over_goal' => $data['type'] === CharityCampaign::TYPE_MONEY
                ? $request->boolean('allow_over_goal', true)
                : false,
        ];

        if ($data['type'] === CharityCampaign::TYPE_MONEY) {
            $update['goal_quantity'] = null;
            $update['pledged_quantity'] = 0;
            $update['collected_quantity'] = 0;
        }

        if ($request->hasFile('cover_image')) {
            if ($charityCampaign->cover_image_path) {
                Storage::disk('public')->delete($charityCampaign->cover_image_path);
            }
            $update['cover_image_path'] = $request->file('cover_image')->store('charity/campaign-covers', 'public');
        }

        $charityCampaign->update($update);

        return redirect()->route('charity-campaigns.index')->with('success', 'Campanha atualizada com sucesso.');
    }

    public function destroy(CharityCampaign $charityCampaign)
    {
        $this->assertCanManage(request()->user());

        if ($charityCampaign->cover_image_path) {
            Storage::disk('public')->delete($charityCampaign->cover_image_path);
        }

        foreach ($charityCampaign->donations as $donation) {
            if ($donation->receipt_path) {
                Storage::disk('public')->delete($donation->receipt_path);
            }
        }

        foreach ($charityCampaign->itemDonations as $donation) {
            if ($donation->evidence_photo_path) {
                Storage::disk('public')->delete($donation->evidence_photo_path);
            }
        }

        foreach ($charityCampaign->photos as $photo) {
            Storage::disk('public')->delete($photo->image_path);
        }

        $charityCampaign->delete();

        return redirect()->route('charity-campaigns.index')->with('success', 'Campanha removida com sucesso.');
    }

    public function donationsJson(CharityCampaign $charityCampaign)
    {
        $user = request()->user();
        if (! $user || (! $user->can('donations.view') && ! $user->can('finance.view') && ! $user->can('donations.manage'))) {
            abort(403);
        }

        if ($charityCampaign->isItemCampaign()) {
            $donations = $charityCampaign->itemDonations()
                ->with(['user:id,name', 'receivedByUser:id,name', 'adjustedByUser:id,name'])
                ->orderByDesc('pledged_at')
                ->get()
                ->map(fn (CharityItemDonation $d) => [
                    'id' => $d->id,
                    'entry_type' => 'item',
                    'donor_name' => $d->donorDisplayName(),
                    'is_anonymous' => $d->is_anonymous,
                    'item_description' => $d->item_description,
                    'quantity' => $d->quantity,
                    'quantity_before_adjustment' => $d->quantity_before_adjustment,
                    'quantity_label' => $d->quantityLabel(),
                    'unit_label' => $d->unit_label ?: $charityCampaign->unit_label,
                    'status' => $d->status,
                    'notes' => $d->notes,
                    'staff_note' => $d->staff_note,
                    'adjustment_note' => $d->adjustment_note,
                    'adjusted_by_name' => $d->adjustedByUser?->name,
                    'adjusted_at' => $d->adjusted_at?->toIso8601String(),
                    'adjustment_history' => [],
                    'confirmed_at' => ($d->received_at ?? $d->pledged_at)?->toIso8601String(),
                    'pledged_at' => $d->pledged_at?->toIso8601String(),
                    'received_at' => $d->received_at?->toIso8601String(),
                    'received_by_name' => $d->receivedByUser?->name,
                    'receipt_url' => $d->evidence_photo_url,
                    'evidence_photo_url' => $d->evidence_photo_url,
                    'can_mark_received' => $d->status === CharityItemDonation::STATUS_PLEDGED,
                    'can_cancel' => $d->status === CharityItemDonation::STATUS_PLEDGED,
                ]);

            return response()->json(['donations' => $donations]);
        }

        $donations = $charityCampaign->donations()
            ->with([
                'user:id,name',
                'adjustments' => fn ($q) => $q->with('adjustedByUser:id,name')->orderByDesc('created_at'),
            ])
            ->orderByDesc('confirmed_at')
            ->get()
            ->map(fn (CharityDonation $d) => [
                'id' => $d->id,
                'entry_type' => 'money',
                'donor_name' => $d->donorDisplayName(),
                'amount' => (float) $d->amount,
                'source' => $d->source,
                'is_manual' => $d->isManual(),
                'manual_registration_note' => $d->manual_registration_note,
                'ocr_suggested_amount' => $d->ocr_suggested_amount !== null ? (float) $d->ocr_suggested_amount : null,
                'amount_before_adjustment' => $d->amount_before_adjustment !== null ? (float) $d->amount_before_adjustment : null,
                'adjustment_note' => $d->adjustment_note,
                'is_anonymous' => $d->is_anonymous,
                'confirmed_at' => $d->confirmed_at->toIso8601String(),
                'receipt_url' => $d->receipt_url,
                'adjustment_history' => $d->adjustments->map(fn ($a) => [
                    'id' => $a->id,
                    'amount_before' => (float) $a->amount_before,
                    'amount_after' => (float) $a->amount_after,
                    'adjustment_note' => $a->adjustment_note,
                    'adjusted_by_name' => $a->adjustedByUser?->name,
                    'created_at' => $a->created_at->toIso8601String(),
                ])->values()->all(),
            ]);

        return response()->json(['donations' => $donations]);
    }
}
