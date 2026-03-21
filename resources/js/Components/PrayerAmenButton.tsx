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
            className="inline-flex items-center gap-2 rounded-xl border border-amber-200/90 bg-amber-50/90 px-3 py-2 text-sm font-medium text-amber-950 transition-colors hover:bg-amber-100 disabled:opacity-60 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-900/40"
        >
            <PrayingHandsIcon className="h-5 w-5 text-amber-700 dark:text-amber-300" />
            <span>Orei</span>
            {count > 0 && (
                <span className="rounded-full bg-amber-200/90 px-2 py-0.5 text-xs font-semibold tabular-nums text-amber-950 dark:bg-amber-800/80 dark:text-amber-50">
                    {count}
                </span>
            )}
        </button>
    );
}
