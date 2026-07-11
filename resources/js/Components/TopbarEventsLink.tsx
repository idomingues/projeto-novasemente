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
            className={`inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 ${className}`}
        >
            <CalendarDaysIcon className="h-5 w-5" aria-hidden strokeWidth={1.5} />
        </Link>
    );
}
