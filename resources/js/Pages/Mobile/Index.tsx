import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link } from '@inertiajs/react';
import { NewspaperIcon, CalendarDaysIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';

interface ChurchInfo {
    name: string;
    logo_url: string | null;
    city: string | null;
    state: string | null;
}

interface NewsItem {
    id: number;
    title: string;
    slug: string;
    excerpt: string | null;
    image_url: string | null;
    published_at: string | null;
}

interface EventItem {
    id: number;
    title: string;
    starts_at: string;
    ends_at: string | null;
    all_day: boolean;
    location: string | null;
}

interface Props {
    church: ChurchInfo | null;
    latestNews: NewsItem[];
    upcomingEvents: EventItem[];
}

function formatEventDate(iso: string, allDay: boolean): string {
    const d = new Date(iso);
    if (allDay) {
        return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
    }
    return d.toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function MobileIndex({ church, latestNews, upcomingEvents }: Props) {
    return (
        <MobileLayout>
            <Head title="Início" />
            <div className="space-y-6">
                {church && (
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                        {church.logo_url ? (
                            <img
                                src={church.logo_url}
                                alt={church.name}
                                className="w-12 h-12 rounded-xl object-cover"
                            />
                        ) : (
                            <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-lg">
                                {church.name.charAt(0)}
                            </div>
                        )}
                        <div>
                            <h1 className="font-semibold text-zinc-900 dark:text-white">{church.name}</h1>
                            {(church.city || church.state) && (
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                    {[church.city, church.state].filter(Boolean).join(', ')}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {upcomingEvents.length > 0 && (
                    <section>
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                                <CalendarDaysIcon className="w-5 h-5" />
                                Próximos eventos
                            </h2>
                            <Link
                                href={route('mobile.events')}
                                className="text-sm text-primary-600 dark:text-primary-400 font-medium"
                            >
                                Ver todos
                            </Link>
                        </div>
                        <ul className="space-y-2">
                            {upcomingEvents.map((ev) => (
                                <li key={ev.id}>
                                    <Link
                                        href={route('mobile.events')}
                                        className="block p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 active:bg-zinc-50 dark:active:bg-zinc-800"
                                    >
                                        <span className="font-medium text-zinc-900 dark:text-white block truncate">
                                            {ev.title}
                                        </span>
                                        <span className="text-sm text-zinc-500 dark:text-zinc-400">
                                            {formatEventDate(ev.starts_at, ev.all_day)}
                                            {ev.location && ` · ${ev.location}`}
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {latestNews.length > 0 && (
                    <section>
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                                <NewspaperIcon className="w-5 h-5" />
                                Notícias
                            </h2>
                            <Link
                                href={route('mobile.news')}
                                className="text-sm text-primary-600 dark:text-primary-400 font-medium"
                            >
                                Ver todas
                            </Link>
                        </div>
                        <ul className="space-y-3">
                            {latestNews.map((n) => (
                                <li key={n.id}>
                                    <Link
                                        href={route('mobile.news')}
                                        className="flex gap-3 p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 active:bg-zinc-50 dark:active:bg-zinc-800"
                                    >
                                        {n.image_url && (
                                            <img
                                                src={n.image_url}
                                                alt=""
                                                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                                            />
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <span className="font-medium text-zinc-900 dark:text-white block truncate">
                                                {n.title}
                                            </span>
                                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                                {n.published_at
                                                    ? new Date(n.published_at).toLocaleDateString('pt-BR')
                                                    : ''}
                                            </span>
                                            {n.excerpt && (
                                                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5 line-clamp-2">
                                                    {n.excerpt}
                                                </p>
                                            )}
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                <Link
                    href={route('mobile.schedule')}
                    className="flex items-center gap-3 p-4 rounded-2xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800"
                >
                    <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
                        <ClipboardDocumentListIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                        <span className="font-semibold text-primary-900 dark:text-primary-100 block">
                            Ver escala de cultos
                        </span>
                        <span className="text-sm text-primary-700 dark:text-primary-300">
                            Diáconos e ministérios
                        </span>
                    </div>
                </Link>
            </div>
        </MobileLayout>
    );
}
