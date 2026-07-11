import MobileLayout from '@/Layouts/MobileLayout';
import SobreOAppNavItem from '@/Components/Mobile/SobreOAppNavItem';
import { Head, Link } from '@inertiajs/react';
import {
    CalendarDaysIcon,
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
    HeartIcon,
    GlobeAltIcon,
    BanknotesIcon,
    SparklesIcon,
    LifebuoyIcon,
    NewspaperIcon,
} from '@heroicons/react/24/outline';
import PrayingHandsIcon from '@/Components/PrayingHandsIcon';
import { useAppFeatures } from '@/hooks/useAppFeatures';
import type { ComponentType, SVGProps } from 'react';

type MenuIcon = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

type MoreMenuItem =
    | { name: string; description: string; route: string; icon: MenuIcon; featureKey: string; externalHref?: never }
    | { name: string; description: string; externalHref: string; icon: MenuIcon; route?: never; featureKey?: never };

interface Props {
    latestMusicas?: unknown[];
    latestPrayerRequests?: unknown[];
}

const items: MoreMenuItem[] = [
    { name: 'Bíblia', description: 'Leitura e busca de versículos', route: 'mobile.bible', featureKey: 'bible', icon: BookOpenIcon },
    { name: 'Eventos', description: 'Agenda de eventos da igreja', route: 'mobile.events', featureKey: 'events', icon: CalendarDaysIcon },
    { name: 'Dízimos e Pacto', description: 'Contribuições e pacto', route: 'mobile.offerings', featureKey: 'offerings', icon: HandRaisedIcon },
    {
        name: 'Ano Bíblico',
        description: 'Escolha um plano de leitura e acompanhe o seu progresso.',
        route: 'mobile.ano-biblico',
        featureKey: 'ano_biblico',
        icon: AcademicCapIcon,
    },
    { name: 'Saúde', description: 'Conteúdos de saúde e bem-estar', route: 'mobile.health', featureKey: 'health', icon: HeartIcon },
    {
        name: 'Revista Adventista',
        description: 'Artigos, editoriais e colunas da Revista Adventista',
        route: 'mobile.revista-adventista',
        featureKey: 'revista_adventista',
        icon: NewspaperIcon,
    },
    { name: 'Missão', description: 'Eventos, depoimentos, mural e cadastro missionário', route: 'mobile.mission', featureKey: 'mission', icon: GlobeAltIcon },
    {
        name: 'Comunidades',
        description: 'Grupos de interesse da igreja no WhatsApp',
        route: 'mobile.communities',
        featureKey: 'communities',
        icon: UserGroupIcon,
    },
    { name: 'Oração', description: 'Pedidos de oração', route: 'mobile.prayer', featureKey: 'prayer', icon: PrayingHandsIcon },
    { name: 'Oferta Nova Semente', description: 'Contribuições para causas que transformam vidas', route: 'mobile.campaigns.index', featureKey: 'donation_campaigns', icon: BanknotesIcon },
    { name: 'Doação', description: 'Seu gesto de amor pode transformar vidas e renovar esperanças', route: 'mobile.donations.index', featureKey: 'charity_donations', icon: BanknotesIcon },
    {
        name: 'Central de Serviços',
        description: 'Serviços, habilidades e apoio mútuo entre membros',
        route: 'mobile.talents.index',
        featureKey: 'talents',
        icon: SparklesIcon,
    },
    {
        name: 'Doar Talentos',
        description: 'Compartilhe talentos, aprendizado e apoio gratuito na comunidade',
        route: 'mobile.shared-talents.index',
        featureKey: 'shared_talents',
        icon: UserGroupIcon,
    },
    { name: 'Culto', description: 'Vídeos do culto online', route: 'mobile.culto', featureKey: 'culto', icon: FilmIcon },
    { name: 'Música', description: 'Cante conosco', route: 'mobile.musica', featureKey: 'musica', icon: MusicalNoteIcon },
    { name: 'Cultos e horários', description: 'Dias e horários dos cultos', route: 'mobile.services', featureKey: 'services', icon: ClockIcon },
    {
        name: 'Fotos',
        description: 'Álbum de fotos',
        route: 'mobile.fotos',
        featureKey: 'photos',
        icon: PhotoIcon,
    },
    { name: 'Biblioteca', description: 'Livros e PDFs para leitura e download', route: 'mobile.biblioteca', featureKey: 'library', icon: BookOpenIcon },
    { name: 'Localização', description: 'Endereço e mapa da igreja', route: 'mobile.location', featureKey: 'location', icon: MapPinIcon },
    { name: 'Nossos pastores', description: 'Conheça a equipe pastoral', route: 'mobile.pastors', featureKey: 'pastors', icon: UserCircleIcon },
    { name: 'Quem somos', description: 'História e significado do nome', route: 'mobile.quem-somos', featureKey: 'quem_somos', icon: UserGroupIcon },
    { name: 'Em que acreditamos', description: '28 princípios de fé (IASD)', route: 'mobile.beliefs', featureKey: 'beliefs', icon: BookOpenIcon },
    {
        name: 'Área do voluntário',
        description: 'Cadastro completo',
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

export default function MobileMore(_: Props) {
    const { isEnabled } = useAppFeatures();
    const visibleItems = items
        .filter((item) => {
            if ('featureKey' in item && item.featureKey) {
                return isEnabled(item.featureKey);
            }

            return true;
        })
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));

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
                    {visibleItems.map((item) => {
                        const { name, description, icon: Icon } = item;
                        const className = 'flex cursor-pointer items-center gap-4 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 active:bg-zinc-50 dark:active:bg-zinc-800 transition-colors';
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
