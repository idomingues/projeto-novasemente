<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Support\GivingLinks;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OfferingLandingController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $churchId = Church::resolveWorkingId($request);
        $church = $churchId !== null ? Church::query()->whereKey($churchId)->first() : null;

        return Inertia::render('OfferingLanding', [
            'churchName' => $church?->name ?: 'Nova Semente',
            'churchLogoUrl' => $church?->logo_url,
            'titheUrl' => GivingLinks::TITHE_FALLBACK_URL,
            'offeringUrl' => GivingLinks::offeringUrl(),
        ]);
    }
}
