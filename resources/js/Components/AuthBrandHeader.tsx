import ApplicationLogo from '@/Components/ApplicationLogo';
import { Link, usePage } from '@inertiajs/react';

type AuthBrandHeaderProps = {
    /** Linha opcional abaixo do nome da igreja (ex.: «Recuperação de senha»). */
    subtitle?: string;
};

export default function AuthBrandHeader({ subtitle }: AuthBrandHeaderProps) {
    const appLogoUrl = (usePage().props as { appLogoUrl?: string | null }).appLogoUrl ?? null;

    return (
        <div className="mb-8 flex flex-col items-center text-center sm:mb-10">
            <Link
                href="/"
                className="flex h-28 w-28 items-center justify-center rounded-full bg-zinc-50 shadow-lg shadow-zinc-900/10 ring-2 ring-zinc-200/90 transition-transform active:scale-[0.98] dark:bg-zinc-900 dark:ring-zinc-700 sm:h-32 sm:w-32"
                aria-label="Nova Semente — início"
            >
                <ApplicationLogo src={appLogoUrl} className="h-[78%] w-[78%] object-contain" />
            </Link>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                Nova Semente
            </p>
            {subtitle ? (
                <p className="mt-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">{subtitle}</p>
            ) : null}
        </div>
    );
}
