<?php

namespace App\Http\Controllers;

use App\Models\Church;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AppDownloadLandingController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $churchId = Church::resolveWorkingId($request);
        $church = $churchId !== null ? Church::query()->whereKey($churchId)->first() : null;

        return Inertia::render('AppDownloadLanding', [
            'churchName' => $church?->name ?: 'Nova Semente',
            'churchLogoUrl' => $church?->logo_url,
            'iosAppStoreUrl' => (string) config('services.ios_app_store_url'),
            'androidPlayStoreUrl' => (string) config('services.android_play_store_url'),
        ]);
    }
}
