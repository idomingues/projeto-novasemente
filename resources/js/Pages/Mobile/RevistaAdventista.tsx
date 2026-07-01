import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link, router } from '@inertiajs/react';
import { BookOpenIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useMemo, useRef, useState } from 'react';

interface Edition {
    id: number;
    title: string;
    year: number;
    month: number;
    month_label: string;
    cover_url: string | null;
    has_pdf: boolean;
}

interface DecadeGroup {
    label: string;
    years: number[];
}

interface Props {
    editions: Edition[];
    availableYears: number[];
    selectedYear: number;
    decades: DecadeGroup[];
}

export default function MobileRevistaAdventista({ editions, availableYears, selectedYear, decades }: Props) {
    const yearsRef = useRef<HTMLDivElement>(null);
    const [activeDecadeLabel, setActiveDecadeLabel] = useState<string>(() => {
        const match = decades.find((decade) => decade.years.includes(selectedYear));
        return match?.label ?? decades[0]?.label ?? '';
    });

    const yearsForDecade = useMemo(() => {
        const match = decades.find((decade) => decade.label === activeDecadeLabel);
        return match?.years ?? availableYears;
    }, [activeDecadeLabel, availableYears, decades]);

    const selectYear = (year: number) => {
        router.get(route('mobile.revista-adventista'), { ano: year }, { preserveState: true, preserveScroll: true, replace: true });
    };

    const scrollYears = (direction: 'left' | 'right') => {
        const el = yearsRef.current;
        if (!el) return;
        el.scrollBy({ left: direction === 'left' ? -220 : 220, behavior: 'smooth' });
    };

    return (
        <MobileLayout>
            <Head title="Acervo Revista Adventista" />
            <div className="mx-auto w-full max-w-lg space-y-6 sm:max-w-none">
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                        Acervo Revista Adventista
                    </h1>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Edições históricas da Revista Adventista (1906 até hoje), com capas e PDFs do acervo CPB.
                    </p>
                </div>

                {decades.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {decades.map((decade) => (
                            <button
                                key={decade.label}
                                type="button"
                                onClick={() => setActiveDecadeLabel(decade.label)}
                                className={`cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium transition ${
                                    activeDecadeLabel === decade.label
                                        ? 'bg-teal-600 text-white dark:bg-teal-500'
                                        : 'border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
                                }`}
                            >
                                {decade.label}
                            </button>
                        ))}
                    </div>
                ) : null}

                {yearsForDecade.length > 0 ? (
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => scrollYears('left')}
                            className="absolute left-0 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 sm:flex"
                            aria-label="Anos anteriores"
                        >
                            <ChevronLeftIcon className="h-5 w-5" />
                        </button>
                        <div
                            ref={yearsRef}
                            className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                        >
                            {yearsForDecade.map((year) => (
                                <button
                                    key={year}
                                    type="button"
                                    onClick={() => selectYear(year)}
                                    className={`shrink-0 cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold transition ${
                                        selectedYear === year
                                            ? 'bg-teal-600 text-white dark:bg-teal-500'
                                            : 'border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
                                    }`}
                                >
                                    {year}
                                </button>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={() => scrollYears('right')}
                            className="absolute right-0 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 sm:flex"
                            aria-label="Próximos anos"
                        >
                            <ChevronRightIcon className="h-5 w-5" />
                        </button>
                    </div>
                ) : null}

                {editions.length === 0 ? (
                    <div className="py-12 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                            <BookOpenIcon className="h-8 w-8 text-zinc-400 dark:text-zinc-500" />
                        </div>
                        <p className="font-medium text-zinc-600 dark:text-zinc-400">
                            {availableYears.length === 0
                                ? 'Acervo ainda não sincronizado'
                                : `Nenhuma edição disponível em ${selectedYear}`}
                        </p>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
                            {availableYears.length === 0
                                ? 'Peça ao responsável técnico para sincronizar o acervo CPB.'
                                : 'Alguns anos não possuem todas as edições mensais.'}
                        </p>
                    </div>
                ) : (
                    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {editions.map((edition) => (
                            <li key={edition.id}>
                                <Link
                                    href={route('mobile.revista-adventista.show', edition.id)}
                                    className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                                >
                                    <div className="relative aspect-[3/4] overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                                        {edition.cover_url ? (
                                            <img
                                                src={edition.cover_url}
                                                alt={`Capa de ${edition.title}`}
                                                className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center">
                                                <BookOpenIcon className="h-10 w-10 text-zinc-400" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3">
                                        <p className="line-clamp-2 text-sm font-semibold text-zinc-900 dark:text-white">
                                            {edition.title}
                                        </p>
                                        {!edition.has_pdf ? (
                                            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">PDF indisponível</p>
                                        ) : null}
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </MobileLayout>
    );
}
