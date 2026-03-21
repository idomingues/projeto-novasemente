import { Head, Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

/** Ilustração simples: pessoa à mesa / trabalhando — animação CSS reutilizável. */
function WorkingIllustration() {
    return (
        <div className="relative mx-auto w-full max-w-[220px]" aria-hidden>
            <div className="animate-coming-soon-bob">
                <svg viewBox="0 0 200 180" className="w-full text-zinc-700 dark:text-zinc-300">
                    <ellipse cx="100" cy="165" rx="70" ry="8" className="fill-zinc-200/80 dark:fill-zinc-700/60" />
                    {/* Mesa */}
                    <rect x="40" y="110" width="120" height="8" rx="2" className="fill-zinc-300 dark:fill-zinc-600" />
                    <rect x="48" y="118" width="6" height="40" className="fill-zinc-400 dark:fill-zinc-500" />
                    <rect x="146" y="118" width="6" height="40" className="fill-zinc-400 dark:fill-zinc-500" />
                    {/* Laptop */}
                    <g className="animate-coming-soon-desk origin-center" style={{ transformBox: 'fill-box' as const }}>
                        <rect x="65" y="88" width="70" height="45" rx="4" className="fill-zinc-600 dark:fill-zinc-500" />
                        <rect x="68" y="91" width="64" height="32" rx="2" className="fill-sky-200/90 dark:fill-sky-900/50" />
                        <rect x="55" y="133" width="90" height="5" rx="1" className="fill-zinc-500 dark:fill-zinc-400" />
                    </g>
                    {/* Pessoa */}
                    <circle cx="100" cy="52" r="18" className="fill-amber-200 dark:fill-amber-700/80" />
                    <path
                        d="M 100 70 L 100 95 M 85 78 L 115 78 M 100 95 L 88 118 M 100 95 L 112 118"
                        className="stroke-amber-300 dark:stroke-amber-600"
                        strokeWidth="8"
                        strokeLinecap="round"
                        fill="none"
                    />
                    {/* Mãos no teclado */}
                    <circle cx="78" cy="100" r="6" className="fill-amber-200 dark:fill-amber-700/80" />
                    <circle cx="122" cy="100" r="6" className="fill-amber-200 dark:fill-amber-700/80" />
                </svg>
            </div>
            <div className="mt-4 flex justify-center gap-1 text-2xl font-bold text-primary-600 dark:text-primary-400">
                <span className="animate-coming-soon-dots" style={{ animationDelay: '0ms' }}>
                    .
                </span>
                <span className="animate-coming-soon-dots" style={{ animationDelay: '200ms' }}>
                    .
                </span>
                <span className="animate-coming-soon-dots" style={{ animationDelay: '400ms' }}>
                    .
                </span>
            </div>
        </div>
    );
}

interface Props {
    title: string;
    description: string;
    backHref?: string;
    backLabel?: string;
}

/**
 * Página genérica “em breve” — reutilizável para Fotos e outras seções em construção.
 */
export default function ComingSoonPage({
    title,
    description,
    backHref,
    backLabel = '← Voltar',
    children,
}: PropsWithChildren<Props>) {
    return (
        <>
            <Head title={title} />
            <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center space-y-6 px-4 py-10 text-center">
                {backHref && (
                    <Link
                        href={backHref}
                        className="self-start text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
                    >
                        {backLabel}
                    </Link>
                )}
                <WorkingIllustration />
                <div>
                    <h1 className="text-xl font-bold text-zinc-900 dark:text-white">{title}</h1>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{description}</p>
                </div>
                {children}
            </div>
        </>
    );
}
