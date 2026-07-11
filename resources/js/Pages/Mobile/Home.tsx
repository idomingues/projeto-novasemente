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
import WeeklyProgramHomeCard, { type WeeklyProgramHomeCardData } from '@/Components/Mobile/WeeklyProgramHomeCard';
import HomeFeaturedWeek, { type HomeFeaturedWeekPayload } from '@/Components/Mobile/HomeFeaturedWeek';
import HomeCardBookmarkButton from '@/Components/Mobile/HomeCardBookmarkButton';
import PrayingHandsIcon from '@/Components/PrayingHandsIcon';
import { useAppFeatures } from '@/hooks/useAppFeatures';

type MenuIcon = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

interface Props {
    showPostRegistrationBanner?: boolean;
    volunteerSignupCompletion?: VolunteerSignupCompletion | null;
    sabbathBanner?: SabbathHomeBannerData | null;
    weeklyProgramCards?: WeeklyProgramHomeCardData[];
    featuredWeek?: HomeFeaturedWeekPayload | null;
    bookmarkedHomeCards?: string[];
}

type PageProps = {
    appUrl?: string;
    auth?: { user?: { name: string; email?: string; photo_url?: string | null } | null };
    csrf_token?: string;
};

function firstName(fullName: string): string {
    const t = fullName.trim();
    if (!t) return '';
    return t.split(/\s+/)[0] ?? t;
}

type QuickAction = {
    id: string;
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
    'group relative flex cursor-pointer flex-col rounded-2xl bg-white p-3.5 pr-9 text-left shadow-sm ring-1 ring-zinc-200 transition duration-200 hover:-translate-y-0.5 hover:bg-zinc-50 hover:shadow-md dark:bg-zinc-900 dark:ring-zinc-800 dark:hover:bg-zinc-800/60';

/** Atalhos da Home: itens exclusivos + todos do antigo menu Mais (sem duplicar por rota). */
const homeQuickActions: QuickAction[] = [
    {
        id: 'ano-biblico',
        label: 'Ano Bíblico',
        subtitle: 'Escolha um plano de leitura e acompanhe o seu progresso.',
        route: 'mobile.ano-biblico',
        featureKey: 'ano_biblico',
        icon: AcademicCapIcon,
    },
    {
        id: 'voluntario',
        label: 'Voluntário',
        subtitle: 'Cadastro completo',
        route: 'volunteers.public-signup.page',
        featureKey: 'volunteer_signup',
        icon: UserPlusIcon,
    },
    {
        id: 'batismo',
        label: 'Batismo',
        subtitle: 'Ainda não é batizado? Faça parte da família NS',
        route: 'mobile.baptism',
        featureKey: 'baptism',
        icon: SparklesIcon,
    },
    {
        id: 'biblioteca',
        label: 'Biblioteca',
        subtitle: 'Livros e PDFs para leitura e download',
        route: 'mobile.biblioteca',
        featureKey: 'library',
        icon: BookOpenIcon,
    },
    {
        id: 'biblia',
        label: 'Bíblia',
        subtitle: 'Leitura e busca de versículos',
        route: 'mobile.bible',
        featureKey: 'bible',
        icon: BookOpenIcon,
    },
    {
        id: 'caixa-promessas',
        label: 'Caixa de Promessas',
        subtitle: 'Uma mensagem especial para você',
        featureKey: 'promise_box',
        icon: SparklesIcon,
    },
    {
        id: 'central-servicos',
        label: 'Central de Serviços',
        subtitle: 'Serviços, habilidades e apoio mútuo entre membros',
        route: 'mobile.talents.index',
        featureKey: 'talents',
        icon: SparklesIcon,
    },
    {
        id: 'classe-comecos',
        label: 'Classe Começos',
        subtitle: 'Estudo bíblico presencial ou on-line',
        route: 'varios.classe-comecos',
        featureKey: 'classe_comecos',
        icon: AcademicCapIcon,
    },
    {
        id: 'comunidades',
        label: 'Comunidades',
        subtitle: 'Grupos de interesse da igreja no WhatsApp',
        route: 'mobile.communities',
        featureKey: 'communities',
        icon: UserGroupIcon,
    },
    {
        id: 'culto',
        label: 'Culto',
        subtitle: 'Vídeos do culto online',
        route: 'mobile.culto',
        featureKey: 'culto',
        icon: FilmIcon,
    },
    {
        id: 'horarios',
        label: 'Horários',
        subtitle: 'Dias e horários dos cultos',
        route: 'mobile.services',
        featureKey: 'services',
        icon: ClockIcon,
    },
    {
        id: 'meditacao-diaria',
        label: 'Meditação diária',
        subtitle: 'Meditação diária de hoje',
        route: 'mobile.meditacao-diaria',
        featureKey: 'devotional',
        icon: BookOpenIcon,
    },
    {
        id: 'licao',
        label: 'Lição',
        subtitle: 'Estudo da lição da escola sabatina',
        route: 'mobile.biblioteca',
        routeParams: { tab: 'lesson', solo: '1' },
        featureKey: 'library',
        icon: ClipboardDocumentListIcon,
    },
    {
        id: 'dizimos-pacto',
        label: 'Dízimos e Pacto',
        subtitle: 'Contribua com dízimos e pacto de forma simples',
        route: 'mobile.offerings',
        featureKey: 'offerings',
        icon: HandRaisedIcon,
    },
    {
        id: 'doacao',
        label: 'Doação',
        subtitle: 'Seu gesto de amor pode transformar vidas e renovar esperanças',
        route: 'mobile.donations.index',
        featureKey: 'charity_donations',
        icon: BanknotesIcon,
    },
    {
        id: 'doar-talentos',
        label: 'Doar Talentos',
        subtitle: 'Compartilhe talentos, aprendizado e apoio gratuito na comunidade',
        route: 'mobile.shared-talents.index',
        featureKey: 'shared_talents',
        icon: UserGroupIcon,
    },
    {
        id: 'em-que-cremos',
        label: 'Em que cremos',
        subtitle: '28 princípios de fé (IASD)',
        route: 'mobile.beliefs',
        featureKey: 'beliefs',
        icon: BookOpenIcon,
    },
    {
        id: 'eventos',
        label: 'Eventos',
        subtitle: 'Agenda de eventos da igreja',
        route: 'mobile.events',
        featureKey: 'events',
        icon: CalendarDaysIcon,
    },
    {
        id: 'fotos',
        label: 'Fotos',
        subtitle: 'Veja o que nossos fotógrafos prepararam para você',
        route: 'mobile.fotos',
        featureKey: 'photos',
        icon: PhotoIcon,
    },
    {
        id: 'localizacao',
        label: 'Localização',
        subtitle: 'Endereço e mapa da igreja',
        route: 'mobile.location',
        featureKey: 'location',
        icon: MapPinIcon,
    },
    {
        id: 'missao',
        label: 'Missão',
        subtitle: 'Eventos, depoimentos, mural e cadastro missionário',
        route: 'mobile.mission',
        featureKey: 'mission',
        icon: GlobeAltIcon,
    },
    {
        id: 'musica',
        label: 'Música',
        subtitle: 'Cante nossas músicas',
        route: 'mobile.musica',
        featureKey: 'musica',
        icon: MusicalNoteIcon,
    },
    {
        id: 'pastores',
        label: 'Pastores',
        subtitle: 'Conheça a equipe pastoral',
        route: 'mobile.pastors',
        featureKey: 'pastors',
        icon: UserCircleIcon,
    },
    {
        id: 'oferta-nova-semente',
        label: 'Oferta Nova Semente',
        subtitle: 'Contribuições para causas que transformam vidas',
        route: 'mobile.campaigns.index',
        featureKey: 'donation_campaigns',
        icon: BanknotesIcon,
    },
    {
        id: 'oracao',
        label: 'Oração',
        subtitle: 'Pedidos de oração',
        route: 'mobile.prayer',
        featureKey: 'prayer',
        icon: PrayingHandsIcon,
    },
    {
        id: 'quem-somos',
        label: 'Quem somos',
        subtitle: 'História e significado do nome',
        route: 'mobile.quem-somos',
        featureKey: 'quem_somos',
        icon: UserGroupIcon,
    },
    {
        id: 'revista-adventista',
        label: 'Revista Adventista',
        subtitle: 'Artigos, editoriais e colunas da Revista Adventista',
        route: 'mobile.revista-adventista',
        featureKey: 'revista_adventista',
        icon: NewspaperIcon,
    },
    {
        id: 'saude',
        label: 'Saúde',
        subtitle: 'Conteúdos de saúde e bem-estar',
        route: 'mobile.health',
        featureKey: 'health',
        icon: HeartIcon,
    },
    {
        id: 'series',
        label: 'Séries',
        subtitle: 'Conheça todas as nossas séries',
        route: 'mobile.acervo',
        featureKey: 'acervo',
        icon: PlayCircleIcon,
    },
    {
        id: 'suporte-app',
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
    weeklyProgramCards = [],
    featuredWeek = null,
    bookmarkedHomeCards = [],
}: Props) {
    const page = usePage();
    const { appUrl = '', auth, csrf_token: csrfProp } = page.props as unknown as PageProps;
    const user = auth?.user ?? null;
    const displayName = user?.name ? firstName(user.name) : '';
    const [promiseOpen, setPromiseOpen] = useState(false);
    const [bookmarks, setBookmarks] = useState<string[]>(bookmarkedHomeCards);
    const [bookmarkBusy, setBookmarkBusy] = useState(false);

    useEffect(() => {
        setBookmarks(bookmarkedHomeCards);
    }, [bookmarkedHomeCards]);

    const openPromise = () => {
        setPromiseOpen(true);
    };

    const { isEnabled } = useAppFeatures();

    const featuredItems = useMemo(() => {
        const raw = featuredWeek?.items ?? [];
        return raw.filter((item) => !item.feature_key || isEnabled(item.feature_key));
    }, [featuredWeek, isEnabled]);

    const canBookmark = Boolean(user);

    const toggleBookmark = async (cardKey: string) => {
        if (!canBookmark || bookmarkBusy) {
            return;
        }
        setBookmarkBusy(true);
        const prev = bookmarks;
        const next = prev.includes(cardKey)
            ? prev.filter((k) => k !== cardKey)
            : [cardKey, ...prev.filter((k) => k !== cardKey)];
        setBookmarks(next);

        try {
            const csrf =
                csrfProp ??
                document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ??
                '';
            const response = await fetch(route('mobile.home.bookmarks.toggle'), {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrf,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
                body: JSON.stringify({ card_key: cardKey }),
            });
            if (!response.ok) {
                setBookmarks(prev);
                return;
            }
            const payload = (await response.json()) as { bookmarkedHomeCards?: string[] };
            if (Array.isArray(payload.bookmarkedHomeCards)) {
                setBookmarks(payload.bookmarkedHomeCards);
            }
        } catch {
            setBookmarks(prev);
        } finally {
            setBookmarkBusy(false);
        }
    };

    const gridItems = useMemo(() => {
        const actions = homeQuickActions
            .map((action) =>
                action.id === 'caixa-promessas' ? { ...action, onClick: openPromise } : action,
            )
            .filter((action) => !action.featureKey || isEnabled(action.featureKey))
            .map((action) => ({ kind: 'action' as const, id: action.id, label: action.label, action }));

        const items = [...actions, { kind: 'sobre' as const, id: 'sobre-o-app', label: 'Sobre o APP' }];

        return items.sort((a, b) => {
            const aBook = bookmarks.includes(a.id) ? 0 : 1;
            const bBook = bookmarks.includes(b.id) ? 0 : 1;
            if (aBook !== bBook) {
                return aBook - bBook;
            }
            if (aBook === 0) {
                return bookmarks.indexOf(a.id) - bookmarks.indexOf(b.id);
            }
            return a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' });
        });
    }, [isEnabled, bookmarks]);

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

                {weeklyProgramCards.length > 0 ? (
                    <section aria-label="Programação semanal" className="space-y-3">
                        {weeklyProgramCards.map((card) => (
                            <WeeklyProgramHomeCard key={card.id} card={card} appUrl={appUrl} />
                        ))}
                    </section>
                ) : sabbathBanner ? (
                    <SabbathHomeBanner banner={sabbathBanner} appUrl={appUrl} />
                ) : null}

                <HomeFeaturedWeek items={featuredItems} />

                <section aria-label="Atalhos">
                    <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3">
                        {gridItems.map((item) => {
                            if (item.kind === 'sobre') {
                                return (
                                    <SobreOAppNavItem
                                        key="sobre-o-app"
                                        variant="home"
                                        bookmark={
                                            canBookmark
                                                ? {
                                                      bookmarked: bookmarks.includes('sobre-o-app'),
                                                      onToggle: () => void toggleBookmark('sobre-o-app'),
                                                      disabled: bookmarkBusy,
                                                  }
                                                : undefined
                                        }
                                    />
                                );
                            }

                            const { id, label, subtitle, route: routeName, routeParams, onClick, icon } = item.action;
                            const content = (
                                <>
                                    {canBookmark ? (
                                        <HomeCardBookmarkButton
                                            cardKey={id}
                                            bookmarked={bookmarks.includes(id)}
                                            disabled={bookmarkBusy}
                                            onToggle={(key) => void toggleBookmark(key)}
                                        />
                                    ) : null}
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
                                    <button key={id} type="button" onClick={onClick} className={homeCardClass}>
                                        {content}
                                    </button>
                                );
                            }

                            if (!routeName) return null;

                            return (
                                <Link
                                    key={id}
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
