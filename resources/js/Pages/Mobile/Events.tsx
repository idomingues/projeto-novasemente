import MobileLayout from '@/Layouts/MobileLayout';
import { Head } from '@inertiajs/react';
import { MapPinIcon, ClockIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';

interface EventItem {
    id: number;
    title: string;
    description: string | null;
    starts_at: string;
    ends_at: string | null;
    all_day: boolean;
    location: string | null;
    image_url: string | null;
    color: string | null;
}

interface Props {
    events: EventItem[];
}

function formatDateTime(iso: string, allDay: boolean): string {
    const d = new Date(iso);
    if (allDay) {
        return d.toLocaleDateString('pt-BR', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    }
    return d.toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function getDayMonth(iso: string): { day: string; month: string } {
    const d = new Date(iso);
    return {
        day: d.toLocaleDateString('pt-BR', { day: '2-digit' }),
        month: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
    };
}

export default function MobileEvents({ events }: Props) {
    return (
        <MobileLayout>
            <Head title="Eventos" />
            <div className="space-y-6">
                {events.length === 0 ? (
                    <div className="py-12 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                            <CalendarDaysIcon className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
                        </div>
                        <p className="text-zinc-600 dark:text-zinc-400 font-medium">Nenhum evento cadastrado</p>
                        <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-1">Os eventos aparecerão aqui.</p>
                    </div>
                ) : (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {events.map((ev) => {
                            const { day, month } = getDayMonth(ev.starts_at);
                            const accent = ev.color || '#10b981';
                            return (
                                <li
                                    key={ev.id}
                                    className="rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 active:scale-[0.99] transition-all"
                                >
                                    <div className="flex">
                                        {/* Data em destaque */}
                                        <div
                                            className="w-16 flex-shrink-0 flex flex-col items-center justify-center py-4 px-2 rounded-l-2xl text-white font-bold"
                                            style={{ backgroundColor: accent }}
                                        >
                                            <span className="text-2xl leading-none">{day}</span>
                                            <span className="text-xs font-semibold uppercase mt-0.5 opacity-90">{month}</span>
                                        </div>
                                        <div className="flex-1 min-w-0 p-4">
                                            <h2 className="font-semibold text-zinc-900 dark:text-white text-base leading-snug line-clamp-2">
                                                {ev.title}
                                            </h2>
                                            <div className="flex items-center gap-2 mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                                <ClockIcon className="w-4 h-4 flex-shrink-0 text-zinc-400" />
                                                <span>
                                                    {formatDateTime(ev.starts_at, ev.all_day)}
                                                    {ev.ends_at && !ev.all_day && ` – ${formatTime(ev.ends_at)}`}
                                                </span>
                                            </div>
                                            {ev.location && (
                                                <div className="flex items-center gap-2 mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                                    <MapPinIcon className="w-4 h-4 flex-shrink-0 text-zinc-400" />
                                                    <span className="truncate">{ev.location}</span>
                                                </div>
                                            )}
                                            {ev.description && (
                                                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300 line-clamp-2">
                                                    {ev.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    {ev.image_url && (
                                        <div className="w-full h-32 overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                                            <img
                                                src={ev.image_url}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </MobileLayout>
    );
}
