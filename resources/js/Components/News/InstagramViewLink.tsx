import { InstagramBrandIcon } from '@/Components/SocialBrandIcons';

/**
 * Botão discreto para abrir a publicação no Instagram.
 */
export default function InstagramViewLink({
    href,
    className = '',
    label = 'Ver no Instagram',
}: {
    href: string;
    className?: string;
    label?: string;
}) {
    const url = href.trim();
    if (!url) {
        return null;
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
