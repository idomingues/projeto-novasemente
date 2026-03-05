import MobileLayout from '@/Layouts/MobileLayout';
import { Head } from '@inertiajs/react';
import { MapPinIcon, ClockIcon } from '@heroicons/react/24/outline';

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

export default function MobileEvents({ events }: Props) {
    return (
        <MobileLayout>
            <Head title="Eventos" />
            <div className="space-y-4">
                <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Eventos</h1>
                {events.length === 0 ? (
                    <p className="text-zinc-500 dark:text-zinc-400 text-center py-8">
                        Nenhum evento cadastrado.
                    </p>
                ) : (
                    <ul className="space-y-3">
                        {events.map((ev) => (
                            <li
                                key={ev.id}
                                className="rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
                            >
                                {ev.image_url && (
                                    <img
                                        src={ev.image_url}
                                        alt=""
                                        className="w-full h-36 object-cover"
                                    />
                                )}
                                <div
                                    className="p-4 border-l-4"
                                    style={{
                                        borderLeftColor: ev.color || 'var(--color-primary-500, #3b82f6)',
                                    }}
                                >
                                    <h2 className="font-semibold text-zinc-900 dark:text-white text-lg">
                                        {ev.title}
                                    </h2>
                                    <div className="flex items-center gap-2 mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                        <ClockIcon className="w-4 h-4 flex-shrink-0" />
                                        <span>
                                            {formatDateTime(ev.starts_at, ev.all_day)}
                                            {ev.ends_at && !ev.all_day && ` – ${formatTime(ev.ends_at)}`}
                                        </span>
                                    </div>
                                    {ev.location && (
                                        <div className="flex items-center gap-2 mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                            <MapPinIcon className="w-4 h-4 flex-shrink-0" />
                                            <span>{ev.location}</span>
                                        </div>
                                    )}
                                    {ev.description && (
                                        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300 line-clamp-3">
                                            {ev.description}
                                        </p>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </MobileLayout>
    );
}
