import { Link, usePage, router } from '@inertiajs/react';
import {
    HomeIcon,
    UserGroupIcon,
    UsersIcon,
    BuildingOfficeIcon,
    BuildingOffice2Icon,
    ArchiveBoxIcon,
    Cog6ToothIcon,
    CalendarIcon,
    CalendarDaysIcon,
    FilmIcon,
    ClockIcon,
    PlayCircleIcon,
    NewspaperIcon,
    BellAlertIcon,
    XMarkIcon,
    KeyIcon,
    ChatBubbleLeftRightIcon,
    RectangleStackIcon,
    InboxIcon,
    UserCircleIcon,
    SparklesIcon,
    ChevronDownIcon,
    ChartBarSquareIcon,
    MusicalNoteIcon,
    CameraIcon,
    BookOpenIcon,
    UserPlusIcon,
    HeartIcon,
    GlobeAltIcon,
    BanknotesIcon,
} from '@heroicons/react/24/outline';
import PrayingHandsIcon from '@/Components/PrayingHandsIcon';
import { useEffect, useMemo, useState } from 'react';
import type { ComponentType, SVGProps } from 'react';

interface SidebarProps {
    mobileOpen?: boolean;
    onMobileClose?: () => void;
    routeToPermissions?: Record<string, string[]>;
}

interface ChurchInfo {
    id: number;
    name: string;
    slug: string;
    logo_url: string | null;
}

interface ChurchForSwitch {
    id: number;
    name: string;
}

type MenuIcon = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

type MenuItem = { name: string; route: string; icon: MenuIcon };

type ServerSidebarItem = { name: string; route: string; icon: string };

/** Chaves alinhadas com config/admin_sidebar.php */
const ICON_MAP: Record<string, MenuIcon> = {
    home: HomeIcon,
    inbox: InboxIcon,
    newspaper: NewspaperIcon,
    'praying-hands': PrayingHandsIcon,
    'bell-alert': BellAlertIcon,
    'calendar-days': CalendarDaysIcon,
    film: FilmIcon,
    clock: ClockIcon,
    'play-circle': PlayCircleIcon,
    'user-group': UserGroupIcon,
    'user-circle': UserCircleIcon,
    'building-office-2': BuildingOffice2Icon,
    calendar: CalendarIcon,
    users: UsersIcon,
    key: KeyIcon,
    'building-office': BuildingOfficeIcon,
    'rectangle-stack': RectangleStackIcon,
    'archive-box': ArchiveBoxIcon,
    cog: Cog6ToothIcon,
    'chat-bubble': ChatBubbleLeftRightIcon,
    sparkles: SparklesIcon,
    'chart-bar-square': ChartBarSquareIcon,
    'musical-note': MusicalNoteIcon,
    camera: CameraIcon,
    'book-open': BookOpenIcon,
    'user-plus': UserPlusIcon,
    heart: HeartIcon,
    'globe-alt': GlobeAltIcon,
    banknotes: BanknotesIcon,
};

/**
 * Fallback se config/admin_sidebar.php estiver vazio (ex.: deploy incompleto).
 * Preferir editar o PHP para textos/ordem — evita depender só do rebuild do Vite.
 */
const CLIENT_FALLBACK_MENU: MenuItem[] = [
    { name: 'Dashboard', route: 'dashboard', icon: HomeIcon },
    { name: 'Comunicação', route: 'communication-requests.index', icon: ChatBubbleLeftRightIcon },
    { name: 'Atendimento', route: 'solicitations.index', icon: InboxIcon },
    { name: 'Batismo', route: 'baptism-requests.index', icon: SparklesIcon },
    { name: 'Agenda', route: 'pastoral-agenda.index', icon: ClockIcon },
    { name: 'Salas', route: 'room-bookings.index', icon: RectangleStackIcon },
    { name: 'Escalas', route: 'escalas.index', icon: CalendarIcon },
    { name: 'Inventários', route: 'inventory.index', icon: ArchiveBoxIcon },
    { name: 'Voluntários', route: 'ministry-lead.volunteers.central', icon: UserGroupIcon },
    { name: 'Usuários', route: 'users.index', icon: UsersIcon },
    { name: 'Oração', route: 'prayer.index', icon: PrayingHandsIcon },
    { name: 'News', route: 'news.index', icon: NewspaperIcon },
    { name: 'Saúde', route: 'health.index', icon: HeartIcon },
    { name: 'Revista Adventista', route: 'revista-adventista.index', icon: NewspaperIcon },
    { name: 'Acervo Revista Adventista', route: 'revista-adventista-acervo.index', icon: BookOpenIcon },
    { name: 'Eventos', route: 'events.index', icon: CalendarDaysIcon },
    { name: 'Séries', route: 'acervo.index', icon: PlayCircleIcon },
    { name: 'Música', route: 'musica.index', icon: MusicalNoteIcon },
    { name: 'Fotos', route: 'photo-albums.index', icon: CameraIcon },
    { name: 'IA Foto', route: 'face-ai.index', icon: SparklesIcon },
    { name: 'Biblioteca', route: 'library-books.index', icon: BookOpenIcon },
    { name: 'Comunidades', route: 'communities.index', icon: UserGroupIcon },
    { name: 'Culto', route: 'culto.index', icon: FilmIcon },
    { name: 'Oferta Nova Semente', route: 'donation-campaigns.index', icon: BanknotesIcon },
    { name: 'Doação', route: 'charity-campaigns.index', icon: BanknotesIcon },
    { name: 'Notificações', route: 'notifications.manage', icon: BellAlertIcon },
    { name: 'Salas', route: 'rooms.index', icon: BuildingOfficeIcon },
    { name: 'Departamentos', route: 'departments.index', icon: BuildingOffice2Icon },
    { name: 'Pastores', route: 'pastors.index', icon: UserCircleIcon },
    { name: 'Programação', route: 'programacao.index', icon: ClockIcon },
    { name: 'Igrejas', route: 'churches.index', icon: BuildingOfficeIcon },
    { name: 'Operações', route: 'operations.index', icon: ChartBarSquareIcon },
    { name: 'Perfis', route: 'roles.index', icon: KeyIcon },
    { name: 'Suporte APP', route: 'support.index', icon: ChatBubbleLeftRightIcon },
    { name: 'Versão do APP', route: 'app-versions.index', icon: Cog6ToothIcon },
    { name: 'Configurações', route: 'settings.index', icon: Cog6ToothIcon },
];

function menuFromServer(items: ServerSidebarItem[]): MenuItem[] {
    return items.map((item) => ({
        name: item.name,
        route: item.route,
        icon: ICON_MAP[item.icon] ?? HomeIcon,
    }));
}

/** Rotas espelhadas na barra inferior mobile — não repetir no menu lateral. */
const MOBILE_BOTTOM_NAV_ROUTES = new Set([
    'mobile.home',
    'mobile.baptism',
    'mobile.culto',
    'mobile.news',
    'mobile.prayer',
    'volunteers.public-signup.page',
    'mobile.more',
    'more.index',
]);

export default function Sidebar({
    mobileOpen = false,
    onMobileClose,
    routeToPermissions = {},
}: SidebarProps) {
    const { props, url } = usePage();
    const auth = props.auth as {
        user?: { name?: string; email?: string } | null;
        permissions?: string[];
        canManageSettings?: boolean;
        canManageAppFeatures?: boolean;
        isSuperAdmin?: boolean;
        adminSidebarUnrestricted?: boolean;
        canAccessAdminMenu?: boolean;
        hasCorePanelRole?: boolean;
        isMinistryLeaderAccount?: boolean;
        linkedPastor?: { id: number } | null;
        pastoralAgendaMenuVisible?: boolean;
        openSolicitationsCount?: number;
        openVolunteerRequestsCount?: number;
        openSupportTicketsCount?: number;
    };
    const currentChurch = (props as { currentChurch?: ChurchInfo | null }).currentChurch ?? null;
    const churchesForSwitch = (props as { churchesForSwitch?: ChurchForSwitch[] }).churchesForSwitch ?? [];
    const adminSidebarMenu = (props as { adminSidebarMenu?: ServerSidebarItem[] }).adminSidebarMenu;

    const permissions: string[] = auth?.permissions ?? [];
    const isAuthenticated = !!auth?.user;
    /** Troca de igreja ativa: só usuários com papel `super_admin` recebem a lista. */
    const showChurchSwitcher = churchesForSwitch.length > 0;
    const isSuperAdminUser = auth?.isSuperAdmin === true;
    const canAccessSupportAdmin = permissions.includes('support.view') || permissions.includes('support.manage');
    const openSolicitationsCount =
        typeof auth?.openSolicitationsCount === 'number' ? auth.openSolicitationsCount : 0;
    const openVolunteerRequestsCount =
        typeof auth?.openVolunteerRequestsCount === 'number' ? auth.openVolunteerRequestsCount : 0;
    const openSupportTicketsCount =
        typeof auth?.openSupportTicketsCount === 'number' ? auth.openSupportTicketsCount : 0;

    const sidebarBadgeCountForRoute = (routeName: string): number => {
        if (routeName === 'solicitations.index') return openSolicitationsCount;
        if (
            routeName === 'ministry-lead.volunteers.index' ||
            routeName === 'ministry-lead.volunteers.central' ||
            routeName === 'ministry-lead.volunteers.pedidos'
        ) {
            return openVolunteerRequestsCount;
        }
        if (routeName === 'support.index' || routeName === 'mobile.support.index') return openSupportTicketsCount;
        return 0;
    };

    const publicationRoutes = new Set([
        'news.index',
        'health.index',
        'revista-adventista.index',
        'revista-adventista-acervo.index',
        'culto.index',
        'events.index',
        'acervo.index',
        'musica.index',
        'photo-albums.index',
        'face-ai.index',
        'library-books.index',
        'communities.index',
        'promise-box-verses.index',
        'donation-campaigns.index',
        'donation-item-campaigns.index',
        'notifications.manage',
    ]);
    const cadastroRoutes = new Set(['rooms.index', 'departments.index', 'pastors.index', 'programacao.index']);

    /** OPERAÇÃO aberta por padrão no painel de gestão (comentário legado no código). */
    const [isMainOpen, setIsMainOpen] = useState(true);
    const [isPastorOpen, setIsPastorOpen] = useState(false);
    const [isPublicationOpen, setIsPublicationOpen] = useState(false);
    const [isCadastroOpen, setIsCadastroOpen] = useState(false);
    const [isAdmOpen, setIsAdmOpen] = useState(false);

    const isRouteActive = (routeName: string) => route().current(routeName + '*');

    const isMenuItemActive = (itemRoute: string) => {
        if (
            itemRoute === 'ministry-lead.volunteers.central' ||
            itemRoute === 'ministry-lead.volunteers.index'
        ) {
            return (
                route().current('ministry-lead.volunteers.central') ||
                route().current('ministry-lead.volunteers.pedidos') ||
                route().current('ministry-lead.volunteers.index') ||
                route().current('ministry-lead.volunteers.board') ||
                route().current('ministry-lead.volunteers.show') ||
                route().current('ministry-lead.my-volunteers.index') ||
                route().current('volunteer-requests.staff.index') ||
                route().current('volunteers.index') ||
                route().current('volunteers.show')
            );
        }
        if (itemRoute === 'mission.index') {
            return (
                route().current('mission.index') ||
                route().current('mission.show') ||
                route().current('mission.volunteers.detail') ||
                route().current('mission.content.events') ||
                route().current('mission.content.messages') ||
                route().current('mission.content.about') ||
                route().current('mission.content.wall')
            );
        }
        if (itemRoute === 'churches.index') {
            const c = route().current();
            return typeof c === 'string' && c.startsWith('churches.');
        }
        return isRouteActive(itemRoute);
    };

    const allMenuItems = useMemo((): MenuItem[] => {
        if (adminSidebarMenu && adminSidebarMenu.length > 0) {
            return menuFromServer(adminSidebarMenu);
        }
        return CLIENT_FALLBACK_MENU;
    }, [adminSidebarMenu]);

    const requiredPerms = (route: string) => routeToPermissions[route] ?? [];
    const canAccess = (route: string) => {
        if (auth?.adminSidebarUnrestricted) {
            return true;
        }
        const perms = requiredPerms(route);
        if (perms.length === 0) {
            return false;
        }
        return perms.some((p) => permissions.includes(p));
    };

    const canManageSettings = auth?.canManageSettings === true;
    const canManageAppFeatures = auth?.canManageAppFeatures === true;
    const canAccessAdminMenu = auth?.canAccessAdminMenu === true;
    const hasCorePanelRole = auth?.hasCorePanelRole === true;
    const isMinistryLeaderAccount = auth?.isMinistryLeaderAccount === true;
    const pastoralAgendaMenuVisible = auth?.pastoralAgendaMenuVisible === true;
    const showDashboardInSidebar = hasCorePanelRole || auth?.adminSidebarUnrestricted === true;
    const showCommunicationInSidebar =
        auth?.adminSidebarUnrestricted === true ||
        isMinistryLeaderAccount ||
        canAccess('solicitations.index');
    /** Pastor ligado, delegado, gestão de pastores ou agendamentos pastorais. */
    const showPastoralAgendaInSidebar =
        pastoralAgendaMenuVisible ||
        canAccess('pastors.index') ||
        permissions.includes('pastoral_appointments.manage');

    const menuItems = !isAuthenticated
        ? []
        : !canAccessAdminMenu
          ? []
          : allMenuItems.filter((item) => {
                if (item.route === 'dashboard' && !showDashboardInSidebar) {
                    return false;
                }
                if (item.route === 'communication-requests.index' && !showCommunicationInSidebar) {
                    return false;
                }
                if (item.route === 'settings.index' && !canManageSettings) {
                    return false;
                }
                if (item.route === 'settings.app-features.index' && !canManageAppFeatures) {
                    return false;
                }
                if (item.route === 'pastoral-agenda.index' && !showPastoralAgendaInSidebar) {
                    return false;
                }
                if (item.route === 'users.index') {
                    return canAccess('users.index');
                }
                /** Igrejas: só no bloco ADM e alinhado à rota `role:super_admin`. */
                if (item.route === 'churches.index' || item.route === 'operations.index') {
                    return isSuperAdminUser && canAccess(item.route);
                }
                return canAccess(item.route);
            }).map((item) => {
                // Evita 403: item pode aparecer para admin mesmo sem permission middleware alinhado.
                if (item.route === 'support.index' && !canAccessSupportAdmin && !isSuperAdminUser) {
                    return { ...item, route: 'mobile.support.index' };
                }
                return item;
            });

    // publicationRoutes / cadastroRoutes / pastorRoutes: acordeões fechados por padrão; OPERAÇÃO fica aberta.
    /** Ordem fixa do bloco PASTOR. */
    const pastorRouteOrder = [
        'solicitations.index',
        'baptism-requests.index',
        'pastoral-agenda.index',
    ] as const;
    const pastorRoutes = new Set<string>(pastorRouteOrder);

    /** Ordem fixa do bloco ADM — inclui Configurações. */
    const admRouteOrder = [
        'churches.index',
        'operations.index',
        'roles.index',
        'support.index',
        'app-versions.index',
        'settings.app-features.index',
        'settings.index',
    ] as const;
    /** Inclui `mobile.support.index` quando o item Suporte é remapeado (evita duplicar na lista principal). */
    const admRoutes = new Set<string>([...admRouteOrder, 'mobile.support.index']);
    const sectionRoutes = new Set([...pastorRoutes, ...publicationRoutes, ...cadastroRoutes, ...admRoutes]);

    const pastorMenuItems =
        canAccessAdminMenu
            ? pastorRouteOrder
                  .map((r) => menuItems.find((i) => i.route === r))
                  .filter((i): i is MenuItem => i !== undefined)
            : [];
    const publicationMenuItems =
        canAccessAdminMenu ? menuItems.filter((i) => publicationRoutes.has(i.route)) : [];
    const cadastroMenuItems =
        canAccessAdminMenu ? menuItems.filter((i) => cadastroRoutes.has(i.route)) : [];
    const admMenuItems =
        canAccessAdminMenu && (isSuperAdminUser || canManageSettings || canManageAppFeatures)
            ? admRouteOrder
                  .map((r) => {
                      if (r === 'support.index') {
                          return menuItems.find(
                              (i) => i.route === 'support.index' || i.route === 'mobile.support.index',
                          );
                      }
                      return menuItems.find((i) => i.route === r);
                  })
                  .filter((i): i is MenuItem => i !== undefined)
            : [];
    const mainMenuItems = canAccessAdminMenu
        ? menuItems.filter((i) => !sectionRoutes.has(i.route) && !MOBILE_BOTTOM_NAV_ROUTES.has(i.route))
        : [];

    const dashboardMenuItems = mainMenuItems.filter((i) => i.route === 'dashboard');
    const operationMenuItems = mainMenuItems.filter((i) => i.route !== 'dashboard');

    const sectionHasActiveItem = (items: MenuItem[]) =>
        items.some((item) => route().has(item.route) && isMenuItemActive(item.route));

    useEffect(() => {
        setIsMainOpen(sectionHasActiveItem(operationMenuItems));
        setIsPastorOpen(sectionHasActiveItem(pastorMenuItems));
        setIsPublicationOpen(sectionHasActiveItem(publicationMenuItems));
        setIsCadastroOpen(sectionHasActiveItem(cadastroMenuItems));
        setIsAdmOpen(sectionHasActiveItem(admMenuItems));
        // eslint-disable-next-line react-hooks/exhaustive-deps -- abre só o bloco da rota atual
    }, [url]);

    const renderMenuLinks = (items: MenuItem[]) => (
        <ul className="space-y-0.5">
            {items.map((item) => {
                const routeExists = route().has(item.route);
                const href = routeExists ? route(item.route) : '#';
                const isActive = routeExists && isMenuItemActive(item.route);
                const Icon = item.icon;
                const sidebarBadgeCount = sidebarBadgeCountForRoute(item.route);

                return (
                    <li key={item.route}>
                        <Link
                            href={href}
                            onClick={onMobileClose}
                            className={`group relative flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 ${
                                isActive
                                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25 dark:bg-brand-500 dark:shadow-brand-500/20'
                                    : 'text-zinc-600 hover:bg-brand-50/80 hover:text-brand-900 dark:text-zinc-400 dark:hover:bg-white/[0.04] dark:hover:text-zinc-100'
                            }`}
                        >
                            {isActive ? (
                                <span
                                    className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-white/80"
                                    aria-hidden
                                />
                            ) : null}
                            <span
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                                    isActive
                                        ? 'bg-white/15'
                                        : 'bg-zinc-100/80 text-zinc-500 group-hover:bg-brand-100/70 group-hover:text-brand-700 dark:bg-zinc-800/80 dark:text-zinc-500 dark:group-hover:bg-zinc-800 dark:group-hover:text-brand-400'
                                }`}
                            >
                                <Icon
                                    className={`h-[18px] w-[18px] ${
                                        isActive ? 'text-white' : ''
                                    }`}
                                />
                            </span>
                            <span
                                className={`min-w-0 flex-1 truncate text-[13px] tracking-[-0.01em] ${
                                    isActive ? 'font-semibold' : 'font-medium'
                                }`}
                            >
                                {item.name}
                            </span>
                            {sidebarBadgeCount > 0 ? (
                                <span
                                    className={`ml-auto inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums tracking-tight ${
                                        isActive
                                            ? 'bg-white/20 text-white'
                                            : 'bg-rose-500 text-white shadow-sm shadow-rose-500/30'
                                    }`}
                                    title={`${sidebarBadgeCount} em aberto`}
                                    aria-label={`${sidebarBadgeCount} em aberto`}
                                >
                                    {sidebarBadgeCount > 99 ? '99+' : sidebarBadgeCount}
                                </span>
                            ) : null}
                        </Link>
                    </li>
                );
            })}
        </ul>
    );

    const renderCollapsibleSection = (
        title: string,
        open: boolean,
        onToggle: () => void,
        items: MenuItem[],
        isFirst = false,
    ) => {
        if (items.length === 0) {
            return null;
        }

        return (
            <>
                <button
                    type="button"
                    onClick={onToggle}
                    className={`mb-1.5 flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-1.5 text-left transition-colors hover:bg-zinc-100/70 dark:hover:bg-white/[0.03] ${
                        isFirst ? 'mt-0' : 'mt-6'
                    }`}
                    aria-expanded={open}
                >
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">
                        {title}
                    </span>
                    <ChevronDownIcon
                        className={`h-3.5 w-3.5 text-zinc-400 transition-transform duration-200 dark:text-zinc-500 ${
                            open ? 'rotate-180' : ''
                        }`}
                        aria-hidden
                    />
                </button>
                {open ? renderMenuLinks(items) : null}
            </>
        );
    };

    /** Conta só com app: navegação principal é a barra inferior — sem coluna lateral. */
    if (!isAuthenticated || !canAccessAdminMenu) {
        return null;
    }

    return (
        <>
            {mobileOpen ? (
                <div
                    className="fixed inset-0 z-40 bg-zinc-950/40 backdrop-blur-[2px] transition-opacity"
                    onClick={onMobileClose}
                    aria-hidden
                />
            ) : null}
            <aside
                className={`fixed left-0 top-0 z-50 flex h-screen w-[17.5rem] flex-col border-r border-zinc-200/80 bg-gradient-to-b from-white via-zinc-50/90 to-brand-50/30 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-out dark:border-zinc-800/80 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-950 dark:shadow-[4px_0_24px_-12px_rgba(0,0,0,0.45)] ${
                    mobileOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                {/* Logo Area */}
                <div className="flex h-[4.75rem] shrink-0 items-center justify-between border-b border-zinc-200/70 px-4 dark:border-zinc-800/80">
                    <Link
                        href={route('mobile.home')}
                        className="group flex min-w-0 cursor-pointer items-center gap-3 transition-opacity hover:opacity-90"
                    >
                        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-600 shadow-md shadow-brand-600/25 ring-1 ring-brand-700/10 dark:bg-brand-500 dark:shadow-brand-500/20">
                            {currentChurch?.logo_url ? (
                                <img
                                    src={currentChurch.logo_url}
                                    alt=""
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <BuildingOfficeIcon className="h-5 w-5 text-white" />
                            )}
                        </div>
                        <div className="flex min-w-0 flex-col gap-0.5">
                            <span className="truncate text-[15px] font-bold leading-tight tracking-[-0.02em] text-zinc-900 dark:text-zinc-50">
                                {currentChurch?.name ?? 'Igreja'}
                            </span>
                            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-brand-700/70 dark:text-brand-400/80">
                                Painel
                            </span>
                        </div>
                    </Link>
                    <button
                        type="button"
                        onClick={onMobileClose}
                        className="shrink-0 cursor-pointer rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                        aria-label="Fechar menu"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>

                {showChurchSwitcher && (
                    <div className="border-b border-zinc-200/70 px-4 py-3 dark:border-zinc-800/80">
                        <label
                            htmlFor="sidebar-church-switch"
                            className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500"
                        >
                            Igreja ativa
                        </label>
                        <select
                            id="sidebar-church-switch"
                            value={currentChurch?.id ?? ''}
                            onChange={(e) => {
                                const id = e.target.value;
                                if (id) {
                                    router.post(route('working-church.store'), { church_id: id }, { preserveScroll: true });
                                }
                            }}
                            className="h-10 w-full cursor-pointer rounded-xl border border-zinc-200/90 bg-white/90 pl-3 pr-8 text-[13px] font-medium text-zinc-800 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-brand-400 dark:focus:ring-brand-400/20"
                        >
                            {churchesForSwitch.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                        <p className="mt-1.5 text-[10px] leading-relaxed text-zinc-400 dark:text-zinc-500">
                            O menu &quot;Igrejas&quot; continua disponível para cadastrar outras.
                        </p>
                    </div>
                )}

                <div className="ns-sidebar-scroll flex-1 overflow-y-auto px-3 py-5">
                    {dashboardMenuItems.length > 0 ? (
                        <div className="mb-1">{renderMenuLinks(dashboardMenuItems)}</div>
                    ) : null}
                    {renderCollapsibleSection(
                        'Pastor',
                        isPastorOpen,
                        () => setIsPastorOpen((v) => !v),
                        pastorMenuItems,
                        dashboardMenuItems.length === 0,
                    )}
                    {renderCollapsibleSection(
                        'Operação',
                        isMainOpen,
                        () => setIsMainOpen((v) => !v),
                        operationMenuItems,
                        dashboardMenuItems.length === 0 && pastorMenuItems.length === 0,
                    )}
                    {renderCollapsibleSection(
                        'Publicação',
                        isPublicationOpen,
                        () => setIsPublicationOpen((v) => !v),
                        publicationMenuItems,
                    )}
                    {renderCollapsibleSection('Cadastro', isCadastroOpen, () => setIsCadastroOpen((v) => !v), cadastroMenuItems)}
                    {renderCollapsibleSection('Adm', isAdmOpen, () => setIsAdmOpen((v) => !v), admMenuItems)}
                </div>
            </aside>
        </>
    );
}
