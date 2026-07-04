<?php

namespace App\Http\Controllers;

use App\Actions\Donations\NotifyDonorOfCampaignDonation;
use App\Actions\Donations\NotifyTreasurerOfCampaignDonation;
use App\Models\CampaignDonation;
use App\Models\Church;
use App\Models\DonationCampaign;
use App\Services\CampaignDonationNotifier;
use App\Services\ReceiptOcrService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class DonationCampaignMobileController extends Controller
{
    private function sessionKey(int $campaignId): string
    {
        return 'pending_campaign_donation_'.$campaignId;
    }

    private function resolveChurchId(): ?int
    {
        return Church::resolveWorkingId(request())
            ?? Church::query()->where('active', true)->orderBy('name')->value('id');
    }

    public function index(): Response
    {
        $churchId = $this->resolveChurchId();

        $campaigns = DonationCampaign::query()
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->where(function ($q) {
                $q->where(function ($active) {
                    $active->where('status', DonationCampaign::STATUS_ACTIVE)
                        ->where(function ($dates) {
                            $dates->whereNull('ends_at')->orWhereDate('ends_at', '>=', now()->toDateString());
                        });
                })->orWhere('status', DonationCampaign::STATUS_CLOSED);
            })
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (DonationCampaign $c) => $c->toMobileArray());

        return Inertia::render('Mobile/DonationCampaigns/Index', [
            'campaigns' => $campaigns,
        ]);
    }

    public function show(Request $request, DonationCampaign $donationCampaign): Response
    {
        $church = $donationCampaign->church;
        $user = $request->user();
        $treasurerEmail = trim((string) ($church?->treasurer_notification_email ?? ''));
        $donationUrl = $church?->donation_url ?: 'https://giving.7me.app/guest-donation/church/96ccdd6e-f537-49be-88dd-ffc112442cd9';

        $recentDonations = $donationCampaign->donations()
            ->with('user:id,name')
            ->orderByDesc('confirmed_at')
            ->limit(10)
            ->get()
            ->map(fn (CampaignDonation $d) => [
                'donor_name' => $d->donorDisplayName(),
                'amount' => (float) $d->amount,
                'confirmed_at' => $d->confirmed_at->toIso8601String(),
            ]);

        return Inertia::render('Mobile/DonationCampaigns/Show', [
            'campaign' => $donationCampaign->toMobileArray(true),
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

    public function uploadReceipt(Request $request, DonationCampaign $donationCampaign, ReceiptOcrService $ocr): JsonResponse
    {
        if (! $donationCampaign->isAcceptingDonations()) {
            return response()->json(['message' => 'Esta campanha não está aceitando doações no momento.'], 422);
        }

        $validated = $request->validate([
            'receipt' => ['required', 'image', 'max:8192'],
        ]);

        $file = $request->file('receipt');
        $hash = hash_file('sha256', $file->getRealPath());

        if (CampaignDonation::query()->where('receipt_hash', $hash)->exists()) {
            return response()->json(['message' => 'Este comprovante já foi utilizado em outra doação.'], 422);
        }

        $path = $file->store('donations/receipts/pending', 'public');
        $absolutePath = Storage::disk('public')->path($path);

        $ocrResult = $ocr->extractAmount($absolutePath);

        $request->session()->put($this->sessionKey($donationCampaign->id), [
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

    public function confirmDonation(Request $request, DonationCampaign $donationCampaign): RedirectResponse
    {
        if (! $donationCampaign->isAcceptingDonations()) {
            return redirect()->back()->with('error', 'Esta campanha não está aceitando doações no momento.');
        }

        $pending = $request->session()->get($this->sessionKey($donationCampaign->id));
        if (! is_array($pending) || empty($pending['receipt_path']) || empty($pending['receipt_hash'])) {
            return redirect()->back()->with('error', 'Envie o comprovante antes de confirmar a doação.');
        }

        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01', 'max:999999.99'],
            'is_anonymous' => ['boolean'],
            'send_email_confirmation' => ['boolean'],
        ]);

        if (CampaignDonation::query()->where('receipt_hash', $pending['receipt_hash'])->exists()) {
            $request->session()->forget($this->sessionKey($donationCampaign->id));

            return redirect()->back()->with('error', 'Este comprovante já foi utilizado em outra doação.');
        }

        $pendingPath = $pending['receipt_path'];
        $finalPath = 'donations/receipts/'.basename($pendingPath);

        if ($pendingPath !== $finalPath && Storage::disk('public')->exists($pendingPath)) {
            Storage::disk('public')->move($pendingPath, $finalPath);
        }

        $donation = DB::transaction(function () use ($request, $donationCampaign, $pending, $data, $finalPath) {
            $campaign = DonationCampaign::query()->lockForUpdate()->findOrFail($donationCampaign->id);

            $donation = CampaignDonation::create([
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

        app(NotifyTreasurerOfCampaignDonation::class)->handle($donation);
        app(NotifyDonorOfCampaignDonation::class)->handle($donation);
        app(CampaignDonationNotifier::class)->notifyStakeholdersOfNewDonation($donation);

        $request->session()->forget($this->sessionKey($donationCampaign->id));

        return redirect()
            ->route('mobile.campaigns.show', $donationCampaign)
            ->with('success', 'Doação registrada com sucesso! Obrigado pela contribuição. Você pode acompanhar em Minhas doações.');
    }

    public function myDonations(Request $request): Response
    {
        $donations = CampaignDonation::query()
            ->with([
                'campaign:id,title',
                'adjustments' => fn ($q) => $q->orderByDesc('created_at'),
            ])
            ->where('user_id', $request->user()->id)
            ->orderByDesc('confirmed_at')
            ->get()
            ->map(fn (CampaignDonation $d) => $d->toMobileArray());

        return Inertia::render('Mobile/DonationCampaigns/MyDonations', [
            'donations' => $donations,
        ]);
    }

    public function submitDispute(Request $request, CampaignDonation $campaignDonation): RedirectResponse
    {
        if ($campaignDonation->user_id !== $request->user()->id) {
            abort(403);
        }

        if ($campaignDonation->dispute_status === CampaignDonation::DISPUTE_PENDING) {
            return redirect()->back()->with('error', 'Sua reclamação já está em análise.');
        }

        $data = $request->validate([
            'dispute_message' => ['required', 'string', 'min:10', 'max:2000'],
        ]);

        $campaignDonation->update([
            'dispute_message' => $data['dispute_message'],
            'dispute_status' => CampaignDonation::DISPUTE_PENDING,
            'disputed_at' => now(),
            'dispute_resolution_note' => null,
            'dispute_resolved_at' => null,
        ]);

        return redirect()
            ->route('mobile.campaigns.my-donations')
            ->with('success', 'Reclamação enviada. A equipe financeira irá analisar.');
    }
}
