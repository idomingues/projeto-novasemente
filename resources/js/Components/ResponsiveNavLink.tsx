import { InertiaLinkProps, Link } from '@inertiajs/react';

export default function ResponsiveNavLink({
    active = false,
    className = '',
    children,
    ...props
}: InertiaLinkProps & { active?: boolean }) {
    return (
        <Link
            {...props}
            className={`flex w-full items-start border-l-4 py-2 pe-4 ps-3 ${
                active
                    ? 'border-zinc-400 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-100 focus:border-zinc-700 dark:focus:border-zinc-300 focus:bg-zinc-100 dark:focus:bg-zinc-900 focus:text-zinc-800 dark:focus:text-zinc-200'
                    : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200 focus:border-zinc-300 dark:focus:border-zinc-600 focus:bg-zinc-50 dark:focus:bg-zinc-800 focus:text-zinc-800 dark:focus:text-zinc-200'
            } text-base font-medium transition duration-150 ease-in-out focus:outline-none ${className}`}
        >
            {children}
        </Link>
    );
}
