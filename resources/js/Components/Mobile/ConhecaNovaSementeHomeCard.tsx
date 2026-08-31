import { Link } from '@inertiajs/react';
import { MapPinIcon } from '@heroicons/react/24/outline';
import { useAppFeatures } from '@/hooks/useAppFeatures';

const HUB_FEATURE_KEYS = ['quem_somos', 'pastors', 'location', 'services', 'beliefs'] as const;

export default function ConhecaNovaSementeHomeCard() {
    const { isEnabled } = useAppFeatures();
    const visible = HUB_FEATURE_KEYS.some((key) => isEnabled(key));

    if (!visible) {
        return null;
    }

    return (
        <section aria-label="Conheça a Nova Semente">
            <Link
                href={route('mobile.conheca')}
                className="group flex cursor-pointer items-center gap-3 rounded-xl bg-white px-4 py-3 text-left shadow-sm ring-1 ring-zinc-200/90 transition hover:bg-zinc-50 dark:bg-zinc-900 dark:ring-zinc-700 dark:hover:bg-zinc-800"
            >
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/45 dark:text-emerald-200">
                    <MapPinIcon className="h-6 w-6" aria-hidden strokeWidth={1.7} />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
                        Conheça a Nova Semente
                    </p>
                    <p className="mt-1.5 text-[12px] font-medium leading-snug text-zinc-500 dark:text-zinc-400">
                        Quem somos, pastores, localização e horários
                    </p>
                </div>
            </Link>
        </section>
    );
}
