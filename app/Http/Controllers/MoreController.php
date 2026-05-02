<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\Musica;
use App\Models\PrayerRequest;
use Inertia\Inertia;
use Inertia\Response;

class MoreController extends Controller
{
    private function currentChurchId(): ?int
    {
        return Church::resolveWorkingId(request());
    }

    public function getLatestItems(): array
    {
        $churchId = $this->currentChurchId();

        $latestMusicas = Musica::query()
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereNull('church_id'))
            ->visibleInApp()
            ->orderByDesc('created_at')
            ->limit(3)
            ->get()
            ->map(fn (Musica $m) => [
                'id' => $m->id,
                'title' => $m->title,
                'youtube_url' => $m->youtube_url,
                'youtube_thumb_url' => $m->youtube_thumb_url,
            ])
            ->values()
            ->all();

        $latestPrayerRequests = PrayerRequest::query()
            ->where(function ($q) use ($churchId) {
                $q->whereNull('church_id');
                if ($churchId !== null) {
                    $q->orWhere('church_id', $churchId);
                }
            })
            ->orderByDesc('created_at')
            ->limit(5)
            ->get()
            ->map(fn (PrayerRequest $p) => [
                'id' => $p->id,
                'name_or_nickname' => $p->name_or_nickname,
                'request' => \Illuminate\Support\Str::limit($p->request, 80),
                'created_at' => $p->created_at->toIso8601String(),
            ])
            ->values()
            ->all();

        return [
            'latestMusicas' => $latestMusicas,
            'latestPrayerRequests' => $latestPrayerRequests,
        ];
    }

    public function index(): Response
    {
        $data = $this->getLatestItems();

        return Inertia::render('More/Index', $data);
    }
}
