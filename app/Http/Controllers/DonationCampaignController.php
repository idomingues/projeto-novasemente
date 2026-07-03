<?php

namespace App\Http\Controllers;

use App\Models\CampaignDonation;
use App\Models\Church;
use App\Models\DonationCampaign;
use App\Models\DonationCampaignPhoto;
use App\Models\User;
use App\Services\PublicationBroadcastNotifier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class DonationCampaignController extends Controller
{
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
        if ($user->can('campaigns.manage')) {
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
        $canManage = $user !== null && ($user->can('campaigns.manage') || $user->hasAnyRole(['super_admin', 'admin']));
        $canManageMedia = $canManage || ($user !== null && $user->can('finance.view'));

        if (! $canManageMedia && ! $user?->can('campaigns.view')) {
            abort(403);
        }

        $churchId = $this->currentChurchId();
        $campaigns = DonationCampaign::query()
            ->with('photos')
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (DonationCampaign $c) => [
                'id' => $c->id,
                'title' => $c->title,
                'description' => $c->description,
                'goal_amount' => (float) $c->goal_amount,
                'raised_amount' => (float) $c->raised_amount,
                'remaining_amount' => $c->remainingAmount(),
                'progress_percent' => $c->progressPercent(),
                'status' => $c->status,
                'ends_at' => $c->ends_at?->format('Y-m-d'),
                'cover_image_url' => $c->cover_image_url,
                'allow_over_goal' => $c->allow_over_goal,
                'donations_count' => $c->donations()->count(),
                'story_video_url' => $c->story_video_url,
                'story_photos' => $c->photosPayload(DonationCampaignPhoto::KIND_STORY),
                'thanks_message' => $c->thanks_message,
                'thanks_is_published' => $c->thanksIsPublished(),
                'thanks_published_at' => $c->thanks_published_at?->toIso8601String(),
                'thanks_donors_notified_at' => $c->thanks_donors_notified_at?->toIso8601String(),
                'thanks_photos' => $c->photosPayload(DonationCampaignPhoto::KIND_THANKS),
            ]);

        return Inertia::render('DonationCampaigns/Index', [
            'campaigns' => $campaigns,
            'canManage' => $canManage,
            'canManageMedia' => $canManageMedia,
            'canManageDonations' => $canManageMedia,
        ]);
    }

    public function store(Request $request)
    {
        $this->assertCanManage($request->user());
        $request->merge([
            'goal_amount' => $this->normalizeMoneyInput($request->input('goal_amount')),
        ]);

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'goal_amount' => ['required', 'numeric', 'min:1', 'max:9999999.99'],
            'ends_at' => ['nullable', 'date'],
            'status' => ['required', 'in:active,closed,archived'],
            'allow_over_goal' => ['boolean'],
            'cover_image' => ['nullable', 'image', 'max:5120'],
        ]);

        $churchId = $this->currentChurchId();
        if ($churchId === null) {
            return redirect()->route('donation-campaigns.index')->with('error', 'Nenhuma igreja ativa. Selecione uma igreja para trabalhar.');
        }

        $coverPath = null;
        if ($request->hasFile('cover_image')) {
            $coverPath = $request->file('cover_image')->store('donations/campaign-covers', 'public');
        }

        $campaign = DonationCampaign::create([
            'church_id' => $churchId,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'goal_amount' => $data['goal_amount'],
            'status' => $data['status'],
            'ends_at' => $data['ends_at'] ?? null,
            'allow_over_goal' => $request->boolean('allow_over_goal', true),
            'cover_image_path' => $coverPath,
            'created_by' => $request->user()?->id,
        ]);

        $this->publicationBroadcast->notifyDonationCampaign($campaign, $request->user()?->id);

        return redirect()->route('donation-campaigns.index')->with('success', 'Campanha criada com sucesso.');
    }

    public function update(Request $request, DonationCampaign $donationCampaign)
    {
        $this->assertCanManage($request->user());
        $request->merge([
            'goal_amount' => $this->normalizeMoneyInput($request->input('goal_amount')),
        ]);

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'goal_amount' => ['required', 'numeric', 'min:1', 'max:9999999.99'],
            'ends_at' => ['nullable', 'date'],
            'status' => ['required', 'in:active,closed,archived'],
            'allow_over_goal' => ['boolean'],
            'cover_image' => ['nullable', 'image', 'max:5120'],
        ]);

        $update = [
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'goal_amount' => $data['goal_amount'],
            'status' => $data['status'],
            'ends_at' => $data['ends_at'] ?? null,
            'allow_over_goal' => $request->boolean('allow_over_goal', true),
        ];

        if ($request->hasFile('cover_image')) {
            if ($donationCampaign->cover_image_path) {
                Storage::disk('public')->delete($donationCampaign->cover_image_path);
            }
            $update['cover_image_path'] = $request->file('cover_image')->store('donations/campaign-covers', 'public');
        }

        $donationCampaign->update($update);

        return redirect()->route('donation-campaigns.index')->with('success', 'Campanha atualizada com sucesso.');
    }

    public function destroy(DonationCampaign $donationCampaign)
    {
        $this->assertCanManage(request()->user());

        if ($donationCampaign->cover_image_path) {
            Storage::disk('public')->delete($donationCampaign->cover_image_path);
        }

        foreach ($donationCampaign->donations as $donation) {
            if ($donation->receipt_path) {
                Storage::disk('public')->delete($donation->receipt_path);
            }
        }

        foreach ($donationCampaign->photos as $photo) {
            Storage::disk('public')->delete($photo->image_path);
        }

        $donationCampaign->delete();

        return redirect()->route('donation-campaigns.index')->with('success', 'Campanha removida com sucesso.');
    }

    public function donationsJson(DonationCampaign $donationCampaign)
    {
        $user = request()->user();
        if (! $user || (! $user->can('campaigns.view') && ! $user->can('finance.view') && ! $user->can('campaigns.manage'))) {
            abort(403);
        }

        $donations = $donationCampaign->donations()
            ->with([
                'user:id,name',
                'adjustments' => fn ($q) => $q->with('adjustedByUser:id,name')->orderByDesc('created_at'),
            ])
            ->orderByDesc('confirmed_at')
            ->get()
            ->map(fn (CampaignDonation $d) => [
                'id' => $d->id,
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
