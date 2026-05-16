import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import { formatWhenLine, getDayMonth, type MobileEventListItem } from '@/utils/mobileEventDisplay';
import {
    ArchiveBoxIcon,
    BanknotesIcon,
    MusicalNoteIcon,
    PhotoIcon,
    SparklesIcon,
    UserPlusIcon,
} from '@heroicons/react/24/outline';
import type { ComponentType, SVGProps } from 'react';

type MenuIcon = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

type NewsCard = {
    id: number;
    title: string;
    slug: string;
    excerpt: string | null;
    content_type: string;
    type_label: string;
    image_url: string | null;
    cover_url: string | null;
    published_at: string | null;
};

interface Props {
    latestNews: NewsCard[];
    upcomingEvents: MobileEventListItem[];
}

type PageProps = {
    appUrl?: string;
    auth?: { user?: { name: string; email?: string; photo_url?: string | null } | null };
};

function imageSrc(url: string | null, appUrl: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = appUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    return `${base}${url}`;
}

function firstName(fullName: string): string {
    const t = fullName.trim();
    if (!t) return '';
    return t.split(/\s+/)[0] ?? t;
}

function timeAgoPtBr(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const diffMs = Date.now() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Agora';
    if (diffMin < 60) return `Há ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `Há ${diffH} ${diffH === 1 ? 'hora' : 'horas'}`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `Há ${diffD} ${diffD === 1 ? 'dia' : 'dias'}`;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function cardSnippet(n: NewsCard): string {
    if (n.excerpt?.trim()) return n.excerpt.trim();
    if (n.content_type === 'youtube') return 'Vídeo no YouTube';
    if (n.content_type === 'pdf') return 'Documento PDF';
    if (n.content_type === 'image') return 'Imagem';
    if (n.content_type === 'instagram_feed') return 'Feed';
    return '';
}

/** Rodapé tipo “Hoje · 14:30” para cartões de notícia. */
function formatNewsWhen(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (sameDay) {
        return `Hoje · ${timeStr}`;
    }
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
        return `Ontem · ${timeStr}`;
    }
    const dateStr = d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
    return `${dateStr} · ${timeStr}`;
}

function eventCardSnippet(ev: MobileEventListItem): string | null {
    const d = ev.description?.trim();
    if (d) {
        return d;
    }
    const loc = ev.location?.trim();
    if (loc) {
        return loc;
    }

    return null;
}

type QuickAction = {
    label: string;
    subtitle: string;
    route: string;
    icon: MenuIcon;
};

function QuickActionGlyph({ icon: Icon }: { icon: MenuIcon }) {
    return <Icon className="h-5 w-5" aria-hidden strokeWidth={2.05} />;
}

const quickActions: QuickAction[] = [
    {
        label: 'Batismo',
        subtitle: 'Ainda não é batizado? Faça parte da família NS',
        route: 'mobile.baptism',
        icon: SparklesIcon,
    },
    {
        label: 'Seja um voluntário',
        subtitle: 'Venha servir na Nova Semente',
        route: 'volunteers.public-signup.page',
        icon: UserPlusIcon,
    },
    {
        label: 'Acervo',
        subtitle: 'Conheça todas as nossas séries',
        route: 'mobile.acervo',
        icon: ArchiveBoxIcon,
    },
    {
        label: 'Músicas',
        subtitle: 'Cante nossas músicas',
        route: 'mobile.musica',
        icon: MusicalNoteIcon,
    },
    {
        label: 'Fotos',
        subtitle: 'Veja o que nossos fotógrafos prepararam para você',
        route: 'mobile.fotos',
        icon: PhotoIcon,
    },
    {
        label: 'Oferta',
        subtitle: 'Faça sua oferta de forma simples',
        route: 'mobile.offerings',
        icon: BanknotesIcon,
    },
];

export default function MobileHome({ latestNews, upcomingEvents }: Props) {
    const page = usePage();
    const { appUrl = '', auth } = page.props as unknown as PageProps;
    const user = auth?.user ?? null;
    const displayName = user?.name ? firstName(user.name) : '';

    return (
        <MobileLayout>
            <Head title="Home" />
            <div className="mx-auto w-full max-w-lg space-y-7 pb-4 sm:max-w-xl md:max-w-2xl lg:max-w-none">
                <header className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                        <p className="truncate text-lg font-bold leading-snug text-zinc-900 dark:text-white lg:text-2xl lg:font-semibold">
                            {user ? <>Bem-vindo, {displayName}! 👋</> : <>Bem-vindo! 👋</>}
                        </p>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 lg:mt-2 lg:max-w-2xl lg:text-base">
                            Fique por dentro de tudo que acontece na Nova Semente.
                        </p>
                    </div>

                </header>

                <section aria-label="Atalhos">
                    <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3">
                        {quickActions.map(({ label, subtitle, route: routeName, icon }) => (
                            <Link
                                key={routeName}
                                href={route(routeName)}
                                className="group flex flex-col rounded-2xl bg-white p-3.5 text-left shadow-sm ring-1 ring-zinc-200 transition duration-200 hover:-translate-y-0.5 hover:bg-zinc-50 hover:shadow-md dark:bg-zinc-900 dark:ring-zinc-800 dark:hover:bg-zinc-800/60"
                            >
                                <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/70 dark:bg-emerald-950/45 dark:text-emerald-200 dark:ring-emerald-800/60">
                                    <QuickActionGlyph icon={icon} />
                                </div>
                                <div className="mt-3 min-w-0">
                                    <p className="text-[15px] font-semibold leading-tight text-zinc-900 dark:text-white">{label}</p>
                                    <p className="mt-1 text-[11px] font-medium leading-snug text-zinc-600 dark:text-zinc-300">
                                        {subtitle}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>

                <div className="space-y-8 lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-10 lg:gap-y-0 lg:space-y-0 xl:gap-x-12">
                    <section className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                            <h2 className="text-base font-extrabold text-zinc-900 dark:text-white lg:text-lg">Últimas Notícias</h2>
                            {latestNews.length > 0 ? (
                                <Link
                                    href={route('mobile.news')}
                                    className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
                                >
                                    Ver todas
                                </Link>
                            ) : null}
                        </div>
                        {latestNews.length === 0 ? (
                            <p className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400">
                                Ainda não há notícias publicadas.
                            </p>
                        ) : (
                            <ul className="space-y-3">
                                {latestNews.map((n) => {
                                    const thumb = n.cover_url || n.image_url;
                                    const src = imageSrc(thumb, appUrl);
                                    const snippet = cardSnippet(n);
                                    const whenLine = timeAgoPtBr(n.published_at) || formatNewsWhen(n.published_at);
                                    return (
                                        <li key={n.id}>
                                            <Link
                                                href={route('mobile.news.show', n.slug)}
                                                className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-zinc-200 transition hover:bg-zinc-50 dark:bg-zinc-900 dark:ring-zinc-800 dark:hover:bg-zinc-800/60"
                                            >
                                                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                                                    {src ? (
                                                        <img src={src} alt="" className="h-full w-full object-cover" />
                                                    ) : (
                                                        <div className="flex h-full w-full items-center justify-center text-[10px] font-medium text-zinc-400">
                                                            Nova Semente
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                                                        {n.type_label || 'COMUNIDADE'}
                                                    </p>
                                                    <p className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-zinc-900 dark:text-white">
                                                        {n.title}
                                                    </p>
                                                    {snippet ? <p className="mt-1 line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400">{snippet}</p> : null}
                                                    <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{whenLine}</p>
                                                </div>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>

                    <section className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                            <h2 className="text-base font-extrabold text-zinc-900 dark:text-white lg:text-lg">Próximos Eventos</h2>
                            {upcomingEvents.length > 0 ? (
                                <Link
                                    href={route('mobile.events')}
                                    className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
                                >
                                    Ver todas
                                </Link>
                            ) : null}
                        </div>
                        {upcomingEvents.length === 0 ? (
                            <p className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400">
                                Nenhum evento agendado por enquanto.
                            </p>
                        ) : (
                            <ul className="space-y-3">
                                {upcomingEvents.map((ev) => {
                                    const src = imageSrc(ev.image_url, appUrl);
                                    const { day, month } = getDayMonth(ev.starts_at);
                                    const snippet = eventCardSnippet(ev);
                                    const whenLine = formatWhenLine(ev);
                                    return (
                                        <li key={ev.id}>
                                            <Link
                                                href={route('mobile.events')}
                                                className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-zinc-200 transition hover:bg-zinc-50 dark:bg-zinc-900 dark:ring-zinc-800 dark:hover:bg-zinc-800/60"
                                            >
                                                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                                                    {src ? (
                                                        <img src={src} alt="" className="h-full w-full object-cover" />
                                                    ) : (
                                                        <div
                                                            className="flex h-full w-full flex-col items-center justify-center px-1 text-center text-white"
                                                            style={{ backgroundColor: ev.color || '#059669' }}
                                                        >
                                                            <span className="text-lg font-extrabold tabular-nums leading-none">{day}</span>
                                                            <span className="mt-0.5 text-[0.65rem] font-semibold uppercase leading-tight opacity-95">
                                                                {month}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-900 dark:text-white">{ev.title}</p>
                                                    {snippet ? <p className="mt-1 line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400">{snippet}</p> : null}
                                                    {whenLine ? <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{whenLine}</p> : null}
                                                </div>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>
                </div>
            </div>
        </MobileLayout>
    );
}
