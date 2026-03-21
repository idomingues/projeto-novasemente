<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\PrayerRequest;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PrayerRequestController extends Controller
{
    private function currentChurchId(): ?int
    {
        $workingChurchId = request()->session()->get('working_church_id');
        if ($workingChurchId) {
            $church = Church::where('id', $workingChurchId)->where('active', true)->first();
            if ($church) {
                return (int) $church->id;
            }
        }
        $first = Church::where('active', true)->orderBy('name')->first();

        return $first?->id;
    }

    private function getRequests(): \Illuminate\Support\Collection
    {
        $churchId = $this->currentChurchId();

        return PrayerRequest::query()
            ->where(function ($q) use ($churchId) {
                $q->whereNull('church_id');
                if ($churchId !== null) {
                    $q->orWhere('church_id', $churchId);
                }
            })
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (PrayerRequest $p) => [
                'id' => $p->id,
                'name_or_nickname' => $p->name_or_nickname,
                'request' => $p->request,
                'created_at' => $p->created_at->toIso8601String(),
                'month_year' => $p->created_at->format('Y-m'),
                'prayer_amen_count' => (int) $p->prayer_amen_count,
            ]);
    }

    public function index(): Response
    {
        $requests = $this->getRequests();

        return Inertia::render('Prayer/Index', [
            'requests' => $requests,
        ]);
    }

    public function mobile(): Response
    {
        $requests = $this->getRequests();

        return Inertia::render('Prayer/Mobile', [
            'requests' => $requests,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name_or_nickname' => ['required', 'string', 'max:255'],
            'request' => ['required', 'string', 'max:2000'],
        ]);

        $churchId = $this->currentChurchId();

        PrayerRequest::create([
            'church_id' => $churchId,
            'name_or_nickname' => $data['name_or_nickname'],
            'request' => $data['request'],
        ]);

        $isMobile = $request->header('Referer') && str_contains($request->header('Referer'), '/mobile/');

        return redirect()
            ->to($isMobile ? route('mobile.prayer') : route('prayer.index'))
            ->with('success', 'Pedido de oração enviado. Obrigado!');
    }

    public function amen(Request $request, PrayerRequest $prayer)
    {
        $churchId = $this->currentChurchId();
        $visible = PrayerRequest::query()
            ->whereKey($prayer->id)
            ->where(function ($q) use ($churchId) {
                $q->whereNull('church_id');
                if ($churchId !== null) {
                    $q->orWhere('church_id', $churchId);
                }
            })
            ->exists();
        if (! $visible) {
            abort(404);
        }

        $prayer->increment('prayer_amen_count');

        return back();
    }
}
