import { Link } from '@inertiajs/react';
import { BookOpenIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { useEffect, useMemo, useState } from 'react';
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
    decades,
    onSelectYear,
    showHeading = true,
}: Props) {
    const viewerFragment = usePdfViewerFragment();
    const [activeDecadeLabel, setActiveDecadeLabel] = useState<string>(() => {
        const match = decades.find((decade) => decade.years.includes(selectedYear));
        return match?.label ?? decades[0]?.label ?? '';
    });

    useEffect(() => {
        const match = decades.find((decade) => decade.years.includes(selectedYear));
        if (match && match.label !== activeDecadeLabel) {
            setActiveDecadeLabel(match.label);
        }
    }, [activeDecadeLabel, decades, selectedYear]);

    const activeDecade = useMemo(
        () => decades.find((decade) => decade.label === activeDecadeLabel) ?? null,
        [activeDecadeLabel, decades],
    );

    const yearsForDecade = useMemo(() => {
        return activeDecade?.years ?? availableYears;
    }, [activeDecade, availableYears]);

    const availablePdfCount = useMemo(() => editions.filter((edition) => edition.has_pdf).length, [editions]);

    return (
        <div className="space-y-6">
            {showHeading ? (
                <div className="space-y-2">
                    <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-2xl">
                        Acervo Revista Adventista
                    </h2>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Edições históricas da Revista Adventista, reunidas a partir dos acervos da CPB e da ACES.
                    </p>
                </div>
            ) : null}

            {(decades.length > 0 || yearsForDecade.length > 0) && (
                <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="space-y-2">
                        <div className="inline-flex items-center rounded-full bg-teal-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                            Navegação guiada
                        </div>
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Encontre uma edição histórica</h3>
                        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                            Escolha primeiro o período e depois o ano para abrir as revistas em PDF com mais facilidade.
                        </p>
                    </div>

                    {decades.length > 0 ? (
                        <div className="mt-5 rounded-3xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
                            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Passo 1</p>
                            <div className="mt-1 flex items-start justify-between gap-3">
                                <div>
                                    <h4 className="text-base font-semibold text-zinc-900 dark:text-white">Escolha o período</h4>
                                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                        Os anos foram agrupados por fases para facilitar a navegação no acervo.
                                    </p>
                                </div>
                                {activeDecade ? (
                                    <span className="inline-flex shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-zinc-600 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-700">
                                        {activeDecade.years.length} anos
                                    </span>
                                ) : null}
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {decades.map((decade) => (
                                    <button
                                        key={decade.label}
                                        type="button"
                                        onClick={() => setActiveDecadeLabel(decade.label)}
                                        className={`cursor-pointer rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                                            activeDecadeLabel === decade.label
                                                ? 'border-teal-600 bg-teal-600 text-white shadow-sm dark:bg-teal-500 dark:border-teal-500'
                                                : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800'
                                        }`}
                                    >
                                        {decade.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {yearsForDecade.length > 0 ? (
                        <div className="mt-4 rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/80">
                            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Passo 2</p>
                            <div className="mt-1 flex items-start justify-between gap-3">
                                <div>
                                    <h4 className="text-base font-semibold text-zinc-900 dark:text-white">Escolha o ano</h4>
                                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                        Periodo selecionado: <span className="font-semibold text-zinc-800 dark:text-zinc-200">{activeDecadeLabel}</span>
                                    </p>
                                </div>
                                <div className="rounded-2xl bg-teal-50 px-3 py-2 text-right dark:bg-teal-500/10">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">Ano atual</p>
                                    <p className="text-lg font-bold text-teal-800 dark:text-teal-200">{selectedYear}</p>
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                                {yearsForDecade.map((year) => (
                                    <button
                                        key={year}
                                        type="button"
                                        onClick={() => onSelectYear(year)}
                                        className={`cursor-pointer rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
                                            selectedYear === year
                                                ? 'border-teal-600 bg-teal-600 text-white shadow-sm dark:border-teal-500 dark:bg-teal-500'
                                                : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800'
                                        }`}
                                        aria-pressed={selectedYear === year}
                                    >
                                        {year}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {activeDecade ? (
                        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                            <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                Período: {activeDecade.label}
                            </span>
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
                    ) : null}
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
