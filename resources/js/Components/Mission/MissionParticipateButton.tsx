import { Link } from '@inertiajs/react';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

type Props = {
    href: string;
    variant?: 'hero' | 'primary';
    className?: string;
    fullWidth?: boolean;
};

const primaryClassName =
    'inline-flex h-12 cursor-pointer items-center justify-center rounded-full bg-zinc-900 px-8 text-sm font-semibold uppercase tracking-widest text-white shadow-sm transition duration-150 ease-in-out hover:bg-zinc-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 active:bg-zinc-900 dark:bg-white dark:text-black dark:hover:bg-zinc-100 dark:focus:bg-zinc-200 dark:focus:ring-white dark:focus:ring-offset-zinc-900 dark:active:bg-zinc-300';

export default function MissionParticipateButton({
    href,
    variant = 'primary',
    className = '',
    fullWidth = false,
}: Props) {
    if (variant === 'hero') {
        return (
            <Link
                href={href}
                className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-amber-950 shadow-md shadow-amber-950/30 transition hover:bg-amber-300 sm:w-auto ${
                    fullWidth ? 'w-full' : ''
                } ${className}`}
            >
                Quero participar
                <ArrowRightIcon className="h-4 w-4" aria-hidden />
            </Link>
        );
    }

    return (
        <Link
            href={href}
            className={`${primaryClassName} ${fullWidth ? 'w-full' : ''} ${className}`}
        >
            Quero participar
        </Link>
    );
}
