import SobreOAppModal from '@/Components/Mobile/SobreOAppModal';
import { useMinWidthMd } from '@/hooks/useMinWidthMd';
import { Link } from '@inertiajs/react';
import { BookOpenIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

const settingsRowClass =
    'block w-full px-4 py-3 text-left text-zinc-700 hover:bg-zinc-50 active:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800/50 dark:active:bg-zinc-800';

const moreCardClass =
    'flex w-full items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4 text-left transition-colors hover:border-zinc-300 active:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:active:bg-zinc-800';

export default function SobreOAppNavItem({ variant, from }: { variant: 'settings' | 'more'; from?: 'settings' }) {
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
