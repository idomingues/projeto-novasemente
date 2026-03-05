<?php

namespace App\Http\Middleware;

use App\Models\Church;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $currentChurch = null;
        if ($request->user()) {
            $workingChurchId = $request->session()->get('working_church_id');
            if ($workingChurchId) {
                $church = Church::where('id', $workingChurchId)->where('active', true)->first();
            }
            if (empty($church)) {
                $church = Church::where('active', true)->orderBy('name')->first();
            }
            if ($church) {
                $currentChurch = [
                    'id' => $church->id,
                    'name' => $church->name,
                    'slug' => $church->slug,
                    'logo_url' => $church->logo_url,
                ];
            }
        }

        $churchesForSwitch = [];
        if ($request->user()?->hasRole('super_admin')) {
            $churchesForSwitch = Church::where('active', true)->orderBy('name')->get(['id', 'name'])->toArray();
        }

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user() ? $request->user()->load('member') : null,
                'permissions' => $request->user() ? $request->user()->getAllPermissions()->pluck('name')->toArray() : [],
            ],
            'currentChurch' => $currentChurch,
            'churchesForSwitch' => $churchesForSwitch,
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
        ];
    }
}
