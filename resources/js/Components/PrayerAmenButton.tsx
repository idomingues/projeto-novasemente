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
            className="inline-flex items-center gap-2 rounded-xl border border-brand-600/90 bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60 dark:border-brand-500 dark:bg-brand-600 dark:hover:bg-brand-500"
        >
            <PrayingHandsIcon className="h-5 w-5 shrink-0 text-white opacity-95" />
            <span>Orar</span>
            {count > 0 && (
                <span className="rounded-full bg-white/25 px-2 py-0.5 text-xs font-semibold tabular-nums text-white dark:bg-white/20">
                    {count}
                </span>
            )}
        </button>
    );
}
