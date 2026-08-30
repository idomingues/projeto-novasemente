import MobileLayout from '@/Layouts/MobileLayout';
import MissionHubBackLink from '@/Components/Mission/MissionHubBackLink';
import MobileEventDetailModal from '@/Components/Events/MobileEventDetailModal';
import MobileEventListGrid from '@/Components/Events/MobileEventListGrid';
import { Head } from '@inertiajs/react';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';
import type { MobileEventListItem } from '@/utils/mobileEventDisplay';
import { useState, useCallback } from 'react';

interface Props {
    events: MobileEventListItem[];
}

export default function MissionEvents({ events }: Props) {
    const [selected, setSelected] = useState<MobileEventListItem | null>(null);
    const closeModal = useCallback(() => setSelected(null), []);

    return (
        <MobileLayout>
            <Head title="Eventos da Missão" />
            <div className="space-y-6">
                <div>
                    <MissionHubBackLink />
                    <h1 className="mt-3 text-xl font-bold text-zinc-900 dark:text-white lg:text-2xl">
                        Agenda da Missão 2026
                    </h1>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        Próximos encontros da comunidade missionária Nova Semente.
                    </p>
                </div>

                {events.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-200 bg-white py-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
                        <CalendarDaysIcon className="mx-auto h-10 w-10 text-zinc-400" />
                        <p className="mt-3 font-medium text-zinc-600 dark:text-zinc-400">Nenhum evento próximo</p>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
                            Os próximos eventos da missão aparecerão aqui.
                        </p>
                    </div>
                ) : (
                    <MobileEventListGrid events={events} onSelect={setSelected} />
                )}
            </div>

            <MobileEventDetailModal
                selected={selected}
                onClose={closeModal}
                imageFilenamePrefix="evento-missao"
            />
        </MobileLayout>
    );
}
