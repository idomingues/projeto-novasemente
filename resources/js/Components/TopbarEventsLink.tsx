import { Link } from '@inertiajs/react';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';
import { useAppFeatures } from '@/hooks/useAppFeatures';

/**
 * Ícone discreto de calendário no topo → Eventos.
 */
export default function TopbarEventsLink({ className = '' }: { className?: string }) {
    const { isEnabled } = useAppFeatures();

    if (!isEnabled('events')) {
        return null;
    }

    return (
        <Link
            href={route('mobile.events')}
            aria-label="Eventos"
            title="Eventos"
            className={`inline-flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-900 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white ${className}`}
        >
            <CalendarDaysIcon className="h-5 w-5" aria-hidden strokeWidth={1.5} />
        </Link>
    );
}
