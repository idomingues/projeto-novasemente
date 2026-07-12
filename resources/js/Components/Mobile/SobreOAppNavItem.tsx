import SobreOAppModal from '@/Components/Mobile/SobreOAppModal';
import HomeCardBookmarkButton from '@/Components/Mobile/HomeCardBookmarkButton';
import { useMinWidthMd } from '@/hooks/useMinWidthMd';
import { Link } from '@inertiajs/react';
import { BookOpenIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

const settingsRowClass =
    'block w-full px-4 py-3 text-left text-zinc-700 hover:bg-zinc-50 active:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800/50 dark:active:bg-zinc-800';

const moreCardClass =
    'flex w-full items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4 text-left transition-colors hover:border-zinc-300 active:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:active:bg-zinc-800';

const homeCardClass =
    'group relative flex cursor-pointer flex-col rounded-2xl bg-white p-3.5 pr-9 text-left shadow-sm ring-1 ring-zinc-200 transition duration-200 hover:bg-zinc-50 hover:shadow-md dark:bg-zinc-900 dark:ring-zinc-800 dark:hover:bg-zinc-800/60';

export default function SobreOAppNavItem({
    variant,
    from,
    bookmark,
}: {
    variant: 'settings' | 'more' | 'home';
    from?: 'settings';
    bookmark?: {
        bookmarked: boolean;
        onToggle: () => void;
        disabled?: boolean;
    };
}) {
    const isDesktop = useMinWidthMd();
    const [open, setOpen] = useState(false);
    const href = route('mobile.sobre-o-app', from === 'settings' ? { from: 'settings' } : {});

    if (variant === 'settings') {
        if (isDesktop) {
            return (
                <>
                    <button type="button" className={settingsRowClass} onClick={() => setOpen(true)}>
                        Sobre o APP
                    </button>
                    <SobreOAppModal show={open} onClose={() => setOpen(false)} />
                </>
            );
        }
        return (
            <Link href={href} className={settingsRowClass}>
                Sobre o APP
            </Link>
        );
    }

    if (variant === 'home') {
        const content = (
            <>
                {bookmark ? (
                    <HomeCardBookmarkButton
                        cardKey="sobre-o-app"
                        bookmarked={bookmark.bookmarked}
                        disabled={bookmark.disabled}
                        onToggle={() => bookmark.onToggle()}
                    />
                ) : null}
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/70 dark:bg-emerald-950/45 dark:text-emerald-200 dark:ring-emerald-800/60">
                    <BookOpenIcon className="h-5 w-5" aria-hidden strokeWidth={2.05} />
                </div>
                <div className="mt-3 min-w-0">
                    <p className="text-[15px] font-semibold leading-tight text-zinc-900 dark:text-white">Sobre o APP</p>
                </div>
            </>
        );

        if (isDesktop) {
            return (
                <>
                    <button type="button" className={homeCardClass} onClick={() => setOpen(true)}>
                        {content}
                    </button>
                    <SobreOAppModal show={open} onClose={() => setOpen(false)} />
                </>
            );
        }

        return (
            <Link href={href} className={homeCardClass}>
                {content}
            </Link>
        );
    }

    if (isDesktop) {
        return (
            <>
                <button type="button" className={moreCardClass} onClick={() => setOpen(true)}>
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
                        <BookOpenIcon className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <span className="block font-semibold text-zinc-900 dark:text-white">Sobre o APP</span>
                    </div>
                </button>
                <SobreOAppModal show={open} onClose={() => setOpen(false)} />
            </>
        );
    }

    return (
        <Link href={href} className={moreCardClass}>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
                <BookOpenIcon className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
            </div>
            <div className="min-w-0 flex-1">
                <span className="block font-semibold text-zinc-900 dark:text-white">Sobre o APP</span>
            </div>
        </Link>
    );
}
