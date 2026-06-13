<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreMissionTripRegistrationRequest;
use App\Models\Church;
use App\Models\MissionTripRegistration;
use App\Support\MissionTripRegistrationExport;
use App\Support\MissionTripRegistrationPresenter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MissionTripRegistrationController extends Controller
{
    /** @return array<string, mixed> */
    private function signupPageProps(): array
    {
        return [
            'storeUrl' => route('mobile.mission.trip-registration.store'),
            'professions' => config('mission.trip_professions', []),
            'missionHomeUrl' => route('mobile.mission.home'),
        ];
    }

    public function create(Request $request): Response
    {
        abort_unless(Church::resolveWorkingId($request), 404);

        return Inertia::render('Mobile/MissionTripSignup', $this->signupPageProps());
    }

    public function index(Request $request): Response
    {
        $churchId = Church::resolveWorkingId($request);
        abort_unless($churchId, 404);

        $search = trim((string) $request->query('search', ''));

        $registrations = MissionTripRegistration::query()
            ->where('church_id', $churchId)
            ->where('trip_slug', MissionTripRegistration::TRIP_THAILAND_MYANMAR_2026)
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('full_name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%")
                        ->orWhere('instagram', 'like', "%{$search}%");
                });
            })
            ->orderByDesc('created_at')
            ->paginate(25)
            ->withQueryString()
            ->through(fn (MissionTripRegistration $registration) => MissionTripRegistrationPresenter::row($registration));

        return Inertia::render('Mission/TripRegistrations', [
            'registrations' => $registrations,
            'filters' => [
                'search' => $search,
            ],
            'exportUrl' => route('mission.trip-registrations.export', $request->query()),
            'signupUrl' => route('mobile.mission.trip-registration.create'),
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $churchId = Church::resolveWorkingId($request);
        abort_unless($churchId, 404);

        $search = trim((string) $request->query('search', ''));

        return MissionTripRegistrationExport::streamedDownload((int) $churchId, $search);
    }

    public function store(StoreMissionTripRegistrationRequest $request): RedirectResponse
    {
        $churchId = Church::resolveWorkingId($request);
        abort_unless($churchId, 404);

        $valid = $request->validated();

        MissionTripRegistration::query()->updateOrCreate(
            [
                'church_id' => $churchId,
                'trip_slug' => MissionTripRegistration::TRIP_THAILAND_MYANMAR_2026,
                'email' => $valid['email'],
            ],
            [
                'user_id' => $request->user()?->id,
                'full_name' => $valid['full_name'],
                'instagram' => $valid['instagram'] ?? null,
                'phone' => $valid['phone'],
                'has_passport' => (bool) $valid['has_passport'],
                'participated_foreign_mission_before' => (bool) $valid['participated_foreign_mission_before'],
                'profession' => $valid['profession'],
                'profession_other' => $valid['profession'] === 'Outro'
                    ? ($valid['profession_other'] ?? null)
                    : null,
            ],
        );

        return redirect()
            ->route('mobile.mission.trip-registration.create')
            ->with('trip_signup_success', true)
            ->with('trip_signup_name', $valid['full_name']);
    }
}
