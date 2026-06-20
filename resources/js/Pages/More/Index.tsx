import AdminLayout from '@/Layouts/AdminLayout';
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
    LifebuoyIcon,
} from '@heroicons/react/24/outline';
import { PHOTOS_DRIVE_FOLDER_URL } from '@/constants/externalLinks';
import { useAppFeatures } from '@/hooks/useAppFeatures';
import type { ComponentType, SVGProps } from 'react';

type MenuIcon = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

type MoreMenuItem =
    | { name: string; description: string; route: string; icon: MenuIcon; featureKey: string; externalHref?: never }
    | { name: string; description: string; externalHref: string; icon: MenuIcon; featureKey?: string; route?: never };

interface Props {
    latestMusicas?: unknown[];
    latestPrayerRequests?: unknown[];
}

const PASTORAL_ROUTE = 'mobile.pastoral-appointments.request' as const;

const items: MoreMenuItem[] = [
    { name: 'Dízimos e Ofertas', description: 'Contribuições e ofertas', route: 'mobile.offerings', featureKey: 'offerings', icon: HandRaisedIcon },
    { name: 'Culto', description: 'Vídeos do culto online', route: 'mobile.culto', featureKey: 'culto', icon: FilmIcon },
    { name: 'Música', description: 'Cante conosco', route: 'musica.index', featureKey: 'musica', icon: MusicalNoteIcon },
    { name: 'Cultos e horários', description: 'Dias e horários dos cultos', route: 'mobile.services', featureKey: 'services', icon: ClockIcon },
    {
        name: 'Fotos',
        description: 'Álbum de fotos (Google Drive)',
        externalHref: PHOTOS_DRIVE_FOLDER_URL,
        featureKey: 'photos',
        icon: PhotoIcon,
    },
    { name: 'Biblioteca', description: 'Livros e PDFs no app', route: 'mobile.biblioteca', featureKey: 'library', icon: BookOpenIcon },
    { name: 'Localização', description: 'Endereço e mapa da igreja', route: 'mobile.location', featureKey: 'location', icon: MapPinIcon },
    { name: 'Nossos pastores', description: 'Conheça a equipe pastoral', route: 'mobile.pastors', featureKey: 'pastors', icon: UserCircleIcon },
    { name: 'Quem somos', description: 'História e significado do nome', route: 'mobile.quem-somos', featureKey: 'quem_somos', icon: UserGroupIcon },
    { name: 'Em que acreditamos', description: '28 princípios de fé (IASD)', route: 'mobile.beliefs', featureKey: 'beliefs', icon: BookOpenIcon },
    {
        name: 'Cadastro de voluntário',
        description: 'Quero servir em ministérios (formulário completo)',
        route: 'volunteers.public-signup.page',
        featureKey: 'volunteer_signup',
        icon: UserPlusIcon,
    },
    { name: 'Séries', description: 'Veja todas as séries já passadas na Nova Semente', route: 'mobile.acervo', featureKey: 'acervo', icon: PlayCircleIcon },
    { name: 'Classe Começos', description: 'Estudo bíblico presencial ou on-line', route: 'varios.classe-comecos', featureKey: 'classe_comecos', icon: AcademicCapIcon },
    {
        name: 'Suporte APP',
        description: 'Problema, sugestão ou elogio sobre o app',
        route: 'mobile.support.index',
        featureKey: 'support',
        icon: LifebuoyIcon,
    },
];

export default function MoreIndex(_: Props) {
    const page = usePage();
    const authUser = (page.props as { auth?: { user?: unknown } }).auth?.user;
    const { isEnabled } = useAppFeatures();
    const visibleItems = items.filter((item) => {
        if (item.featureKey) {
            return isEnabled(item.featureKey);
        }

        return true;
    });

    return (
        <AdminLayout>
            <Head title="Mais" />
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">Mais</h1>
                    <div className="mt-1 space-y-1">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white">Outras funcionalidades</p>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            Para acessar todas as funcionalidades do nosso app,{' '}
                            <Link href={route('register')} className="font-semibold underline">
                                faça seu cadastro aqui
                            </Link>
                            .
                        </p>
                    </div>
                </div>

                {authUser ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Link
                            href={route(PASTORAL_ROUTE)}
                            className="block rounded-2xl border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 p-5 shadow-sm hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors"
                        >
                            <span className="text-sm font-semibold text-zinc-900 dark:text-white">Agendar com pastor</span>
                            <span className="block text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                Os meus pedidos e novo agendamento
                            </span>
                        </Link>
                    </div>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {visibleItems.map((item) => {
                        const { name, description, icon: Icon } = item;
                        const className = 'flex items-center gap-4 p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors';
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
                </div>
            </div>
        </AdminLayout>
    );
}
