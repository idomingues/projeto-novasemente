import { Link, usePage } from '@inertiajs/react';

export type MissionAdminTab =
    | 'cadastros'
    | 'tailandia-mianmar'
    | 'usuarios'
    | 'eventos'
    | 'depoimentos'
    | 'quem-somos'
    | 'mural'
    | 'configuracao';

const tabs: { key: MissionAdminTab; label: string; route: string; showCount?: boolean }[] = [
    { key: 'cadastros', label: 'Cadastros', route: 'mission.index' },
    { key: 'usuarios', label: 'Usuários', route: 'mission.users.index' },
    { key: 'eventos', label: 'Eventos', route: 'mission.content.events' },
    { key: 'depoimentos', label: 'Depoimentos', route: 'mission.content.messages' },
    { key: 'quem-somos', label: 'Quem somos', route: 'mission.content.about' },
    { key: 'mural', label: 'Mural', route: 'mission.content.wall' },
    {
        key: 'tailandia-mianmar',
        label: 'Inscrição Tailândia & Mianmar',
        route: 'mission.trip-registrations.index',
        showCount: true,
    },
    { key: 'configuracao', label: 'Configuração', route: 'mission.content.settings' },
];

function tabButtonClass(active: boolean): string {
    return [
        'shrink-0 px-4 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px text-center whitespace-nowrap',
        active
            ? 'border-teal-600 text-teal-800 dark:border-teal-400 dark:text-teal-200'
            : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200',
    ].join(' ');
}

export default function MissionAdminTabs({ active }: { active: MissionAdminTab }) {
    const tripRegistrationsCount =
        (usePage().props as { missionTripRegistrationsCount?: number }).missionTripRegistrationsCount ?? 0;

    return (
        <nav
            role="tablist"
            aria-label="Seções da Missão"
            className="-mx-1 flex flex-wrap gap-x-1 gap-y-0 overflow-x-auto border-b border-zinc-200 px-1 dark:border-zinc-800 sm:gap-x-2"
        >
            {tabs.map((tab) => (
                <Link
                    key={tab.key}
                    href={route(tab.route)}
                    role="tab"
                    aria-selected={active === tab.key}
                    className={tabButtonClass(active === tab.key)}
                    preserveScroll
                >
                    <span className="inline-flex items-center justify-center gap-2">
                        <span>{tab.label}</span>
                        {tab.showCount && tripRegistrationsCount > 0 ? (
                            <span className="inline-flex min-h-[1.25rem] min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-teal-600 px-1.5 text-[0.65rem] font-bold leading-none text-white dark:bg-teal-500">
                                {tripRegistrationsCount}
                            </span>
                        ) : null}
                    </span>
                </Link>
            ))}
        </nav>
    );
}
