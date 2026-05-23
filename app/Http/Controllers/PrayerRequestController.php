<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\PrayerRequest;
use App\Models\User;
use App\Models\UserInboxNotification;
use App\Support\UserMessagingPreferences;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class PrayerRequestController extends Controller
{
    private function currentChurchId(): ?int
    {
        return Church::resolveWorkingId(request());
    }

    private function getRequests(bool $includeInactive = false): \Illuminate\Support\Collection
    {
        $churchId = $this->currentChurchId();

        return PrayerRequest::query()
            ->where(function ($q) use ($churchId) {
                $q->whereNull('church_id');
                if ($churchId !== null) {
                    $q->orWhere('church_id', $churchId);
                }
            })
            ->when(! $includeInactive, fn ($q) => $q->where('active', true))
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (PrayerRequest $p) => [
                'id' => $p->id,
                'name_or_nickname' => $p->name_or_nickname,
                'request' => $p->request,
                'created_at' => $p->created_at->toIso8601String(),
                'month_year' => $p->created_at->format('Y-m'),
                'prayer_amen_count' => (int) $p->prayer_amen_count,
                'active' => (bool) $p->active,
            ]);
    }

    public function index(): Response
    {
        $canManage = request()->user()?->can('prayer.manage') ?? false;
        $requests = $this->getRequests(includeInactive: $canManage);

        return Inertia::render('Prayer/Index', [
            'requests' => $requests,
            'canManage' => $canManage,
        ]);
    }

    public function mobile(): Response
    {
        return Inertia::render('Prayer/Mobile', [
            'requests' => $this->getRequests(includeInactive: false),
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
            'user_id' => $request->user()?->id,
            'name_or_nickname' => $data['name_or_nickname'],
            'request' => $data['request'],
            'active' => true,
        ]);

        $isMobile = $request->header('Referer') && str_contains($request->header('Referer'), '/mobile/');

        return redirect()
            ->to($isMobile ? route('mobile.prayer') : route('prayer.index'))
            ->with('success', 'Pedido de oração enviado. Obrigado!');
    }

    public function update(Request $request, PrayerRequest $prayer): RedirectResponse
    {
        $this->authorize('prayer.manage');

        $data = $request->validate([
            'name_or_nickname' => ['required', 'string', 'max:255'],
            'request' => ['required', 'string', 'max:2000'],
        ]);

        $prayer->update([
            'name_or_nickname' => $data['name_or_nickname'],
            'request' => $data['request'],
        ]);

        return back()->with('success', 'Pedido atualizado.');
    }

    public function destroy(Request $request, PrayerRequest $prayer): RedirectResponse
    {
        $this->authorize('prayer.manage');

        $prayer->update(['active' => false]);

        return back()->with('success', 'Pedido desativado.');
    }

    public function setActive(Request $request, PrayerRequest $prayer): RedirectResponse
    {
        $this->authorize('prayer.manage');

        $data = $request->validate([
            'active' => ['required', 'boolean'],
        ]);

        $prayer->update(['active' => (bool) $data['active']]);

        return back()->with('success', $data['active'] ? 'Pedido reativado.' : 'Pedido desativado.');
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
            ->where('active', true)
            ->exists();
        if (! $visible) {
            abort(404);
        }

        // Qualquer pessoa pode marcar que está orando (mesmo sem login), mas limitamos a 1 ação por hora por pedido.
        $actorKey = $request->user()?->id ? 'u:'.$request->user()->id : 'g:'.sha1((string) $request->ip().'|'.(string) $request->userAgent().'|'.(string) $request->session()->getId());
        $throttleKey = 'prayer_amen:'.$prayer->id.':'.$actorKey;
        $allowed = Cache::add($throttleKey, 1, now()->addHour());
        if (! $allowed) {
            return back()->with('error', 'Você já marcou que está orando por este pedido recentemente. Aguarde 1 hora para marcar novamente.');
        }

        $prayer->increment('prayer_amen_count');

        // Notifica o autor do pedido (apenas se for usuário logado).
        $ownerId = $prayer->user_id;
        if ($ownerId) {
            $actorName = $request->user()?->name;
            $title = 'Alguém orou por você';
            $body = $actorName
                ? "{$actorName} marcou que está orando por você."
                : 'Alguém marcou que está orando por você.';
            $actionUrl = route('mobile.prayer');

            // Evita spam: não criar notificações repetidas para o mesmo pedido em curto intervalo.
            $recentExists = UserInboxNotification::query()
                ->where('user_id', $ownerId)
                ->where('action_url', $actionUrl)
                ->where('title', $title)
                ->where('body', $body)
                ->where('created_at', '>=', now()->subMinutes(10))
                ->exists();

            if (! $recentExists && (int) $ownerId !== (int) ($request->user()?->id ?? 0)) {
                $ownerUser = User::query()->find($ownerId);
                if (UserMessagingPreferences::acceptsInbox($ownerUser)) {
                    UserInboxNotification::create([
                        'user_id' => $ownerId,
                        'title' => $title,
                        'body' => $body,
                        'action_url' => $actionUrl,
                    ]);
                }
            }
        }

        return back();
    }
}
