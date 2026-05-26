import MobileLayout from '@/Layouts/MobileLayout';
import SobreOAppNavItem from '@/Components/Mobile/SobreOAppNavItem';
import { Head, Link } from '@inertiajs/react';
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
    HeartIcon,
    GlobeAltIcon,
    BanknotesIcon,
    SparklesIcon,
    LifebuoyIcon,
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

const items: MoreMenuItem[] = [
    { name: 'Notícias', description: 'Notícias e comunicados da igreja', route: 'mobile.news', icon: NewspaperIcon },
    { name: 'Saúde', description: 'Conteúdos de saúde e bem-estar', route: 'mobile.health', icon: HeartIcon },
    { name: 'Missão', description: 'Eventos, recados, mural e cadastro missionário', route: 'mobile.mission', icon: GlobeAltIcon },
    { name: 'Oração', description: 'Pedidos de oração', route: 'mobile.prayer', icon: PrayingHandsIcon },
    { name: 'Doação', description: 'Seu gesto de amor pode transformar vidas e renovar esperanças', route: 'mobile.campaigns.index', icon: BanknotesIcon },
    {
        name: 'Central de Serviços',
        description: 'Serviços, habilidades e apoio mútuo entre membros',
        route: 'mobile.talents.index',
        icon: SparklesIcon,
    },
    {
        name: 'Doar Talentos',
        description: 'Compartilhe talentos, aprendizado e apoio gratuito na comunidade',
        route: 'mobile.shared-talents.index',
        icon: UserGroupIcon,
    },
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
        name: 'Voluntário',
        description: 'Quero servir em ministérios (formulário completo)',
        route: 'volunteers.public-signup.page',
        icon: UserPlusIcon,
    },
    { name: 'Acervo', description: 'Playlists do YouTube da Nova Semente', route: 'mobile.acervo', icon: PlayCircleIcon },
    { name: 'Classe Começos', description: 'Estudo bíblico presencial ou on-line', route: 'varios.classe-comecos', icon: AcademicCapIcon },
    {
        name: 'Suporte APP',
        description: 'Problema, sugestão ou elogio sobre o app',
        route: 'mobile.support.index',
        icon: LifebuoyIcon,
    },
];

export default function MobileMore(_: Props) {
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
