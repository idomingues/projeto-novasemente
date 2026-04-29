import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import { formatWhenLine, getDayMonth, type MobileEventListItem } from '@/utils/mobileEventDisplay';
import {
    ArchiveBoxIcon,
    HeartIcon,
    MusicalNoteIcon,
    PhotoIcon,
    SparklesIcon,
    UserPlusIcon,
} from '@heroicons/react/24/outline';
import type { ComponentType, SVGProps } from 'react';

type MenuIcon = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

type ChurchLite = { name: string; logo_url: string | null } | null;

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
    church: ChurchLite;
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

function cardSnippet(n: NewsCard): string {
    if (n.excerpt?.trim()) return n.excerpt.trim();
    if (n.content_type === 'youtube') return 'Vídeo no YouTube';
    if (n.content_type === 'pdf') return 'Documento PDF';
    if (n.content_type === 'image') return 'Imagem';
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
    cardClass: string;
    iconWrapClass: string;
};

function QuickActionGlyph({ icon: Icon }: { icon: MenuIcon }) {
    return <Icon className="h-6 w-6" aria-hidden />;
}

const quickActions: QuickAction[] = [
    {
        label: 'Batismo',
        subtitle: 'Ainda não é batizado? Faça parte da família NS.',
        route: 'mobile.baptism',
        icon: SparklesIcon,
        cardClass: 'border-amber-200/90 bg-amber-50 dark:border-amber-800/45 dark:bg-amber-950/40',
        iconWrapClass: 'bg-amber-100/95 text-amber-900 dark:bg-amber-900/55 dark:text-amber-100',
    },
    {
        label: 'Seja um voluntário',
        subtitle: 'Venha servir na Nova Semente.',
        route: 'volunteers.public-signup.page',
        icon: UserPlusIcon,
        cardClass: 'border-emerald-200/90 bg-emerald-50 dark:border-emerald-800/45 dark:bg-emerald-950/40',
        iconWrapClass: 'bg-emerald-100/95 text-emerald-900 dark:bg-emerald-900/55 dark:text-emerald-100',
    },
    {
        label: 'Acervo',
        subtitle: 'Conheça todas as nossas séries',
        route: 'mobile.acervo',
        icon: ArchiveBoxIcon,
        cardClass: 'border-orange-200/90 bg-orange-50 dark:border-orange-800/40 dark:bg-orange-950/35',
        iconWrapClass: 'bg-orange-100/95 text-orange-950 dark:bg-orange-900/50 dark:text-orange-100',
    },
    {
        label: 'Músicas',
        subtitle: 'Cante nossas músicas',
        route: 'mobile.musica',
        icon: MusicalNoteIcon,
        cardClass: 'border-cyan-200/90 bg-cyan-50 dark:border-cyan-800/45 dark:bg-cyan-950/40',
        iconWrapClass: 'bg-cyan-100/95 text-cyan-900 dark:bg-cyan-900/55 dark:text-cyan-100',
    },
    {
        label: 'Fotos',
        subtitle: 'Veja o que nossos fotógrafos deixaram para você',
        route: 'mobile.fotos',
        icon: PhotoIcon,
        cardClass: 'border-rose-200/90 bg-rose-50 dark:border-rose-800/40 dark:bg-rose-950/35',
        iconWrapClass: 'bg-rose-100/95 text-rose-900 dark:bg-rose-900/50 dark:text-rose-100',
    },
    {
        label: 'Oferta',
        subtitle: 'Faça sua oferta de forma simples',
        route: 'mobile.offerings',
        icon: HeartIcon,
        cardClass: 'border-orange-200/90 bg-orange-50/90 dark:border-orange-800/40 dark:bg-orange-950/35',
        iconWrapClass: 'bg-orange-100/95 text-orange-950 dark:bg-orange-900/50 dark:text-orange-100',
    },
];

export default function MobileHome({ church, latestNews, upcomingEvents }: Props) {
    const page = usePage();
    const { appUrl = '', auth } = page.props as unknown as PageProps;
    const user = auth?.user ?? null;
    const displayName = user?.name ? firstName(user.name) : '';

    return (
        <MobileLayout>
            <Head title="Home" />
            <div className="mx-auto w-full max-w-lg space-y-8 pb-4 lg:max-w-2xl">
                <header className="flex items-start gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                            {user?.photo_url ? (
                                <img src={imageSrc(user.photo_url, appUrl)} alt="" className="h-full w-full object-cover" />
                            ) : church?.logo_url ? (
                                <img src={church.logo_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-200">
                                    {(displayName || church?.name || '?').charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div className="min-w-0 space-y-1">
                            <p className="truncate text-lg font-bold leading-snug text-zinc-900 dark:text-white">
                                {user ? (
                                    <>Bem-vindo, {displayName}! 👋</>
                                ) : (
                                    <>Bem-vindo! 👋</>
                                )}
                            </p>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">Fique por dentro de tudo que acontece na Nova Semente.</p>
                        </div>
                    </div>
                </header>

                <section>
                    <div className="grid grid-cols-2 gap-3">
                        {quickActions.map(({ label, subtitle, route: routeName, icon, cardClass, iconWrapClass }) => (
                            <Link
                                key={routeName}
                                href={route(routeName)}
                                className={`flex flex-col items-start gap-3 rounded-2xl border p-4 text-left shadow-sm transition hover:brightness-[0.98] dark:hover:brightness-110 ${cardClass}`}
                            >
                                <span
                                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-sm ${iconWrapClass}`}
                                >
                                    <QuickActionGlyph icon={icon} />
                                </span>
                                <div className="min-w-0">
                                    <span className="block font-bold leading-tight text-zinc-900 dark:text-white">{label}</span>
                                    <p className="mt-1 text-sm leading-snug text-zinc-600 dark:text-zinc-300">{subtitle}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>

                <section className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                        <h2 className="text-base font-bold text-zinc-900 dark:text-white">Últimas notícias</h2>
                        {latestNews.length > 0 ? (
                            <Link
                                href={route('mobile.news')}
                                className="text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
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
                                const whenLine = formatNewsWhen(n.published_at);
                                return (
                                    <li key={n.id}>
                                        <Link
                                            href={route('mobile.news.show', n.slug)}
                                            className="flex gap-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm transition hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600"
                                        >
                                            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
                                                {src ? (
                                                    <img src={src} alt="" className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center text-[10px] font-medium text-zinc-400">
                                                        Nova Semente
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1 py-0.5">
                                                <p className="line-clamp-2 font-semibold leading-snug text-zinc-900 dark:text-white">
                                                    {n.title}
                                                </p>
                                                {snippet ? (
                                                    <p className="mt-1 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">{snippet}</p>
                                                ) : null}
                                                {whenLine ? (
                                                    <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">{whenLine}</p>
                                                ) : null}
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
                        <h2 className="text-base font-bold text-zinc-900 dark:text-white">Próximos Eventos</h2>
                        {upcomingEvents.length > 0 ? (
                            <Link
                                href={route('mobile.events')}
                                className="text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
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
                                            className="flex gap-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm transition hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600"
                                        >
                                            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
                                                {src ? (
                                                    <img src={src} alt="" className="h-full w-full object-cover" />
                                                ) : (
                                                    <div
                                                        className="flex h-full w-full flex-col items-center justify-center px-1 text-center text-white"
                                                        style={{ backgroundColor: ev.color || '#059669' }}
                                                    >
                                                        <span className="text-xl font-bold tabular-nums leading-none">{day}</span>
                                                        <span className="mt-1 text-[0.65rem] font-semibold uppercase leading-tight opacity-95">
                                                            {month}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1 py-0.5">
                                                <p className="line-clamp-2 font-semibold leading-snug text-zinc-900 dark:text-white">
                                                    {ev.title}
                                                </p>
                                                {snippet ? (
                                                    <p className="mt-1 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">{snippet}</p>
                                                ) : null}
                                                {whenLine ? (
                                                    <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">{whenLine}</p>
                                                ) : null}
                                            </div>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>
            </div>
        </MobileLayout>
    );
}
