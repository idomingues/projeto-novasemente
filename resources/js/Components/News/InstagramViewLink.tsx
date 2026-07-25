import { InstagramBrandIcon } from '@/Components/SocialBrandIcons';

/**
 * Link discreto para abrir a publicação no Instagram.
 * `variant="icon"` — só o ícone (feed / UI compacta).
 * `variant="button"` — pill com texto (padrão nas telas de notícias).
 */
export default function InstagramViewLink({
    href,
    className = '',
    label = 'Ver no Instagram',
    variant = 'button',
}: {
    href: string;
    className?: string;
    label?: string;
    variant?: 'button' | 'icon';
}) {
    const url = href.trim();
    if (!url) {
        return null;
    }

    if (variant === 'icon') {
        return (
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                title={label}
                className={`inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-pink-600 transition hover:bg-pink-50 hover:text-pink-700 dark:text-pink-400 dark:hover:bg-pink-950/50 dark:hover:text-pink-300 ${className}`}
            >
                <InstagramBrandIcon className="h-5 w-5" />
            </a>
        );
    }

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex cursor-pointer items-center gap-2 rounded-full border border-pink-200 bg-pink-50 px-3.5 py-2 text-sm font-semibold text-pink-700 transition hover:border-pink-300 hover:bg-pink-100 dark:border-pink-900/60 dark:bg-pink-950/40 dark:text-pink-300 dark:hover:border-pink-800 dark:hover:bg-pink-950/70 ${className}`}
        >
            <InstagramBrandIcon className="h-5 w-5 shrink-0" />
            {label}
        </a>
    );
}
