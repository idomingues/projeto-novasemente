import MobileLayout from '@/Layouts/MobileLayout';
import MobileEventDetailModal from '@/Components/Events/MobileEventDetailModal';
import MobileEventListGrid from '@/Components/Events/MobileEventListGrid';
import { Head, usePage } from '@inertiajs/react';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';
import type { MobileEventListItem } from '@/utils/mobileEventDisplay';
import { useState, useCallback, useEffect } from 'react';

interface Props {
    events: MobileEventListItem[];
}

export default function MobileEvents({ events }: Props) {
    const { url } = usePage();
    const [selected, setSelected] = useState<MobileEventListItem | null>(null);
    const closeModal = useCallback(() => setSelected(null), []);

    useEffect(() => {
        const eventId = new URL(url, window.location.origin).searchParams.get('event');
        if (!eventId) {
            return;
        }
        const match = events.find((ev) => String(ev.id) === eventId);
        if (match) {
            setSelected(match);
        }
    }, [events, url]);

    return (
        <MobileLayout>
            <Head title="Eventos" />
            <div className="space-y-6">
                {events.length === 0 ? (
                    <div className="py-12 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                            <CalendarDaysIcon className="h-8 w-8 text-zinc-400 dark:text-zinc-500" />
                        </div>
                        <p className="font-medium text-zinc-600 dark:text-zinc-400">Nenhum evento cadastrado</p>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">Os eventos aparecerão aqui.</p>
                    </div>
                ) : (
                    <MobileEventListGrid events={events} onSelect={setSelected} />
                )}
            </div>

            <MobileEventDetailModal selected={selected} onClose={closeModal} />
        </MobileLayout>
    );
}
