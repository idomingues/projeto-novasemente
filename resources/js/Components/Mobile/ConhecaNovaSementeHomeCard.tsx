import { Link } from '@inertiajs/react';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
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
                <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
                        Conheça a Nova Semente
                    </p>
                    <p className="mt-1 text-[11px] font-medium leading-snug text-zinc-600 dark:text-zinc-300">
                        Quem Somos • Pastores • Localização • Horários • Crenças
                    </p>
                </div>
                <ChevronRightIcon
                    className="h-5 w-5 shrink-0 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-zinc-600 dark:text-zinc-500 dark:group-hover:text-zinc-300"
                    aria-hidden
                />
            </Link>
        </section>
    );
}
