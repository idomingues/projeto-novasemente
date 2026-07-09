<?php

namespace App\Http\Middleware;

use App\Http\Controllers\MobileChurchSolicitationController;
use App\Models\AppSupportTicket;
use App\Models\AppVersion;
use App\Models\Church;
use App\Models\ChurchSolicitation;
use App\Models\MissionTripRegistration;
use App\Models\Pastor;
use App\Support\ChurchAppFeatures;
use App\Support\MobileProjectVersionHint;
use App\Support\NotificationFeed;
use App\Support\PublicationsFeedAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Schema;
use Inertia\Middleware;
use Spatie\Permission\Models\Permission;

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
        // Igual a VolunteerController / VolunteerRequestSolicitationController::churchId (resolveWorkingId).
        $resolvedId = Church::resolveWorkingId($request);
        $church = $resolvedId !== null
            ? Church::query()->whereKey($resolvedId)->first()
            : null;
        if ($church === null) {
            $church = Church::where('active', true)->orderBy('name')->first();
        }
        if ($church === null) {
            $church = Church::query()->orderBy('id')->first();
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

        $canAccessAdminMenu = (bool) ($request->user()?->canAccessAdminMenu());

        $roleLabel = null;
        if ($request->user()) {
            $names = $request->user()->getRoleNames();
            $first = $names->first();
            $roleLabel = match ($first) {
                'super_admin' => 'Super Admin',
                'admin' => 'Administrador',
                'secretaria' => 'Secretaria',
                'pastor' => 'Pastor',
                'membro' => 'Membro',
                'lider_ministerio' => 'Líder de ministério',
                default => $first ? ucfirst(str_replace('_', ' ', $first)) : null,
            };
        }

        $appLogoUrl = Church::where('active', true)->orderBy('name')->first()?->logo_url;
        /** URL absoluta do logo padrão (evita `/logo-ns.png` em dev com APP_URL em subpasta, ex.: XAMPP/htdocs/...). */
        $defaultBrandLogoUrl = asset('logo-ns.png');
        $appName = ($currentChurch ? $currentChurch['name'] : null) ?? Church::where('active', true)->orderBy('name')->value('name') ?? config('app.name');
        $faviconUrl = ($currentChurch ? $currentChurch['logo_url'] : null) ?? $appLogoUrl;

        /** Definições da igreja (`/settings`): super admin (completo) ou quem gere a biblioteca (links Meditação/Lição). */
        $user = $request->user();
        $canManageSettings = $user !== null && (
            $user->hasRole('super_admin')
            || \App\Support\SpatiePermissionCheck::userHas($user, 'library.manage')
        );

        $canManageAppFeatures = $user !== null && (
            $user->hasRole('super_admin') || $user->hasRole('admin')
        );

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

        $appVersionFromDb = AppVersion::latestLabel();
        $appVersionShared = ($appVersionFromDb !== null && $appVersionFromDb !== '')
            ? $appVersionFromDb
            : (config('app.display_version') ?: null);
        if ($appVersionShared === null || $appVersionShared === '') {
            $hint = MobileProjectVersionHint::detect();
            $appVersionShared = ($hint !== null && $hint !== '') ? $hint : null;
        }

        $linkedPastor = null;
        /**
         * "Minha Agenda" é uma área específica do perfil de pastor.
         * Mesmo que exista um registro em `pastors`, só consideramos "ligado" quando a conta tem o papel `pastor`.
         */
        if (
            $request->user()
            && $request->user()->hasRole('pastor')
            && Schema::hasTable('pastors')
            && Schema::hasColumn('pastors', 'user_id')
        ) {
            $churchId = Church::resolveWorkingId($request);
            if ($churchId !== null) {
                $pid = Pastor::query()
                    ->where('church_id', $churchId)
                    ->where('user_id', $request->user()->id)
                    ->value('id');
                if ($pid) {
                    $linkedPastor = ['id' => (int) $pid];
                }
            }
        }

        $pastoralAgendaMenuVisible = false;
        if ($request->user()) {
            $u = $request->user();
            $agendaDelegate = false;
            if (Schema::hasTable('pastors') && Schema::hasColumn('pastors', 'agenda_delegate_user_ids')) {
                $cid = Church::resolveWorkingId($request);
                if ($cid !== null) {
                    try {
                        $agendaDelegate = Pastor::query()
                            ->where('church_id', $cid)
                            ->whereJsonContains('agenda_delegate_user_ids', $u->id)
                            ->exists();
                    } catch (\Throwable) {
                        $agendaDelegate = false;
                    }
                }
            }
            $pastoralAgendaMenuVisible = $linkedPastor !== null
                || $agendaDelegate
                || $u->hasAnyRole(['super_admin', 'admin'])
                || $u->hasRole('pastor')
                || $u->can('pastors.view')
                || $u->can('pastors.manage');
        }

        $permissionNames = [];
        if ($request->user()) {
            // Alinha o menu (sidebar) com o Gate::before em AppServiceProvider: admin/super_admin
            // podem aceder a rotas mesmo quando a tabela role_has_permissions está desatualizada.
            if ($request->user()->hasRole(['super_admin', 'admin'])) {
                $permissionNames = Permission::query()->orderBy('name')->pluck('name')->values()->all();
            } else {
                $permissionNames = $request->user()->getAllPermissions()->pluck('name')->toArray();
            }
        }

        $openSolicitationsCount = 0;
        if ($request->user()) {
            $u = $request->user();
            $atendimentoStaff = $u->hasAnyRole(['super_admin', 'admin', 'pastor', 'secretaria']);
            $canViewSolicitations = $atendimentoStaff && (
                $u->hasAnyRole(['super_admin', 'admin'])
                || $u->hasAnyPermission(['solicitations.view', 'solicitations.manage'])
            );
            $cid = Church::resolveWorkingId($request);
            if ($canViewSolicitations && $cid !== null) {
                try {
                    $openSolicitationsCount = (int) ChurchSolicitation::query()
                        ->where('church_id', (int) $cid)
                        ->whereNotIn('type', MobileChurchSolicitationController::TYPES_OUTSIDE_PASTORAL_INDEX)
                        ->whereIn('status', ['pending', 'in_progress'])
                        ->whereNull('staff_archived_at')
                        ->count();
                } catch (\Throwable) {
                    $openSolicitationsCount = 0;
                }
            }
        }

        /** Pedidos de voluntário (menu lateral), alinhado a `VolunteerRequestSolicitationController::canManageSolicitations`. */
        $openVolunteerRequestsCount = 0;
        if ($request->user()) {
            $u = $request->user();
            $canManageVolunteerRequestsStaff = $u->hasAnyRole(['super_admin', 'admin'])
                || $u->can('solicitations.manage');
            $cidVr = Church::resolveWorkingId($request);
            if ($canManageVolunteerRequestsStaff && $cidVr !== null) {
                try {
                    $openVolunteerRequestsCount = (int) ChurchSolicitation::query()
                        ->where('church_id', (int) $cidVr)
                        ->where('type', MobileChurchSolicitationController::TYPE_VOLUNTEER_REQUEST)
                        ->whereIn('status', ['pending', 'in_progress'])
                        ->whereNull('staff_archived_at')
                        ->count();
                } catch (\Throwable) {
                    $openVolunteerRequestsCount = 0;
                }
            }
        }

        /** Chamados de suporte não atendidos (badge no menu ADM "Suporte APP"). */
        $openSupportTicketsCount = 0;
        if ($request->user()) {
            $u = $request->user();
            $canViewSupportTickets = $u->hasRole('super_admin')
                || $u->hasAnyPermission(['support.view', 'support.manage']);
            if ($canViewSupportTickets && Schema::hasTable('app_support_tickets')) {
                try {
                    $openSupportTicketsCount = (int) AppSupportTicket::query()
                        ->whereIn('status', AppSupportTicket::activeStatuses())
                        ->count();
                } catch (\Throwable) {
                    $openSupportTicketsCount = 0;
                }
            }
        }

        return [
            ...parent::share($request),
            /**
             * Dados do último POST com validação falhada (sem senhas), para reabrir formulários
             * após o redirect 303 usado em pedidos Inertia (ex.: cadastro de usuários no painel).
             */
            'oldInput' => fn () => Arr::except(
                $request->session()->getOldInput() ?? [],
                [
                    'current_password',
                    'app_password',
                    'app_password_confirmation',
                    'photo',
                    'photo_file',
                    '_token',
                    '_method',
                ]
            ),
            /** Token atual para o axios do Inertia (evita 419 em DELETE/PUT após navegação SPA) */
            'csrf_token' => fn () => csrf_token(),
            'appVersion' => $appVersionShared,
            'appVersionHistory' => $appVersionHistory,
            'iosAppStoreUrl' => config('services.ios_app_store_url'),
            'nativeIosMinimumVersion' => config('services.native_ios_minimum_version'),
            'appUrl' => $request->getSchemeAndHttpHost(),
            /** URL raiz desta instalação (scheme + host + path base), para tela «Sobre o APP». */
            'appRootUrl' => rtrim($request->root(), '/'),
            'appLogoUrl' => $appLogoUrl,
            'defaultBrandLogoUrl' => $defaultBrandLogoUrl,
            'appName' => $appName,
            'faviconUrl' => $faviconUrl,
            'auth' => [
                'user' => $request->user(),
                /**
                 * Papel `lider_ministerio` ou marca no perfil: esconde fluxos de membro (ex.: «Falar com líder»).
                 * Quem só tem o papel Spatie sem `is_ministry_leader` na BD continua a ser líder para a app.
                 */
                'isMinistryLeaderAccount' => $request->user()
                    ? ($request->user()->hasRole('lider_ministerio') || (bool) ($request->user()->is_ministry_leader ?? false))
                    : false,
                'permissions' => $permissionNames,
                /** Bloco ADM do menu (Perfis, Suporte APP, Versão, Config. da igreja): só super admin. */
                'isSuperAdmin' => $request->user()?->hasRole('super_admin') ?? false,
                /** Alinha o menu com Gate::before (admin/super_admin) quando permissions estão desatualizadas na BD. */
                'adminSidebarUnrestricted' => $request->user()?->hasAnyRole(['admin', 'super_admin']) ?? false,
                'roleLabel' => $roleLabel,
                'canAccessAdminMenu' => $canAccessAdminMenu,
                /** Papéis com painel completo (Dashboard no menu lateral). */
                'hasCorePanelRole' => $request->user()?->hasAnyRole(['admin', 'super_admin', 'pastor', 'secretaria']) ?? false,
                'canManageSettings' => $canManageSettings,
                'canManageAppFeatures' => $canManageAppFeatures,
                /** Pastor com registro ligado à conta na igreja em contexto (para menu «Minha disponibilidade»). */
                'linkedPastor' => $linkedPastor,
                /** Mostrar «Agenda Pastoral» no menu (pastor ligado, papel pastor, ou quem gere pastores). */
                'pastoralAgendaMenuVisible' => $pastoralAgendaMenuVisible,
                /** Badge no menu lateral para alertas (Atendimento Pastoral). */
                'openSolicitationsCount' => $openSolicitationsCount,
                /** Badge no menu lateral — pedidos de voluntário em aberto (secretaria / quem gere `solicitations.manage`). */
                'openVolunteerRequestsCount' => $openVolunteerRequestsCount,
                /** Badge no menu lateral — chamados de suporte não atendidos. */
                'openSupportTicketsCount' => $openSupportTicketsCount,
                'canViewMission' => $request->user()
                    ? ($request->user()->can('mission.view') || $request->user()->can('mission.manage'))
                    : false,
                'canManageMission' => $request->user()?->can('mission.manage') ?? false,
                /** Feed unificado de publicações (preview por e-mail enquanto `publications_feed.preview_only`). */
                'canAccessPublicationsFeed' => PublicationsFeedAccess::canAccess($request->user()),
            ],
            'missionTripRegistrationsCount' => function () use ($request) {
                $user = $request->user();
                if ($user === null || (! $user->can('mission.view') && ! $user->can('mission.manage'))) {
                    return 0;
                }

                $churchId = Church::resolveWorkingId($request);
                if ($churchId === null) {
                    return 0;
                }

                return MissionTripRegistration::query()
                    ->where('church_id', $churchId)
                    ->where('trip_slug', MissionTripRegistration::TRIP_THAILAND_MYANMAR_2026)
                    ->count();
            },
            'currentChurch' => $currentChurch,
            'churchesForSwitch' => $churchesForSwitch,
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'info' => fn () => $request->session()->get('info'),
                'ministry_invite_link' => fn () => $request->session()->get('ministry_invite_link'),
                'invitation_link' => fn () => $request->session()->get('invitation_link'),
                'invitation_for_name' => fn () => $request->session()->get('invitation_for_name'),
                'mission_invite_phone' => fn () => $request->session()->get('mission_invite_phone'),
                'public_volunteer_signup_url' => fn () => $request->session()->get('public_volunteer_signup_url'),
                'public_volunteer_signup_church' => fn () => $request->session()->get('public_volunteer_signup_church'),
                'leader_self_signup_url' => fn () => $request->session()->get('leader_self_signup_url'),
                'leader_self_signup_church' => fn () => $request->session()->get('leader_self_signup_church'),
                'trip_signup_success' => fn () => (bool) $request->session()->get('trip_signup_success'),
                'trip_signup_name' => fn () => $request->session()->get('trip_signup_name'),
            ],
            'recentNotifications' => fn () => NotificationFeed::mergedForUser(
                $request,
                $currentChurch ? ($currentChurch['id'] ?? null) : null,
                5
            ),
            'unreadInboxNotificationsCount' => fn () => NotificationFeed::unreadInboxCount($request),
            /** Menu lateral: textos em config/admin_sidebar.php (não depende só do bundle JS em cache). */
            'adminSidebarMenu' => fn () => config('admin_sidebar.items', []),
            /** Chaves de funcionalidades desativadas para membros (app mobile / Mais). */
            'disabledAppFeatures' => fn () => ChurchAppFeatures::disabledKeysForRequest($request),
        ];
    }
}
