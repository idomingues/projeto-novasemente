<?php

namespace App\Http\Controllers;

use App\Support\NotificationFeed;
use App\Models\Church;
use App\Models\ChurchService;
use App\Models\Member;
use App\Models\Ministry;
use App\Services\VolunteerScheduleOverview;
use App\Services\YoutubePlaylistsService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;
use Inertia\Response;

class VariosController extends Controller
{
    private function currentChurch(): ?Church
    {
        $workingChurchId = request()->session()->get('working_church_id');
        if ($workingChurchId) {
            $church = Church::where('id', $workingChurchId)->where('active', true)->first();
            if ($church) {
                return $church;
            }
        }
        return Church::where('active', true)->orderBy('name')->first();
    }

    private function memberPhotoPublicUrl(?Member $member): ?string
    {
        if (! $member || empty($member->photo_url)) {
            return null;
        }
        $u = $member->photo_url;
        if (str_starts_with($u, 'http://') || str_starts_with($u, 'https://')) {
            return $u;
        }
        $base = request()->getSchemeAndHttpHost();

        return $base.(str_starts_with($u, '/') ? '' : '/').$u;
    }

    public function schedule(Request $request): Response
    {
        $month = (int) $request->input('month', now()->month);
        $year = (int) $request->input('year', now()->year);

        if (! $request->user()) {
            return Inertia::render('Varios/VolunteerSchedule', [
                'canViewSchedule' => false,
                'month' => $month,
                'year' => $year,
                'memberName' => null,
                'memberPhotoUrl' => null,
                'needsMember' => false,
                'volunteerOverview' => null,
            ]);
        }

        $user = $request->user();
        $memberId = $user->member_id ? (int) $user->member_id : null;

        if (! $memberId) {
            return Inertia::render('Varios/VolunteerSchedule', [
                'canViewSchedule' => true,
                'month' => $month,
                'year' => $year,
                'memberName' => $user->name,
                'memberPhotoUrl' => null,
                'needsMember' => true,
                'volunteerOverview' => null,
            ]);
        }

        $member = Member::find($memberId);
        $overview = VolunteerScheduleOverview::forMember(
            $memberId,
            $year,
            $month,
            fn ($m) => $this->memberPhotoPublicUrl($m)
        );

        return Inertia::render('Varios/VolunteerSchedule', [
            'canViewSchedule' => true,
            'month' => $month,
            'year' => $year,
            'memberName' => $member?->name ?? $user->name,
            'memberPhotoUrl' => $this->memberPhotoPublicUrl($member),
            'needsMember' => false,
            'volunteerOverview' => $overview,
        ]);
    }

    public function services(): Response
    {
        $church = $this->currentChurch();
        $services = [];
        if ($church) {
            $services = $church->services()->get()->map(function ($s) {
                $start = Carbon::parse($s->start_time)->format('H:i');
                $end = $s->end_time ? Carbon::parse($s->end_time)->format('H:i') : null;
                return [
                    'id' => $s->id,
                    'day_of_week' => $s->day_of_week,
                    'day_name' => ChurchService::dayName($s->day_of_week),
                    'name' => $s->name,
                    'start_time' => $start,
                    'end_time' => $end,
                ];
            })->toArray();
        }

        return Inertia::render('Varios/Services', [
            'churchName' => $church?->name,
            'services' => $services,
        ]);
    }

    public function contact(): Response
    {
        $church = $this->currentChurch();
        $contact = null;
        if ($church) {
            $contact = [
                'name' => $church->name,
                'email' => $church->email,
                'phone' => $church->phone,
                'whatsapp' => $church->whatsapp,
                'address' => $church->address,
                'city' => $church->city,
                'state' => $church->state,
            ];
        }

        return Inertia::render('Varios/Contact', [
            'contact' => $contact,
        ]);
    }

    public function classeComecos(): Response
    {
        return Inertia::render('Varios/ClasseComecos', [
            'presencialUrl' => 'https://docs.google.com/forms/d/e/1FAIpQLScBw6m09liDBLBGBJ52OwGGl0wegNxK6KpChq31w81cjuESZA/viewform',
            'onlineUrl' => 'https://docs.google.com/forms/d/e/1FAIpQLSeGNVPeTe9PYQ1w7gwN2ZPA4QN8J7LwqIJtV1iObtQqHvCdUw/viewform',
        ]);
    }

    public function acervo(): Response
    {
        $playlistsUrl = 'https://www.youtube.com/@advnovasemente/playlists';
        $playlists = YoutubePlaylistsService::fetch();

        return Inertia::render('Varios/Acervo', [
            'playlistsUrl' => $playlistsUrl,
            'playlists' => $playlists,
        ]);
    }

    public function notifications(Request $request): Response
    {
        $church = $this->currentChurch();
        $churchId = $church?->id;
        $notifications = NotificationFeed::mergedForUser($request, $churchId, 50);
        $canManage = $request->user()?->can('notifications.manage') ?? false;

        return Inertia::render('Varios/Notifications', [
            'notifications' => $notifications,
            'canManage' => $canManage,
        ]);
    }
}
