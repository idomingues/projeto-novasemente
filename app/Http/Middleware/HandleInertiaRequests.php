<?php

namespace App\Http\Middleware;

use App\Models\AppVersion;
use App\Models\Church;
use App\Support\NotificationFeed;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
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
        $church = null;
        if ($request->user()) {
            $workingChurchId = $request->session()->get('working_church_id');
            if ($workingChurchId) {
                $church = Church::where('id', $workingChurchId)->where('active', true)->first();
            }
        }
        if ($church === null) {
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

        $churchesForSwitch = [];
        if ($request->user()?->hasRole('super_admin')) {
            $churchesForSwitch = Church::where('active', true)->orderBy('name')->get(['id', 'name'])->toArray();
        }

        $canAccessAdminMenu = false;
        if ($request->user()) {
            $roleNames = $request->user()->getRoleNames()->toArray();
            $adminRoles = ['admin', 'super_admin', 'pastor', 'secretaria', 'lider_ministerio'];
            $canAccessAdminMenu = ! empty(array_intersect($roleNames, $adminRoles));
        }

        $roleLabel = null;
        if ($request->user()) {
            $names = $request->user()->getRoleNames();
            $first = $names->first();
            $roleLabel = match ($first) {
                'super_admin' => 'Super Admin',
                'admin' => 'Administrador',
                'lider_ministerio' => 'Líder de ministério',
                'secretaria' => 'Secretaria',
                'pastor' => 'Pastor',
                'financeiro' => 'Financeiro',
                default => $first ? ucfirst(str_replace('_', ' ', $first)) : null,
            };
        }

        $appLogoUrl = Church::where('active', true)->orderBy('name')->first()?->logo_url;
        $appName = ($currentChurch ? $currentChurch['name'] : null) ?? Church::where('active', true)->orderBy('name')->value('name') ?? config('app.name');
        $faviconUrl = ($currentChurch ? $currentChurch['logo_url'] : null) ?? $appLogoUrl;

        $canManageSettings = $request->user()?->hasAnyRole(['admin', 'super_admin']) ?? false;

        $appVersionHistory = [];
        if (Schema::hasTable('app_versions')) {
            try {
                $appVersionHistory = AppVersion::query()
                    ->orderByDesc('released_at')
                    ->orderByDesc('id')
                    ->limit(50)
                    ->get()
                    ->map(fn (AppVersion $v) => [
                        'version' => $v->version,
                        'releasedAt' => $v->released_at?->toIso8601String(),
                        'notes' => $v->notes,
                    ])
                    ->values()
                    ->all();
            } catch (\Throwable) {
                $appVersionHistory = [];
            }
        }

        return [
            ...parent::share($request),
            'appVersion' => AppVersion::latestLabel(),
            'appVersionHistory' => $appVersionHistory,
            'appUrl' => $request->getSchemeAndHttpHost(),
            'appLogoUrl' => $appLogoUrl,
            'appName' => $appName,
            'faviconUrl' => $faviconUrl,
            'auth' => [
                'user' => $request->user() ? $request->user()->load('member') : null,
                'permissions' => $request->user() ? $request->user()->getAllPermissions()->pluck('name')->toArray() : [],
                'roleLabel' => $roleLabel,
                'canAccessAdminMenu' => $canAccessAdminMenu,
                'canManageSettings' => $canManageSettings,
            ],
            'currentChurch' => $currentChurch,
            'churchesForSwitch' => $churchesForSwitch,
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'invitation_link' => fn () => $request->session()->get('invitation_link'),
            ],
            'recentNotifications' => fn () => NotificationFeed::mergedForUser(
                $request,
                $currentChurch ? ($currentChurch['id'] ?? null) : null,
                5
            ),
            'unreadInboxNotificationsCount' => fn () => NotificationFeed::unreadInboxCount($request),
        ];
    }
}
