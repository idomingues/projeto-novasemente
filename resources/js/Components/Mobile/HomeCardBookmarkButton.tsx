import { HeartIcon as HeartOutlineIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';

type Props = {
    cardKey: string;
    bookmarked: boolean;
    disabled?: boolean;
    onToggle: (cardKey: string) => void;
    className?: string;
    labelAdd?: string;
    labelRemove?: string;
};

export default function HomeCardBookmarkButton({
    cardKey,
    bookmarked,
    disabled = false,
    onToggle,
    className = '',
    labelAdd = 'Marcar como favorito',
    labelRemove = 'Remover dos favoritos',
}: Props) {
    const label = bookmarked ? labelRemove : labelAdd;

    return (
        <button
            type="button"
            disabled={disabled}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!disabled) {
                    onToggle(cardKey);
                }
            }}
            className={`absolute right-2 top-2 z-10 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 ${className}`}
            aria-label={label}
            aria-pressed={bookmarked}
            title={label}
        >
            {bookmarked ? (
                <HeartSolidIcon className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" aria-hidden />
            ) : (
                <HeartOutlineIcon className="h-3.5 w-3.5" aria-hidden strokeWidth={2} />
            )}
        </button>
    );
}
