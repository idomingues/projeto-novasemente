import MobileLayout from '@/Layouts/MobileLayout';
import SobreOAppNavItem from '@/Components/Mobile/SobreOAppNavItem';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    ClockIcon,
    MapPinIcon,
    PlayCircleIcon,
    AcademicCapIcon,
    MusicalNoteIcon,
    PhotoIcon,
    BookOpenIcon,
    UserGroupIcon,
    UserCircleIcon,
    UserPlusIcon,
    FilmIcon,
    HandRaisedIcon,
    NewspaperIcon,
    ChatBubbleLeftRightIcon,
    HeartIcon,
    GlobeAltIcon,
} from '@heroicons/react/24/outline';
import PrayingHandsIcon from '@/Components/PrayingHandsIcon';
import type { ComponentType, SVGProps } from 'react';

type MenuIcon = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

type MoreMenuItem =
    | { name: string; description: string; route: string; icon: MenuIcon; externalHref?: never }
    | { name: string; description: string; externalHref: string; icon: MenuIcon; route?: never };

interface Props {
    latestMusicas?: unknown[];
    latestPrayerRequests?: unknown[];
}

type PageProps = {
    auth?: {
        user?: unknown | null;
        permissions?: string[];
        adminSidebarUnrestricted?: boolean;
        canAccessAdminMenu?: boolean;
        isMinistryLeaderAccount?: boolean;
    };
};

const items: MoreMenuItem[] = [
    { name: 'Notícias', description: 'Notícias e comunicados da igreja', route: 'mobile.news', icon: NewspaperIcon },
    { name: 'Saúde', description: 'Conteúdos de saúde e bem-estar', route: 'mobile.health', icon: HeartIcon },
    { name: 'Missão', description: 'Cadastro missionário', route: 'mobile.mission', icon: GlobeAltIcon },
    { name: 'Oração', description: 'Pedidos de oração', route: 'mobile.prayer', icon: PrayingHandsIcon },
    { name: 'Dízimos e Ofertas', description: 'Contribuições e ofertas', route: 'mobile.offerings', icon: HandRaisedIcon },
    { name: 'Culto', description: 'Vídeos do culto online', route: 'mobile.culto', icon: FilmIcon },
    { name: 'Música', description: 'Vídeos de música no YouTube', route: 'mobile.musica', icon: MusicalNoteIcon },
    { name: 'Cultos e horários', description: 'Dias e horários dos cultos', route: 'mobile.services', icon: ClockIcon },
    {
        name: 'Fotos',
        description: 'Álbum de fotos',
        route: 'mobile.fotos',
        icon: PhotoIcon,
    },
    { name: 'Bíblia', description: 'Leitura e busca de versículos', route: 'mobile.bible', icon: BookOpenIcon },
    {
        name: 'Ano Bíblico',
        description: 'Escolha um plano de leitura e acompanhe o seu progresso.',
        route: 'mobile.ano-biblico',
        icon: AcademicCapIcon,
    },
    { name: 'Biblioteca', description: 'Livros e PDFs para leitura e download', route: 'mobile.biblioteca', icon: BookOpenIcon },
    { name: 'Localização', description: 'Endereço e mapa da igreja', route: 'mobile.location', icon: MapPinIcon },
    { name: 'Nossos pastores', description: 'Conheça a equipe pastoral', route: 'mobile.pastors', icon: UserCircleIcon },
    { name: 'Quem somos', description: 'História e significado do nome', route: 'mobile.quem-somos', icon: UserGroupIcon },
    { name: 'Em que acreditamos', description: '28 princípios de fé (IASD)', route: 'mobile.beliefs', icon: BookOpenIcon },
    {
        name: 'Cadastro de voluntário',
        description: 'Quero servir em ministérios (formulário completo)',
        route: 'volunteers.public-signup.page',
        icon: UserPlusIcon,
    },
    { name: 'Acervo', description: 'Playlists do YouTube da Nova Semente', route: 'mobile.acervo', icon: PlayCircleIcon },
    { name: 'Classe Começos', description: 'Estudo bíblico presencial ou on-line', route: 'varios.classe-comecos', icon: AcademicCapIcon },
];

export default function MobileMore(_: Props) {
    const { auth } = usePage().props as unknown as PageProps;
    const isAuthenticated = !!auth?.user;
    const permissions = auth?.permissions ?? [];
    const unrestricted = auth?.adminSidebarUnrestricted === true;

    const can = (perm: string) => unrestricted || permissions.includes(perm);
    const canAccessAdminMenu = auth?.canAccessAdminMenu === true;
    const showMyVolunteers =
        isAuthenticated &&
        route().has('ministry-lead.my-volunteers.index') &&
        auth?.isMinistryLeaderAccount === true;
    /** «Atendimento Pastoral» abre o painel web completo — só equipe pastoral/secretaria/admin. */
    const showMySolicitations =
        isAuthenticated &&
        route().has('solicitations.index') &&
        canAccessAdminMenu &&
        (can('solicitations.view') || can('solicitations.manage'));
    const showCommunicationRequests =
        isAuthenticated &&
        route().has('communication-requests.index') &&
        (auth?.isMinistryLeaderAccount === true ||
            (canAccessAdminMenu && (can('solicitations.view') || can('solicitations.manage'))));
    return (
        <MobileLayout>
            <Head title="Mais" />
            <div className="space-y-4">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Mais</h1>
                <div className="space-y-1">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">Outras funcionalidades</p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Para acessar todas as funcionalidades do nosso app,{' '}
                        <Link href={route('register')} className="font-semibold underline">
                            faça seu cadastro aqui
                        </Link>
                        .
                    </p>
                </div>

                {(showMyVolunteers || showMySolicitations || showCommunicationRequests) ? (
                    <div className="space-y-2">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white">Área de liderança</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-4">
                            {showMySolicitations ? (
                                <Link
                                    href={route('solicitations.index')}
                                    className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 active:bg-zinc-50 dark:active:bg-zinc-800 transition-colors"
                                >
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-zinc-100 dark:bg-zinc-800">
                                        <UserCircleIcon className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <span className="font-semibold text-zinc-900 dark:text-white block">Atendimento Pastoral</span>
                                        <span className="text-sm text-zinc-500 dark:text-zinc-400">Solicitações e conversas no painel web</span>
                                    </div>
                                </Link>
                            ) : null}
                            {showMyVolunteers ? (
                                <Link
                                    href={route('ministry-lead.my-volunteers.index')}
                                    className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 active:bg-zinc-50 dark:active:bg-zinc-800 transition-colors"
                                >
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-zinc-100 dark:bg-zinc-800">
                                        <UserGroupIcon className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <span className="font-semibold text-zinc-900 dark:text-white block">Meus voluntários</span>
                                        <span className="text-sm text-zinc-500 dark:text-zinc-400">Status (Recusar/Treinamento/Atuante)</span>
                                    </div>
                                </Link>
                            ) : null}
                            {showCommunicationRequests ? (
                                <Link
                                    href={route('communication-requests.index')}
                                    className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 active:bg-zinc-50 dark:active:bg-zinc-800 transition-colors"
                                >
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-zinc-100 dark:bg-zinc-800">
                                        <ChatBubbleLeftRightIcon className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <span className="font-semibold text-zinc-900 dark:text-white block">Comunicação</span>
                                        <span className="text-sm text-zinc-500 dark:text-zinc-400">Solicitações e acompanhamento</span>
                                    </div>
                                </Link>
                            ) : null}
                        </div>
                    </div>
                ) : null}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-4">
                    {items.map((item) => {
                        const { name, description, icon: Icon } = item;
                        const className = 'flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 active:bg-zinc-50 dark:active:bg-zinc-800 transition-colors';
                        const content = (
                            <>
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-zinc-100 dark:bg-zinc-800">
                                    <Icon className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <span className="font-semibold text-zinc-900 dark:text-white block">{name}</span>
                                    <span className="text-sm text-zinc-500 dark:text-zinc-400">{description}</span>
                                </div>
                            </>
                        );
                        if ('externalHref' in item && item.externalHref) {
                            return (
                                <a
                                    key={name}
                                    href={item.externalHref}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={className}
                                >
                                    {content}
                                </a>
                            );
                        }
                        return (
                            <Link key={name} href={route(item.route!)} className={className}>
                                {content}
                            </Link>
                        );
                    })}

                    <SobreOAppNavItem variant="more" />
                </div>
            </div>
        </MobileLayout>
    );
}
