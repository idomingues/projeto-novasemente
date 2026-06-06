import { Link } from '@inertiajs/react';

export type MissionAdminTab = 'cadastros' | 'usuarios' | 'eventos' | 'depoimentos' | 'quem-somos' | 'mural';

const tabs: { key: MissionAdminTab; label: string; route: string }[] = [
    { key: 'cadastros', label: 'Cadastros', route: 'mission.index' },
    { key: 'usuarios', label: 'Usuários', route: 'mission.users.index' },
    { key: 'eventos', label: 'Eventos', route: 'mission.content.events' },
    { key: 'depoimentos', label: 'Depoimentos', route: 'mission.content.messages' },
    { key: 'quem-somos', label: 'Quem somos', route: 'mission.content.about' },
    { key: 'mural', label: 'Mural', route: 'mission.content.wall' },
];

function tabButtonClass(active: boolean): string {
    return [
        'flex-1 min-w-[7rem] px-3 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px text-center whitespace-nowrap',
        active
            ? 'border-teal-600 text-teal-800 dark:border-teal-400 dark:text-teal-200'
            : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200',
    ].join(' ');
}

export default function MissionAdminTabs({ active }: { active: MissionAdminTab }) {
    return (
        <nav
            role="tablist"
            aria-label="Seções da Missão"
            className="flex flex-wrap gap-x-1 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto"
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
                    {tab.label}
                </Link>
            ))}
        </nav>
    );
}
