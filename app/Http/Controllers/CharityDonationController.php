<?php

namespace App\Http\Controllers;

use App\Actions\Donations\NotifyTreasurerOfCharityDonation;
use App\Models\CharityCampaign;
use App\Models\CharityDonation;
use App\Models\CharityDonationAdjustment;
use App\Models\User;
use App\Services\CharityDonationNotifier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CharityDonationController extends Controller
{
    public const DISPUTE_PENDING = 'pending';

    public const DISPUTE_RESOLVED = 'resolved';

    private function assertCanManageDonation(?User $user): void
    {
        if (! $user) {
            abort(403);
        }
        if ($user->hasAnyRole(['super_admin', 'admin'])) {
            return;
        }
        if ($user->can('finance.view') || $user->can('donations.manage')) {
            return;
        }
        abort(403);
    }

    public function storeManual(Request $request, CharityCampaign $charityCampaign): RedirectResponse
    {
        $this->assertCanManageDonation($request->user());

        if ($charityCampaign->status === CharityCampaign::STATUS_ARCHIVED) {
            return redirect()->back()->with('error', 'Não é possível registrar doações em campanhas arquivadas.');
        }

        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01', 'max:999999.99'],
            'external_donor_name' => ['nullable', 'string', 'max:255', 'required_without:user_id'],
            'user_id' => ['nullable', 'integer', Rule::exists('users', 'id')],
            'manual_registration_note' => ['required', 'string', 'min:10', 'max:2000'],
            'confirmed_at' => ['nullable', 'date'],
            'is_anonymous' => ['boolean'],
            'receipt' => ['nullable', 'image', 'max:8192'],
        ]);

        $externalName = trim((string) ($data['external_donor_name'] ?? ''));
        $memberId = isset($data['user_id']) ? (int) $data['user_id'] : null;

        if ($memberId === null && $externalName === '') {
            return redirect()->back()->withErrors([
                'external_donor_name' => 'Informe o nome do doador ou vincule a um usuário do app.',
            ]);
        }

        if ($memberId !== null) {
            $member = User::query()->find($memberId);
            if (! $member || $member->church_id !== $charityCampaign->church_id) {
                return redirect()->back()->withErrors([
                    'user_id' => 'Selecione um usuário da mesma igreja da campanha.',
                ]);
            }
        }

        $receiptPath = null;
        $receiptHash = 'manual:'.Str::uuid()->toString();

        if ($request->hasFile('receipt')) {
            $file = $request->file('receipt');
            $receiptHash = hash_file('sha256', $file->getRealPath());
            if (CharityDonation::query()->where('receipt_hash', $receiptHash)->exists()) {
                return redirect()->back()->with('error', 'Este comprovante já foi utilizado em outra doação.');
            }
            $receiptPath = $file->store('charity/receipts', 'public');
        }

        $amount = round((float) $data['amount'], 2);
        $confirmedAt = isset($data['confirmed_at']) ? \Carbon\Carbon::parse($data['confirmed_at']) : now();

        $donation = DB::transaction(function () use ($request, $charityCampaign, $data, $memberId, $externalName, $receiptPath, $receiptHash, $amount, $confirmedAt) {
            $campaign = CharityCampaign::query()->lockForUpdate()->findOrFail($charityCampaign->id);

            $donation = CharityDonation::create([
                'campaign_id' => $campaign->id,
                'source' => CharityDonation::SOURCE_MANUAL,
                'user_id' => $memberId,
                'external_donor_name' => $externalName !== '' ? $externalName : null,
                'amount' => $amount,
                'receipt_path' => $receiptPath,
                'receipt_hash' => $receiptHash,
                'is_anonymous' => $request->boolean('is_anonymous'),
                'manual_registration_note' => trim($data['manual_registration_note']),
                'registered_by' => $request->user()->id,
                'confirmed_at' => $confirmedAt,
            ]);

            $campaign->update([
                'raised_amount' => $campaign->donations()->sum('amount'),
            ]);

            return $donation;
        });

        app(NotifyTreasurerOfCharityDonation::class)->handle($donation);
        app(CharityDonationNotifier::class)->notifyStakeholdersOfNewDonation($donation);

        return redirect()->back()->with('success', 'Doação manual registrada com sucesso.');
    }

    public function updateAmount(Request $request, CharityDonation $charityDonation): RedirectResponse
    {
        $this->assertCanManageDonation($request->user());

        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01', 'max:999999.99'],
            'adjustment_note' => ['required', 'string', 'min:10', 'max:2000'],
            'dispute_resolution_note' => ['nullable', 'string', 'max:2000'],
            'resolve_dispute' => ['boolean'],
        ]);

        $newAmount = round((float) $data['amount'], 2);
        $oldAmount = (float) $charityDonation->amount;

        if ($newAmount === $oldAmount) {
            return redirect()->back()->with('error', 'Informe um valor diferente do atual para ajustar.');
        }

        DB::transaction(function () use ($request, $charityDonation, $data, $newAmount, $oldAmount) {
            $donation = CharityDonation::query()->lockForUpdate()->findOrFail($charityDonation->id);
            $campaign = CharityCampaign::query()->lockForUpdate()->findOrFail($donation->campaign_id);

            $update = [
                'amount' => $newAmount,
                'amount_before_adjustment' => $donation->amount_before_adjustment ?? $oldAmount,
                'adjustment_note' => $data['adjustment_note'],
                'adjusted_by' => $request->user()->id,
                'adjusted_at' => now(),
            ];

            $shouldResolve = $request->boolean('resolve_dispute', true);
            if ($donation->dispute_status === self::DISPUTE_PENDING && $shouldResolve) {
                $update['dispute_status'] = self::DISPUTE_RESOLVED;
                $update['dispute_resolved_at'] = now();
                if (! empty($data['dispute_resolution_note'])) {
                    $update['dispute_resolution_note'] = $data['dispute_resolution_note'];
                }
            }

            $donation->update($update);

            CharityDonationAdjustment::create([
                'charity_donation_id' => $donation->id,
                'amount_before' => $oldAmount,
                'amount_after' => $newAmount,
                'adjustment_note' => trim($data['adjustment_note']),
                'adjusted_by' => $request->user()->id,
            ]);

            $campaign->update([
                'raised_amount' => $campaign->donations()->sum('amount'),
            ]);
        });

        return redirect()->back()->with('success', 'Valor da doação atualizado com sucesso.');
    }

    public function resolveDispute(Request $request, CharityDonation $charityDonation): RedirectResponse
    {
        $this->assertCanManageDonation($request->user());

        if ($charityDonation->dispute_status !== self::DISPUTE_PENDING) {
            return redirect()->back()->with('error', 'Esta doação não possui reclamação pendente.');
        }

        $data = $request->validate([
            'dispute_resolution_note' => ['required', 'string', 'max:2000'],
        ]);

        $charityDonation->update([
            'dispute_status' => self::DISPUTE_RESOLVED,
            'dispute_resolution_note' => $data['dispute_resolution_note'],
            'dispute_resolved_at' => now(),
        ]);

        return redirect()->back()->with('success', 'Reclamação marcada como resolvida.');
    }
}
