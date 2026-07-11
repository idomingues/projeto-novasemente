import { Link } from '@inertiajs/react';
import { BookOpenIcon, CalendarDaysIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useMemo } from 'react';
import InputLabel from '@/Components/InputLabel';
import SelectInput from '@/Components/SelectInput';
import { pdfUrlWithViewerParams, usePdfViewerFragment } from '@/lib/pdfViewerUrl';

export interface RevistaAdventistaAcervoEdition {
    id: number;
    title: string;
    year: number;
    month: number;
    month_label: string;
    cover_url: string | null;
    has_pdf: boolean;
}

export interface RevistaAdventistaAcervoDecade {
    label: string;
    years: number[];
}

interface Props {
    editions: RevistaAdventistaAcervoEdition[];
    availableYears: number[];
    selectedYear: number;
    decades: RevistaAdventistaAcervoDecade[];
    onSelectYear: (year: number) => void;
    showHeading?: boolean;
}

export default function RevistaAdventistaAcervoContent({
    editions,
    availableYears,
    selectedYear,
    onSelectYear,
    showHeading = true,
}: Props) {
    const viewerFragment = usePdfViewerFragment();
    const availablePdfCount = useMemo(() => editions.filter((edition) => edition.has_pdf).length, [editions]);
    const oldestYear = useMemo(() => {
        if (availableYears.length === 0) return null;

        return Math.min(...availableYears);
    }, [availableYears]);

    return (
        <div className="space-y-6">
            {showHeading ? (
                <div className="space-y-2">
                    <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-2xl">
                        Acervo Revista Adventista
                    </h2>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Edições históricas da Revista Adventista a partir do acervo da CPB.
                    </p>
                </div>
            ) : null}

            {availableYears.length > 0 && (
                <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-gradient-to-br from-white to-zinc-50/80 p-5 shadow-sm dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-950">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 ring-1 ring-teal-100 dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-500/20">
                                <SparklesIcon className="h-5 w-5" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Escolha o ano</h3>
                                <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                                    Selecione um ano do acervo para abrir as edições da Revista Adventista em PDF.
                                </p>
                                {oldestYear ? (
                                    <p className="text-xs font-medium text-teal-700 dark:text-teal-300">
                                        Nosso acervo histórico começa em {oldestYear}, com décadas de edições para explorar.
                                    </p>
                                ) : null}
                            </div>
                        </div>
                        <span className="inline-flex shrink-0 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-zinc-600 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900/90 dark:text-zinc-300 dark:ring-zinc-700">
                            {availableYears.length} anos
                        </span>
                    </div>

                    <div className="mt-5 rounded-3xl border border-zinc-200 bg-white/90 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
                        <InputLabel
                            htmlFor="revista-adventista-year-select"
                            value="Selecione um ano do acervo"
                            className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
                        />
                        <div className="rounded-2xl border border-zinc-200 bg-white px-3 shadow-sm transition focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/15 dark:border-zinc-700 dark:bg-zinc-950 dark:focus-within:border-teal-400 dark:focus-within:ring-teal-400/15">
                            <SelectInput
                                id="revista-adventista-year-select"
                                value={String(selectedYear)}
                                onChange={(event) => onSelectYear(Number(event.target.value))}
                                className="h-12 cursor-pointer border-0 bg-transparent px-0 text-base font-semibold text-zinc-900 shadow-none focus:border-0 focus:ring-0 dark:bg-transparent dark:text-white sm:text-base"
                            >
                                {availableYears.map((year) => (
                                    <option key={year} value={year}>
                                        {year}
                                    </option>
                                ))}
                            </SelectInput>
                        </div>
                        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                            Você pode trocar o ano a qualquer momento para navegar pelas edições disponíveis.
                        </p>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                        <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                            Ano: {selectedYear}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                            <CalendarDaysIcon className="h-3.5 w-3.5" />
                            {availablePdfCount > 0
                                ? `${availablePdfCount} ${availablePdfCount === 1 ? 'edição disponível' : 'edições disponíveis'}`
                                : 'Nenhuma edição disponível'}
                        </span>
                    </div>
                </section>
            )}

            {editions.length === 0 ? (
                <div className="py-12 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                        <BookOpenIcon className="h-8 w-8 text-zinc-400 dark:text-zinc-500" />
                    </div>
                    <p className="font-medium text-zinc-600 dark:text-zinc-400">
                        {availableYears.length === 0 ? 'Acervo ainda não sincronizado' : `Nenhuma edição disponível em ${selectedYear}`}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
                        {availableYears.length === 0
                            ? 'Peça ao responsável técnico para sincronizar o acervo histórico.'
                            : 'Alguns anos não possuem todas as edições mensais.'}
                    </p>
                </div>
            ) : (
                <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {editions.map((edition) => {
                        const showUrl = route('mobile.acervo-revista-adventista.show', edition.id);
                        const pdfReadUrl = edition.has_pdf
                            ? pdfUrlWithViewerParams(route('mobile.acervo-revista-adventista.pdf-stream', edition.id), viewerFragment)
                            : '';

                        const cardClassName =
                            'group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700';

                        const coverBlock = (
                            <>
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
                            </>
                        );

                        return (
                            <li key={edition.id}>
                                {pdfReadUrl ? (
                                    <a href={pdfReadUrl} className={`${cardClassName} cursor-pointer`} aria-label={`Ler ${edition.title}`}>
                                        {coverBlock}
                                    </a>
                                ) : edition.has_pdf ? (
                                    <Link href={showUrl} className={`${cardClassName} cursor-pointer`}>
                                        {coverBlock}
                                    </Link>
                                ) : (
                                    <div className={cardClassName}>{coverBlock}</div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
