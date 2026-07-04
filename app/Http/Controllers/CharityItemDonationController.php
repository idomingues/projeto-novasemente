<?php

namespace App\Http\Controllers;

use App\Models\CharityCampaign;
use App\Models\CharityItemDonation;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CharityItemDonationController extends Controller
{
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

    public function receive(Request $request, CharityItemDonation $charityItemDonation): RedirectResponse
    {
        $this->assertCanManageDonation($request->user());

        if ($charityItemDonation->status !== CharityItemDonation::STATUS_PLEDGED) {
            return redirect()->back()->with('error', 'Somente promessas pendentes podem ser marcadas como recebidas.');
        }

        $data = $request->validate([
            'staff_note' => ['nullable', 'string', 'max:2000'],
        ]);

        DB::transaction(function () use ($request, $charityItemDonation, $data) {
            $donation = CharityItemDonation::query()->lockForUpdate()->findOrFail($charityItemDonation->id);
            $campaign = CharityCampaign::query()->lockForUpdate()->findOrFail($donation->campaign_id);

            $donation->update([
                'status' => CharityItemDonation::STATUS_RECEIVED,
                'received_at' => now(),
                'received_by' => $request->user()->id,
                'staff_note' => $data['staff_note'] ?? $donation->staff_note,
                'cancelled_at' => null,
            ]);

            $campaign->recalculateItemProgress();
        });

        return redirect()->back()->with('success', 'Doação de objeto marcada como recebida.');
    }

    public function update(Request $request, CharityItemDonation $charityItemDonation): RedirectResponse
    {
        $this->assertCanManageDonation($request->user());

        $data = $request->validate([
            'item_description' => ['required', 'string', 'max:255'],
            'quantity' => ['required', 'integer', 'min:1', 'max:999999'],
            'staff_note' => ['nullable', 'string', 'max:2000'],
            'adjustment_note' => ['required', 'string', 'min:5', 'max:2000'],
        ]);

        DB::transaction(function () use ($request, $charityItemDonation, $data) {
            $donation = CharityItemDonation::query()->lockForUpdate()->findOrFail($charityItemDonation->id);
            $campaign = CharityCampaign::query()->lockForUpdate()->findOrFail($donation->campaign_id);

            $oldQuantity = (int) $donation->quantity;

            $donation->update([
                'item_description' => trim($data['item_description']),
                'quantity' => (int) $data['quantity'],
                'quantity_before_adjustment' => $oldQuantity !== (int) $data['quantity']
                    ? ($donation->quantity_before_adjustment ?? $oldQuantity)
                    : $donation->quantity_before_adjustment,
                'staff_note' => $data['staff_note'] ?? null,
                'adjustment_note' => trim($data['adjustment_note']),
                'adjusted_by' => $request->user()->id,
                'adjusted_at' => now(),
            ]);

            $campaign->recalculateItemProgress();
        });

        return redirect()->back()->with('success', 'Doação de objeto atualizada com sucesso.');
    }

    public function cancel(Request $request, CharityItemDonation $charityItemDonation): RedirectResponse
    {
        $this->assertCanManageDonation($request->user());

        if ($charityItemDonation->status !== CharityItemDonation::STATUS_PLEDGED) {
            return redirect()->back()->with('error', 'Apenas promessas pendentes podem ser canceladas.');
        }

        $data = $request->validate([
            'staff_note' => ['nullable', 'string', 'max:2000'],
        ]);

        DB::transaction(function () use ($request, $charityItemDonation, $data) {
            $donation = CharityItemDonation::query()->lockForUpdate()->findOrFail($charityItemDonation->id);
            $campaign = CharityCampaign::query()->lockForUpdate()->findOrFail($donation->campaign_id);

            $donation->update([
                'status' => CharityItemDonation::STATUS_CANCELLED,
                'cancelled_at' => now(),
                'staff_note' => $data['staff_note'] ?? $donation->staff_note,
            ]);

            $campaign->recalculateItemProgress();
        });

        return redirect()->back()->with('success', 'Promessa de doação cancelada.');
    }
}
