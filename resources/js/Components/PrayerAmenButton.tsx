import { router } from '@inertiajs/react';
import { useState } from 'react';
import PrayingHandsIcon from '@/Components/PrayingHandsIcon';

interface Props {
    prayerId: number;
    count: number;
}

export default function PrayerAmenButton({ prayerId, count }: Props) {
    const [busy, setBusy] = useState(false);

    return (
        <button
            type="button"
            disabled={busy}
            onClick={() => {
                setBusy(true);
                router.post(
                    route('prayer.amen', prayerId),
                    {},
                    {
                        preserveScroll: true,
                        onFinish: () => setBusy(false),
                    },
                );
            }}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-brand-200/90 bg-brand-50/80 px-3.5 py-1.5 text-sm font-medium text-brand-800 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-brand-800/70 dark:bg-brand-950/40 dark:text-brand-200 dark:hover:border-brand-700 dark:hover:bg-brand-950/60 dark:hover:text-brand-100"
        >
            <PrayingHandsIcon className="h-4 w-4 shrink-0 text-brand-600 opacity-90 dark:text-brand-400" />
            <span>Orar</span>
            {count > 0 && (
                <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-brand-700 dark:bg-brand-900/60 dark:text-brand-200">
                    {count}
                </span>
            )}
        </button>
    );
}
