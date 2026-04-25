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
} from '@heroicons/react/24/outline';
import PrayingHandsIcon from '@/Components/PrayingHandsIcon';
import { useMemo, useState } from 'react';
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
};

/**
 * Fallback se config/admin_sidebar.php estiver vazio (ex.: deploy incompleto).
 * Preferir editar o PHP para textos/ordem — evita depender só do rebuild do Vite.
 */
const CLIENT_FALLBACK_MENU: MenuItem[] = [
    { name: 'Dashboard', route: 'dashboard', icon: HomeIcon },
    { name: 'Atendimento', route: 'solicitations.index', icon: InboxIcon },
    { name: 'Agenda Pastoral', route: 'pastoral-agenda.index', icon: ClockIcon },
    { name: 'Agendamento de Salas', route: 'room-bookings.index', icon: RectangleStackIcon },
    { name: 'Escalas', route: 'escalas.index', icon: CalendarIcon },
    { name: 'Inventários', route: 'inventory.index', icon: ArchiveBoxIcon },
    { name: 'Voluntários', route: 'ministry-lead.volunteers.index', icon: UserGroupIcon },
    { name: 'Usuários', route: 'members.index', icon: UsersIcon },
    { name: 'News', route: 'news.index', icon: NewspaperIcon },
    { name: 'Eventos', route: 'events.index', icon: CalendarDaysIcon },
    { name: 'Acervo', route: 'acervo.index', icon: PlayCircleIcon },
    { name: 'Culto', route: 'culto.index', icon: FilmIcon },
    { name: 'Notificações', route: 'notifications.manage', icon: BellAlertIcon },
    { name: 'Salas', route: 'rooms.index', icon: BuildingOfficeIcon },
    { name: 'Departamentos', route: 'departments.index', icon: BuildingOffice2Icon },
    { name: 'Pastores', route: 'pastors.index', icon: UserCircleIcon },
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
    'mobile.news',
    'mobile.baptism',
    'mobile.events',
    'mobile.prayer',
    'mobile.more',
    'more.index',
]);

export default function Sidebar({ mobileOpen = false, onMobileClose, routeToPermissions = {} }: SidebarProps) {
    const { props } = usePage();
    const auth = props.auth as {
        user?: { name?: string; email?: string } | null;
        permissions?: string[];
        canManageSettings?: boolean;
        isSuperAdmin?: boolean;
        adminSidebarUnrestricted?: boolean;
        canAccessAdminMenu?: boolean;
        linkedPastor?: { id: number } | null;
        pastoralAgendaMenuVisible?: boolean;
        openSolicitationsCount?: number;
    };
    const currentChurch = (props as { currentChurch?: ChurchInfo | null }).currentChurch ?? null;
    const churchesForSwitch = (props as { churchesForSwitch?: ChurchForSwitch[] }).churchesForSwitch ?? [];
    const adminSidebarMenu = (props as { adminSidebarMenu?: ServerSidebarItem[] }).adminSidebarMenu;

    const permissions: string[] = auth?.permissions ?? [];
    const isAuthenticated = !!auth?.user;
    /** Troca de igreja ativa: só utilizadores com papel `super_admin` recebem a lista. */
    const showChurchSwitcher = churchesForSwitch.length > 0;
    const isSuperAdminUser = auth?.isSuperAdmin === true;
    const canAccessSupportAdmin = permissions.includes('support.view') || permissions.includes('support.manage');
    const openSolicitationsCount =
        typeof auth?.openSolicitationsCount === 'number' ? auth.openSolicitationsCount : 0;

    const publicationRoutes = new Set(['news.index', 'culto.index', 'events.index', 'acervo.index', 'notifications.manage']);
    const cadastroRoutes = new Set(['rooms.index', 'departments.index', 'pastors.index']);

    const [isPublicationOpen, setIsPublicationOpen] = useState(() => {
        const current = route().current();
        return typeof current === 'string' ? publicationRoutes.has(current) : true;
    });
    const [isCadastroOpen, setIsCadastroOpen] = useState(() => {
        const current = route().current();
        return typeof current === 'string' ? cadastroRoutes.has(current) : true;
    });

    const isRouteActive = (routeName: string) => route().current(routeName + '*');

    const isMenuItemActive = (itemRoute: string) => {
        if (itemRoute === 'ministry-lead.volunteers.index') {
            return (
                route().current('ministry-lead.volunteers.index') ||
                route().current('ministry-lead.volunteers.board') ||
                route().current('ministry-lead.volunteers.show') ||
                route().current('volunteers.index') ||
                route().current('volunteers.show')
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
        if (perms.length === 0) return true;
        return perms.some((p) => permissions.includes(p));
    };

    const canManageSettings = auth?.canManageSettings === true;
    const canAccessAdminMenu = auth?.canAccessAdminMenu === true;
    const pastoralAgendaMenuVisible = auth?.pastoralAgendaMenuVisible === true;
    /** Equipe do painel (secretaria, pastor, líder…) ou permissões de pastores / agendamentos pastorais. */
    const showPastoralAgendaInSidebar =
        pastoralAgendaMenuVisible ||
        canAccessAdminMenu ||
        canAccess('pastors.index') ||
        permissions.includes('pastoral_appointments.manage');

    const menuItems = !isAuthenticated
        ? []
        : !canAccessAdminMenu
          ? []
          : allMenuItems.filter((item) => {
                if (item.route === 'settings.index' && !canManageSettings) {
                    return false;
                }
                if (item.route === 'pastoral-agenda.index' && !showPastoralAgendaInSidebar) {
                    return false;
                }
                /** Lista de utilizadores (cadastro `members`): visível para equipe do painel ou quem tem members.view/manage. */
                if (item.route === 'members.index') {
                    return canAccessAdminMenu || canAccess('members.index');
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

    // (publicationRoutes/cadastroRoutes) definidos acima para permitir default open inteligente
    /** Ordem fixa do bloco ADM — só visível para `super_admin` (sem acordeão). */
    const admRouteOrder = [
        'churches.index',
        'operations.index',
        'roles.index',
        'support.index',
        'app-versions.index',
        'settings.index',
    ] as const;
    /** Inclui `mobile.support.index` quando o item Suporte é remapeado (evita duplicar na lista principal). */
    const admRoutes = new Set<string>([...admRouteOrder, 'mobile.support.index']);
    const sectionRoutes = new Set([...publicationRoutes, ...cadastroRoutes, ...admRoutes]);

    const publicationMenuItems =
        canAccessAdminMenu ? menuItems.filter((i) => publicationRoutes.has(i.route)) : [];
    const cadastroMenuItems =
        canAccessAdminMenu ? menuItems.filter((i) => cadastroRoutes.has(i.route)) : [];
    const admMenuItems =
        canAccessAdminMenu && isSuperAdminUser
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

    /** Conta só com app: navegação principal é a barra inferior — sem coluna lateral. */
    if (!isAuthenticated || !canAccessAdminMenu) {
        return null;
    }

    return (
        <>
            {/* Mobile backdrop */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={onMobileClose}
                    aria-hidden
                />
            )}
            <aside
                className={`w-72 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 h-screen fixed left-0 top-0 z-50 transition-transform duration-300 ease-out flex flex-col ${
                    mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
                }`}
            >
                {/* Logo Area */}
                <div className="h-24 flex items-center justify-between px-6 md:px-8 border-b border-zinc-100 dark:border-zinc-900 flex-shrink-0">
                    <Link
                        href={route('mobile.news')}
                        className="flex items-center gap-3 text-zinc-900 dark:text-white min-w-0 hover:opacity-90 transition-opacity"
                    >
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-zinc-900 dark:bg-white flex items-center justify-center overflow-hidden">
                            {currentChurch?.logo_url ? (
                                <img src={currentChurch.logo_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <BuildingOfficeIcon className="w-6 h-6 text-white dark:text-black" />
                            )}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-lg font-bold tracking-tight leading-none truncate">
                                {currentChurch?.name ?? 'Igreja'}
                            </span>
                        </div>
                    </Link>
                    <button
                        type="button"
                        onClick={onMobileClose}
                        className="md:hidden p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        aria-label="Fechar menu"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {showChurchSwitcher && (
                    <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-900">
                        <label htmlFor="sidebar-church-switch" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                            Igreja em que está trabalhando
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
                            className="h-11 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-3 pr-8 text-sm text-zinc-900 dark:text-zinc-100 shadow-sm focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900/20 dark:focus:ring-white/20"
                        >
                            {churchesForSwitch.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                        <p className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">
                            O menu &quot;Igrejas&quot; continua disponível para cadastrar outras.
                        </p>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto py-8 px-4">
                    {mainMenuItems.length > 0 ? (
                        <>
                            <div className="mb-4 px-4">
                                <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                                    Menu Principal
                                </p>
                            </div>
                            <ul className="space-y-2">
                                {mainMenuItems.map((item) => {
                                    const routeExists = route().has(item.route);
                                    const href = routeExists ? route(item.route) : '#';
                                    const isActive = routeExists && isMenuItemActive(item.route);
                                    const Icon = item.icon;

                                    return (
                                        <li key={item.route}>
                                            <Link
                                                href={href}
                                                onClick={onMobileClose}
                                                className={`flex items-center px-4 py-3.5 rounded-2xl transition-all duration-200 group ${
                                                    isActive
                                                        ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-900/10 dark:bg-white dark:text-black dark:shadow-white/10'
                                                        : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white'
                                                }`}
                                            >
                                                <Icon
                                                    className={`w-6 h-6 mr-3 ${
                                                        isActive
                                                            ? 'text-white dark:text-black'
                                                            : 'text-zinc-400 group-hover:text-zinc-900 dark:text-zinc-500 dark:group-hover:text-white'
                                                    }`}
                                                />
                                                <span className="font-medium text-sm">{item.name}</span>
                                                {item.route === 'solicitations.index' && openSolicitationsCount > 0 ? (
                                                    <span
                                                        className={`ml-auto inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                                                            isActive
                                                                ? 'bg-white/20 text-white dark:bg-black/10 dark:text-black'
                                                                : 'bg-rose-600 text-white'
                                                        }`}
                                                        title={`${openSolicitationsCount} em aberto`}
                                                        aria-label={`${openSolicitationsCount} em aberto`}
                                                    >
                                                        {openSolicitationsCount > 99 ? '99+' : openSolicitationsCount}
                                                    </span>
                                                ) : null}
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </>
                    ) : null}

                    {publicationMenuItems.length > 0 ? (
                        <>
                            <button
                                type="button"
                                onClick={() => setIsPublicationOpen((v) => !v)}
                                className="mt-8 mb-2 w-full px-4 flex items-center justify-between text-left"
                            >
                                <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                                    Publicação
                                </span>
                                <ChevronDownIcon
                                    className={`h-4 w-4 text-zinc-400 dark:text-zinc-500 transition-transform ${
                                        isPublicationOpen ? 'rotate-180' : ''
                                    }`}
                                    aria-hidden
                                />
                            </button>
                            {isPublicationOpen ? (
                                <ul className="space-y-2">
                                    {publicationMenuItems.map((item) => {
                                        const routeExists = route().has(item.route);
                                        const href = routeExists ? route(item.route) : '#';
                                        const isActive = routeExists && isMenuItemActive(item.route);
                                        const Icon = item.icon;

                                        return (
                                            <li key={item.route}>
                                                <Link
                                                    href={href}
                                                    onClick={onMobileClose}
                                                    className={`flex items-center px-4 py-3.5 rounded-2xl transition-all duration-200 group ${
                                                        isActive
                                                            ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-900/10 dark:bg-white dark:text-black dark:shadow-white/10'
                                                            : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white'
                                                    }`}
                                                >
                                                    <Icon
                                                        className={`w-6 h-6 mr-3 ${
                                                            isActive
                                                                ? 'text-white dark:text-black'
                                                                : 'text-zinc-400 group-hover:text-zinc-900 dark:text-zinc-500 dark:group-hover:text-white'
                                                        }`}
                                                    />
                                                    <span className="font-medium text-sm">{item.name}</span>
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : null}
                        </>
                    ) : null}

                    {cadastroMenuItems.length > 0 ? (
                        <>
                            <button
                                type="button"
                                onClick={() => setIsCadastroOpen((v) => !v)}
                                className="mt-8 mb-2 w-full px-4 flex items-center justify-between text-left"
                            >
                                <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                                    Cadastro
                                </span>
                                <ChevronDownIcon
                                    className={`h-4 w-4 text-zinc-400 dark:text-zinc-500 transition-transform ${
                                        isCadastroOpen ? 'rotate-180' : ''
                                    }`}
                                    aria-hidden
                                />
                            </button>
                            {isCadastroOpen ? (
                                <ul className="space-y-2">
                                    {cadastroMenuItems.map((item) => {
                                        const routeExists = route().has(item.route);
                                        const href = routeExists ? route(item.route) : '#';
                                        const isActive = routeExists && isMenuItemActive(item.route);
                                        const Icon = item.icon;

                                        return (
                                            <li key={item.route}>
                                                <Link
                                                    href={href}
                                                    onClick={onMobileClose}
                                                    className={`flex items-center px-4 py-3.5 rounded-2xl transition-all duration-200 group ${
                                                        isActive
                                                            ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-900/10 dark:bg-white dark:text-black dark:shadow-white/10'
                                                            : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white'
                                                    }`}
                                                >
                                                    <Icon
                                                        className={`w-6 h-6 mr-3 ${
                                                            isActive
                                                                ? 'text-white dark:text-black'
                                                                : 'text-zinc-400 group-hover:text-zinc-900 dark:text-zinc-500 dark:group-hover:text-white'
                                                        }`}
                                                    />
                                                    <span className="font-medium text-sm">{item.name}</span>
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : null}
                        </>
                    ) : null}

                    {admMenuItems.length > 0 ? (
                        <>
                            <div className="mt-8 mb-2 px-4">
                                <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                                    ADM
                                </span>
                            </div>
                            <ul className="space-y-2">
                                {admMenuItems.map((item) => {
                                    const routeExists = route().has(item.route);
                                    const href = routeExists ? route(item.route) : '#';
                                    const isActive = routeExists && isMenuItemActive(item.route);
                                    const Icon = item.icon;

                                    return (
                                        <li key={item.route}>
                                            <Link
                                                href={href}
                                                onClick={onMobileClose}
                                                className={`flex items-center px-4 py-3.5 rounded-2xl transition-all duration-200 group ${
                                                    isActive
                                                        ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-900/10 dark:bg-white dark:text-black dark:shadow-white/10'
                                                        : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white'
                                                }`}
                                            >
                                                <Icon
                                                    className={`w-6 h-6 mr-3 ${
                                                        isActive
                                                            ? 'text-white dark:text-black'
                                                            : 'text-zinc-400 group-hover:text-zinc-900 dark:text-zinc-500 dark:group-hover:text-white'
                                                    }`}
                                                />
                                                <span className="font-medium text-sm">{item.name}</span>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </>
                    ) : null}
                </div>
            </aside>
        </>
    );
}
