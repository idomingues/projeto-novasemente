import { Link, usePage } from '@inertiajs/react';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';
import { useAppFeatures } from '@/hooks/useAppFeatures';

type PageProps = {
    hasEventTomorrow?: boolean;
};

/**
 * Ícone discreto de calendário no topo → Eventos.
 * Quando há evento amanhã, pisca de leve e muda a cor (urgência).
 */
export default function TopbarEventsLink({ className = '' }: { className?: string }) {
    const { isEnabled } = useAppFeatures();
    const { hasEventTomorrow = false } = usePage().props as PageProps;

    if (!isEnabled('events')) {
        return null;
    }

    const urgent = hasEventTomorrow === true;

    return (
        <Link
            href={route('mobile.events')}
            aria-label={urgent ? 'Eventos — há evento amanhã' : 'Eventos'}
            title={urgent ? 'Evento amanhã' : 'Eventos'}
            className={
                urgent
                    ? `inline-flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-full bg-amber-100 text-amber-700 ring-2 ring-amber-400/70 animate-event-urgent transition-colors hover:bg-amber-200 hover:text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-500/50 dark:hover:bg-amber-900/70 dark:hover:text-amber-100 ${className}`
                    : `inline-flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-900 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white ${className}`
            }
        >
            <CalendarDaysIcon className="h-5 w-5" aria-hidden strokeWidth={1.5} />
        </Link>
    );
}
