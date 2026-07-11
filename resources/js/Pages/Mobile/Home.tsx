import MobileLayout from '@/Layouts/MobileLayout';
import VolunteerSignupIncompleteBanner from '@/Components/Volunteers/VolunteerSignupIncompleteBanner';
import type { VolunteerSignupCompletion } from '@/utils/volunteerSignupCompletion';
import { Head, Link, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import {
    AcademicCapIcon,
    BanknotesIcon,
    BookOpenIcon,
    CalendarDaysIcon,
    ClockIcon,
    FilmIcon,
    GlobeAltIcon,
    HandRaisedIcon,
    HeartIcon,
    LifebuoyIcon,
    MapPinIcon,
    MusicalNoteIcon,
    NewspaperIcon,
    PhotoIcon,
    PlayCircleIcon,
    ClipboardDocumentListIcon,
    SparklesIcon,
    UserCircleIcon,
    UserGroupIcon,
    UserPlusIcon,
} from '@heroicons/react/24/outline';
import type { ComponentType, SVGProps } from 'react';
import PromiseBoxModal from '@/Components/Mobile/PromiseBoxModal';
import SobreOAppNavItem from '@/Components/Mobile/SobreOAppNavItem';
import SabbathHomeBanner, { type SabbathHomeBannerData } from '@/Components/Mobile/SabbathHomeBanner';
import PrayingHandsIcon from '@/Components/PrayingHandsIcon';
import { useAppFeatures } from '@/hooks/useAppFeatures';

type MenuIcon = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

interface Props {
    showPostRegistrationBanner?: boolean;
    volunteerSignupCompletion?: VolunteerSignupCompletion | null;
    sabbathBanner?: SabbathHomeBannerData | null;
}

type PageProps = {
    appUrl?: string;
    auth?: { user?: { name: string; email?: string; photo_url?: string | null } | null };
};

function firstName(fullName: string): string {
    const t = fullName.trim();
    if (!t) return '';
    return t.split(/\s+/)[0] ?? t;
}

type QuickAction = {
    label: string;
    subtitle: string;
    route?: string;
    routeParams?: Record<string, string | number>;
    featureKey?: string;
    onClick?: () => void;
    icon: MenuIcon;
};

function QuickActionGlyph({ icon: Icon }: { icon: MenuIcon }) {
    return <Icon className="h-5 w-5" aria-hidden strokeWidth={2.05} />;
}

const homeCardClass =
    'group flex cursor-pointer flex-col rounded-2xl bg-white p-3.5 text-left shadow-sm ring-1 ring-zinc-200 transition duration-200 hover:-translate-y-0.5 hover:bg-zinc-50 hover:shadow-md dark:bg-zinc-900 dark:ring-zinc-800 dark:hover:bg-zinc-800/60';

/** Atalhos da Home: itens exclusivos + todos do antigo menu Mais (sem duplicar por rota). */
const homeQuickActions: QuickAction[] = [
    {
        label: 'Ano Bíblico',
        subtitle: 'Escolha um plano de leitura e acompanhe o seu progresso.',
        route: 'mobile.ano-biblico',
        featureKey: 'ano_biblico',
        icon: AcademicCapIcon,
    },
    {
        label: 'Voluntário',
        subtitle: 'Cadastro completo',
        route: 'volunteers.public-signup.page',
        featureKey: 'volunteer_signup',
        icon: UserPlusIcon,
    },
    {
        label: 'Batismo',
        subtitle: 'Ainda não é batizado? Faça parte da família NS',
        route: 'mobile.baptism',
        featureKey: 'baptism',
        icon: SparklesIcon,
    },
    {
        label: 'Biblioteca',
        subtitle: 'Livros e PDFs para leitura e download',
        route: 'mobile.biblioteca',
        featureKey: 'library',
        icon: BookOpenIcon,
    },
    {
        label: 'Bíblia',
        subtitle: 'Leitura e busca de versículos',
        route: 'mobile.bible',
        featureKey: 'bible',
        icon: BookOpenIcon,
    },
    {
        label: 'Caixa de Promessas',
        subtitle: 'Uma mensagem especial para você',
        featureKey: 'promise_box',
        icon: SparklesIcon,
    },
    {
        label: 'Central de Serviços',
        subtitle: 'Serviços, habilidades e apoio mútuo entre membros',
        route: 'mobile.talents.index',
        featureKey: 'talents',
        icon: SparklesIcon,
    },
    {
        label: 'Classe Começos',
        subtitle: 'Estudo bíblico presencial ou on-line',
        route: 'varios.classe-comecos',
        featureKey: 'classe_comecos',
        icon: AcademicCapIcon,
    },
    {
        label: 'Comunidades',
        subtitle: 'Grupos de interesse da igreja no WhatsApp',
        route: 'mobile.communities',
        featureKey: 'communities',
        icon: UserGroupIcon,
    },
    {
        label: 'Culto',
        subtitle: 'Vídeos do culto online',
        route: 'mobile.culto',
        featureKey: 'culto',
        icon: FilmIcon,
    },
    {
        label: 'Horários',
        subtitle: 'Dias e horários dos cultos',
        route: 'mobile.services',
        featureKey: 'services',
        icon: ClockIcon,
    },
    {
        label: 'Meditação diária',
        subtitle: 'Meditação diária de hoje',
        route: 'mobile.meditacao-diaria',
        featureKey: 'devotional',
        icon: BookOpenIcon,
    },
    {
        label: 'Lição',
        subtitle: 'Estudo da lição da escola sabatina',
        route: 'mobile.biblioteca',
        routeParams: { tab: 'lesson' },
        featureKey: 'library',
        icon: ClipboardDocumentListIcon,
    },
    {
        label: 'Dízimos e Pacto',
        subtitle: 'Contribua com dízimos e pacto de forma simples',
        route: 'mobile.offerings',
        featureKey: 'offerings',
        icon: HandRaisedIcon,
    },
    {
        label: 'Doação',
        subtitle: 'Seu gesto de amor pode transformar vidas e renovar esperanças',
        route: 'mobile.donations.index',
        featureKey: 'charity_donations',
        icon: BanknotesIcon,
    },
    {
        label: 'Doar Talentos',
        subtitle: 'Compartilhe talentos, aprendizado e apoio gratuito na comunidade',
        route: 'mobile.shared-talents.index',
        featureKey: 'shared_talents',
        icon: UserGroupIcon,
    },
    {
        label: 'Em que cremos',
        subtitle: '28 princípios de fé (IASD)',
        route: 'mobile.beliefs',
        featureKey: 'beliefs',
        icon: BookOpenIcon,
    },
    {
        label: 'Eventos',
        subtitle: 'Agenda de eventos da igreja',
        route: 'mobile.events',
        featureKey: 'events',
        icon: CalendarDaysIcon,
    },
    {
        label: 'Fotos',
        subtitle: 'Veja o que nossos fotógrafos prepararam para você',
        route: 'mobile.fotos',
        featureKey: 'photos',
        icon: PhotoIcon,
    },
    {
        label: 'Localização',
        subtitle: 'Endereço e mapa da igreja',
        route: 'mobile.location',
        featureKey: 'location',
        icon: MapPinIcon,
    },
    {
        label: 'Missão',
        subtitle: 'Eventos, depoimentos, mural e cadastro missionário',
        route: 'mobile.mission',
        featureKey: 'mission',
        icon: GlobeAltIcon,
    },
    {
        label: 'Música',
        subtitle: 'Cante nossas músicas',
        route: 'mobile.musica',
        featureKey: 'musica',
        icon: MusicalNoteIcon,
    },
    {
        label: 'Pastores',
        subtitle: 'Conheça a equipe pastoral',
        route: 'mobile.pastors',
        featureKey: 'pastors',
        icon: UserCircleIcon,
    },
    {
        label: 'Oferta Nova Semente',
        subtitle: 'Contribuições para causas que transformam vidas',
        route: 'mobile.campaigns.index',
        featureKey: 'donation_campaigns',
        icon: BanknotesIcon,
    },
    {
        label: 'Oração',
        subtitle: 'Pedidos de oração',
        route: 'mobile.prayer',
        featureKey: 'prayer',
        icon: PrayingHandsIcon,
    },
    {
        label: 'Quem somos',
        subtitle: 'História e significado do nome',
        route: 'mobile.quem-somos',
        featureKey: 'quem_somos',
        icon: UserGroupIcon,
    },
    {
        label: 'Revista Adventista',
        subtitle: 'Artigos, editoriais e colunas da Revista Adventista',
        route: 'mobile.revista-adventista',
        featureKey: 'revista_adventista',
        icon: NewspaperIcon,
    },
    {
        label: 'Saúde',
        subtitle: 'Conteúdos de saúde e bem-estar',
        route: 'mobile.health',
        featureKey: 'health',
        icon: HeartIcon,
    },
    {
        label: 'Séries',
        subtitle: 'Conheça todas as nossas séries',
        route: 'mobile.acervo',
        featureKey: 'acervo',
        icon: PlayCircleIcon,
    },
    {
        label: 'Suporte APP',
        subtitle: 'Problema, sugestão ou elogio sobre o app',
        route: 'mobile.support.index',
        featureKey: 'support',
        icon: LifebuoyIcon,
    },
];

export default function MobileHome({
    showPostRegistrationBanner = false,
    volunteerSignupCompletion = null,
    sabbathBanner = null,
}: Props) {
    const page = usePage();
    const { appUrl = '', auth } = page.props as unknown as PageProps;
    const user = auth?.user ?? null;
    const displayName = user?.name ? firstName(user.name) : '';
    const [promiseOpen, setPromiseOpen] = useState(false);

    const openPromise = () => {
        setPromiseOpen(true);
    };

    const { isEnabled } = useAppFeatures();

    const gridItems = useMemo(() => {
        const actions = homeQuickActions
            .map((action) =>
                action.label === 'Caixa de Promessas'
                    ? { ...action, onClick: openPromise }
                    : action,
            )
            .filter((action) => !action.featureKey || isEnabled(action.featureKey))
            .map((action) => ({ kind: 'action' as const, label: action.label, action }));

        return [...actions, { kind: 'sobre' as const, label: 'Sobre o APP' }].sort((a, b) =>
            a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' }),
        );
    }, [isEnabled]);

    useEffect(() => {
        if (!showPostRegistrationBanner || typeof window === 'undefined') {
            return;
        }
        const u = new URL(window.location.href);
        if (u.searchParams.has('reg_ok')) {
            u.searchParams.delete('reg_ok');
            const next = u.pathname + (u.searchParams.toString() ? `?${u.searchParams.toString()}` : '') + u.hash;
            window.history.replaceState({}, '', next);
        }
    }, [showPostRegistrationBanner]);

    return (
        <MobileLayout>
            <Head title="Home" />
            <div className="mx-auto w-full max-w-lg space-y-7 pb-4 sm:max-w-xl md:max-w-2xl lg:max-w-none">
                {showPostRegistrationBanner ? (
                    <div
                        className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-50"
                        role="status"
                    >
                        <p className="font-semibold">Conta criada com sucesso</p>
                        <p className="mt-1 text-emerald-900/90 dark:text-emerald-100/90">
                            Você já está conectado(a). Explore o restante do aplicativo.
                        </p>
                    </div>
                ) : null}

                {user && volunteerSignupCompletion ? (
                    <VolunteerSignupIncompleteBanner completion={volunteerSignupCompletion} />
                ) : null}

                <header className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                        <p className="truncate text-lg font-bold leading-snug text-zinc-900 dark:text-white lg:text-2xl lg:font-semibold">
                            {user ? <>Bem-vindo, {displayName}!</> : <>Bem-vindo!</>}
                        </p>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 lg:mt-2 lg:max-w-2xl lg:text-base">
                            Fique por dentro de tudo que acontece na Nova Semente.
                        </p>
                    </div>
                </header>

                {sabbathBanner ? <SabbathHomeBanner banner={sabbathBanner} appUrl={appUrl} /> : null}

                <section aria-label="Atalhos">
                    <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3">
                        {gridItems.map((item) => {
                            if (item.kind === 'sobre') {
                                return <SobreOAppNavItem key="sobre-o-app" variant="home" />;
                            }

                            const { label, subtitle, route: routeName, routeParams, onClick, icon } = item.action;
                            const content = (
                                <>
                                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/70 dark:bg-emerald-950/45 dark:text-emerald-200 dark:ring-emerald-800/60">
                                        <QuickActionGlyph icon={icon} />
                                    </div>
                                    <div className="mt-3 min-w-0">
                                        <p className="text-[15px] font-semibold leading-tight text-zinc-900 dark:text-white">{label}</p>
                                        <p className="mt-1 text-[11px] font-medium leading-snug text-zinc-600 dark:text-zinc-300">
                                            {subtitle}
                                        </p>
                                    </div>
                                </>
                            );

                            if (onClick) {
                                return (
                                    <button key={label} type="button" onClick={onClick} className={homeCardClass}>
                                        {content}
                                    </button>
                                );
                            }

                            if (!routeName) return null;

                            return (
                                <Link
                                    key={label}
                                    href={
                                        routeParams
                                            ? route(routeName, routeParams)
                                            : route(routeName)
                                    }
                                    className={homeCardClass}
                                >
                                    {content}
                                </Link>
                            );
                        })}
                    </div>
                </section>

                <PromiseBoxModal show={promiseOpen} onClose={() => setPromiseOpen(false)} canFavorite={!!user} />
            </div>
        </MobileLayout>
    );
}
