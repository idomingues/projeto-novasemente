<?php

namespace App\Http\Controllers;

use App\Actions\Donations\NotifyDonorOfCharityDonation;
use App\Actions\Donations\NotifyTreasurerOfCharityDonation;
use App\Models\CharityCampaign;
use App\Models\CharityDonation;
use App\Models\CharityItemDonation;
use App\Models\Church;
use App\Services\CharityDonationNotifier;
use App\Services\CharityItemDonationNotifier;
use App\Services\ReceiptOcrService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class CharityCampaignMobileController extends Controller
{
    private function sessionKey(int $campaignId): string
    {
        return 'pending_charity_donation_'.$campaignId;
    }

    private function resolveChurchId(): ?int
    {
        return Church::resolveWorkingId(request())
            ?? Church::query()->where('active', true)->orderBy('name')->value('id');
    }

    public function index(): Response
    {
        $churchId = $this->resolveChurchId();

        $campaigns = CharityCampaign::query()
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->where(function ($q) {
                $q->where(function ($active) {
                    $active->where('status', CharityCampaign::STATUS_ACTIVE)
                        ->where(function ($dates) {
                            $dates->whereNull('ends_at')->orWhereDate('ends_at', '>=', now()->toDateString());
                        });
                })->orWhere('status', CharityCampaign::STATUS_CLOSED);
            })
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (CharityCampaign $c) => $c->toMobileArray());

        return Inertia::render('Mobile/Donations/Index', [
            'campaigns' => $campaigns,
        ]);
    }

    public function show(Request $request, CharityCampaign $charityCampaign): Response
    {
        $church = $charityCampaign->church;
        $user = $request->user();
        $treasurerEmail = trim((string) ($church?->treasurer_notification_email ?? ''));
        $donationUrl = $charityCampaign->isMoneyCampaign()
            ? ($church?->donation_url ?: 'https://giving.7me.app/guest-donation/church/96ccdd6e-f537-49be-88dd-ffc112442cd9')
            : null;

        $recentDonations = $charityCampaign->isItemCampaign()
            ? $charityCampaign->itemDonations()
                ->with('user:id,name')
                ->whereIn('status', [CharityItemDonation::STATUS_PLEDGED, CharityItemDonation::STATUS_RECEIVED])
                ->orderByDesc('pledged_at')
                ->limit(10)
                ->get()
                ->map(fn (CharityItemDonation $d) => [
                    'entry_type' => 'item',
                    'donor_name' => $d->donorDisplayName(),
                    'item_description' => $d->item_description,
                    'quantity' => $d->quantity,
                    'unit_label' => $d->unit_label ?: $charityCampaign->unit_label,
                    'status' => $d->status,
                    'confirmed_at' => ($d->received_at ?? $d->pledged_at)?->toIso8601String(),
                ])
            : $charityCampaign->donations()
                ->with('user:id,name')
                ->orderByDesc('confirmed_at')
                ->limit(10)
                ->get()
                ->map(fn (CharityDonation $d) => [
                    'entry_type' => 'money',
                    'donor_name' => $d->donorDisplayName(),
                    'amount' => (float) $d->amount,
                    'confirmed_at' => $d->confirmed_at->toIso8601String(),
                ]);

        return Inertia::render('Mobile/Donations/Show', [
            'campaign' => $charityCampaign->toMobileArray(true),
            'recentDonations' => $recentDonations,
            'donationUrl' => $donationUrl,
            'transparency' => [
                'church_name' => $church?->name,
                'treasurer_notifications_enabled' => $treasurerEmail !== '' && filter_var($treasurerEmail, FILTER_VALIDATE_EMAIL),
                'donor_name' => $user?->name,
                'donor_email' => $user?->email,
            ],
            'pix' => [
                'church_name' => $church?->name,
                'pix_key' => $church?->pix_key,
            ],
            'localOffer' => [
                'pixKey' => 'novasemente.ap@adventistas.org',
                'merchantName' => 'Nova Semente',
                'merchantCity' => 'SAO PAULO',
            ],
        ]);
    }

    public function uploadReceipt(Request $request, CharityCampaign $charityCampaign, ReceiptOcrService $ocr): JsonResponse
    {
        if ($charityCampaign->isItemCampaign()) {
            return response()->json(['message' => 'Campanhas de objetos não usam comprovante PIX.'], 422);
        }

        if (! $charityCampaign->isAcceptingDonations()) {
            return response()->json(['message' => 'Esta campanha não está aceitando doações no momento.'], 422);
        }

        $request->validate([
            'receipt' => ['required', 'image', 'max:8192'],
        ]);

        $file = $request->file('receipt');
        $hash = hash_file('sha256', $file->getRealPath());

        if (CharityDonation::query()->where('receipt_hash', $hash)->exists()) {
            return response()->json(['message' => 'Este comprovante já foi utilizado em outra doação.'], 422);
        }

        $path = $file->store('charity/receipts/pending', 'public');
        $absolutePath = Storage::disk('public')->path($path);

        $ocrResult = $ocr->extractAmount($absolutePath);

        $request->session()->put($this->sessionKey($charityCampaign->id), [
            'receipt_path' => $path,
            'receipt_hash' => $hash,
            'ocr_suggested_amount' => $ocrResult['suggested_amount'],
            'ocr_confidence' => $ocrResult['confidence'],
        ]);

        return response()->json([
            'suggested_amount' => $ocrResult['suggested_amount'],
            'confidence' => $ocrResult['confidence'],
            'receipt_preview_url' => Storage::disk('public')->url($path),
            'needs_manual_amount' => $ocrResult['suggested_amount'] === null,
        ]);
    }

    public function confirmDonation(Request $request, CharityCampaign $charityCampaign): RedirectResponse
    {
        if ($charityCampaign->isItemCampaign()) {
            return redirect()->back()->with('error', 'Esta campanha recebe objetos. Registre a promessa do item em vez de enviar comprovante.');
        }

        if (! $charityCampaign->isAcceptingDonations()) {
            return redirect()->back()->with('error', 'Esta campanha não está aceitando doações no momento.');
        }

        $pending = $request->session()->get($this->sessionKey($charityCampaign->id));
        if (! is_array($pending) || empty($pending['receipt_path']) || empty($pending['receipt_hash'])) {
            return redirect()->back()->with('error', 'Envie o comprovante antes de confirmar a doação.');
        }

        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01', 'max:999999.99'],
            'is_anonymous' => ['boolean'],
            'send_email_confirmation' => ['boolean'],
        ]);

        if (CharityDonation::query()->where('receipt_hash', $pending['receipt_hash'])->exists()) {
            $request->session()->forget($this->sessionKey($charityCampaign->id));

            return redirect()->back()->with('error', 'Este comprovante já foi utilizado em outra doação.');
        }

        $pendingPath = $pending['receipt_path'];
        $finalPath = 'charity/receipts/'.basename($pendingPath);

        if ($pendingPath !== $finalPath && Storage::disk('public')->exists($pendingPath)) {
            Storage::disk('public')->move($pendingPath, $finalPath);
        }

        $donation = DB::transaction(function () use ($request, $charityCampaign, $pending, $data, $finalPath) {
            $campaign = CharityCampaign::query()->lockForUpdate()->findOrFail($charityCampaign->id);

            $donation = CharityDonation::create([
                'campaign_id' => $campaign->id,
                'user_id' => $request->user()->id,
                'amount' => $data['amount'],
                'ocr_suggested_amount' => $pending['ocr_suggested_amount'] ?? null,
                'receipt_path' => $finalPath,
                'receipt_hash' => $pending['receipt_hash'],
                'is_anonymous' => $request->boolean('is_anonymous'),
                'donor_email_confirmation_requested' => $request->boolean('send_email_confirmation'),
                'confirmed_at' => now(),
            ]);

            $campaign->increment('raised_amount', $data['amount']);

            return $donation;
        });

        app(NotifyTreasurerOfCharityDonation::class)->handle($donation);
        app(NotifyDonorOfCharityDonation::class)->handle($donation);
        app(CharityDonationNotifier::class)->notifyStakeholdersOfNewDonation($donation);

        $request->session()->forget($this->sessionKey($charityCampaign->id));

        return redirect()
            ->route('mobile.donations.show', $charityCampaign)
            ->with('success', 'Doação registrada com sucesso! Obrigado pela contribuição. Você pode acompanhar em Minhas doações.');
    }

    public function pledgeItemDonation(Request $request, CharityCampaign $charityCampaign): RedirectResponse
    {
        if (! $charityCampaign->isItemCampaign()) {
            return redirect()->back()->with('error', 'Esta campanha recebe doações financeiras.');
        }

        if (! $charityCampaign->isAcceptingDonations()) {
            return redirect()->back()->with('error', 'Esta campanha não está aceitando doações no momento.');
        }

        $data = $request->validate([
            'item_description' => ['required', 'string', 'max:255'],
            'quantity' => ['required', 'integer', 'min:1', 'max:999999'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'is_anonymous' => ['boolean'],
        ]);

        $pledge = DB::transaction(function () use ($request, $charityCampaign, $data) {
            $campaign = CharityCampaign::query()->lockForUpdate()->findOrFail($charityCampaign->id);

            $pledge = CharityItemDonation::create([
                'campaign_id' => $campaign->id,
                'source' => CharityItemDonation::SOURCE_APP,
                'user_id' => $request->user()->id,
                'item_description' => trim($data['item_description']),
                'quantity' => (int) $data['quantity'],
                'unit_label' => $campaign->unit_label,
                'notes' => $data['notes'] ?? null,
                'status' => CharityItemDonation::STATUS_PLEDGED,
                'is_anonymous' => $request->boolean('is_anonymous'),
                'pledged_at' => now(),
            ]);

            $campaign->recalculateItemProgress();

            return $pledge;
        });

        app(CharityItemDonationNotifier::class)->notifyStakeholdersOfNewPledge($pledge);

        return redirect()
            ->route('mobile.donations.show', $charityCampaign)
            ->with('success', 'Promessa de doação registrada com sucesso! A equipe confirmará o recebimento quando o item for entregue.');
    }

    public function myDonations(Request $request): Response
    {
        $moneyDonations = CharityDonation::query()
            ->with([
                'campaign:id,title',
                'adjustments' => fn ($q) => $q->orderByDesc('created_at'),
            ])
            ->where('user_id', $request->user()->id)
            ->orderByDesc('confirmed_at')
            ->get()
            ->map(fn (CharityDonation $d) => array_merge($d->toMobileArray(), [
                'sort_at' => $d->confirmed_at?->timestamp ?? 0,
            ]));

        $itemDonations = CharityItemDonation::query()
            ->with('campaign:id,title,unit_label')
            ->where('user_id', $request->user()->id)
            ->orderByDesc('pledged_at')
            ->get()
            ->map(fn (CharityItemDonation $d) => array_merge($d->toMobileArray(), [
                'sort_at' => ($d->received_at ?? $d->pledged_at)?->timestamp ?? 0,
            ]));

        $donations = $moneyDonations
            ->concat($itemDonations)
            ->sortByDesc('sort_at')
            ->values()
            ->map(function (array $entry) {
                unset($entry['sort_at']);

                return $entry;
            });

        return Inertia::render('Mobile/Donations/MyDonations', [
            'donations' => $donations,
        ]);
    }

    public function submitDispute(Request $request, CharityDonation $charityDonation): RedirectResponse
    {
        if ($charityDonation->user_id !== $request->user()->id) {
            abort(403);
        }

        if ($charityDonation->dispute_status === CharityDonation::DISPUTE_PENDING) {
            return redirect()->back()->with('error', 'Sua reclamação já está em análise.');
        }

        $data = $request->validate([
            'dispute_message' => ['required', 'string', 'min:10', 'max:2000'],
        ]);

        $charityDonation->update([
            'dispute_message' => $data['dispute_message'],
            'dispute_status' => CharityDonation::DISPUTE_PENDING,
            'disputed_at' => now(),
            'dispute_resolution_note' => null,
            'dispute_resolved_at' => null,
        ]);

        return redirect()
            ->route('mobile.donations.my-donations')
            ->with('success', 'Reclamação enviada. A equipe financeira irá analisar.');
    }
}
