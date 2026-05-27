<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\DonationItemCampaign;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DonationItemCampaignMobileController extends Controller
{
    private function resolveChurchId(): ?int
    {
        return Church::resolveWorkingId(request())
            ?? Church::query()->where('active', true)->orderBy('name')->value('id');
    }

    public function index(): Response
    {
        $churchId = $this->resolveChurchId();

        $campaigns = DonationItemCampaign::query()
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->whereIn('status', [DonationItemCampaign::STATUS_ACTIVE, DonationItemCampaign::STATUS_CLOSED])
            ->orderByDesc('created_at')
            ->get()
            ->filter(fn (DonationItemCampaign $c) => $c->isActiveOrClosedForMobile())
            ->values()
            ->map(fn (DonationItemCampaign $c) => $c->toMobileArray());

        return Inertia::render('Mobile/DonationItemCampaigns/Index', [
            'campaigns' => $campaigns,
        ]);
    }

    public function show(Request $request, DonationItemCampaign $donationItemCampaign): Response
    {
        return Inertia::render('Mobile/DonationItemCampaigns/Show', [
            'campaign' => $donationItemCampaign->toMobileArray(true),
        ]);
    }
}

