import MobileLayout from '@/Layouts/MobileLayout';
import RevistaAdventistaAcervoContent from '@/Components/Mobile/RevistaAdventistaAcervoContent';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    BookOpenIcon,
    ArrowDownTrayIcon,
    ArrowTopRightOnSquareIcon,
    MagnifyingGlassIcon,
    XMarkIcon,
    SparklesIcon,
    MoonIcon,
    ClipboardDocumentListIcon,
    SunIcon,
    ArchiveBoxIcon,
} from '@heroicons/react/24/outline';
import Modal from '@/Components/Modal';
import LibraryLessonDayNotes from '@/Components/Mobile/LibraryLessonDayNotes';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { pdfUrlWithViewerParams, usePdfViewerFragment } from '@/lib/pdfViewerUrl';

function imageSrc(url: string | null, appUrl: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = appUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    return `${base}${url}`;
}

interface CategoryTab {
    value: string;
    label: string;
}

interface BookItem {
    id: number;
    title: string;
    subtitle: string | null;
    description?: string | null;
    category: string;
    cover_url: string | null;
    pdf_url: string | null;
    external_url?: string | null;
}

interface Props {
    books: BookItem[];
    categories: CategoryTab[];
    meditationUrl?: string | null;
    lessonUrl?: string | null;
    sunsetMeditationConfigured?: boolean;
    librarySetupMessage?: string | null;
    revistaAdventistaAcervo?: {
        editions: Array<{
            id: number;
            title: string;
            year: number;
            month: number;
            month_label: string;
            cover_url: string | null;
            has_pdf: boolean;
        }>;
        availableYears: number[];
        selectedYear: number;
        decades: Array<{ label: string; years: number[] }>;
    } | null;
}

type PageProps = { appUrl?: string };

interface ReaderSegment {
    slug: string;
    label: string;
    html: string;
    question?: string | null;
}

import { normalizeForSearch } from '@/utils/searchText';

function GratisBadge({ className = '' }: { className?: string }) {
    return (
        <span
            className={`inline-flex shrink-0 items-center rounded-md bg-brand-600 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white ${className}`}
        >
            Grátis
        </span>
    );
}

type CategoryIcon = typeof BookOpenIcon;

interface CategoryPresentation {
    icon: CategoryIcon;
    line1: string;
    line2?: string;
}

function libraryCategoryPresentation(value: string, label: string): CategoryPresentation {
    switch (value) {
        case 'books':
            return { icon: BookOpenIcon, line1: 'Livros' };
        case 'egw':
            return { icon: SparklesIcon, line1: 'Ellen G.', line2: 'White' };
        case 'meditation':
            return { icon: MoonIcon, line1: 'Meditação' };
        case 'lesson':
            return { icon: ClipboardDocumentListIcon, line1: 'Lição' };
        case 'sunset_meditation':
            return { icon: SunIcon, line1: 'Meditação', line2: 'Por do Sol' };
        case 'revista_adventista_acervo':
            return { icon: ArchiveBoxIcon, line1: 'Acervo' };
        default:
            return { icon: BookOpenIcon, line1: label };
    }
}

function compactDayLabel(label: string): string {
    const short: Record<string, string> = {
        Sábado: 'Sáb',
        Domingo: 'Dom',
        Segunda: 'Seg',
        Terça: 'Ter',
        Quarta: 'Qua',
        Quinta: 'Qui',
        Sexta: 'Sex',
    };

    return short[label] ?? label;
}

function currentLessonDayIndex(segments: ReaderSegment[]): number {
    const jsDay = new Date().getDay();
    const todaySlugPrefix =
        jsDay === 6 ? 'sabado' : (['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta'] as const)[jsDay];

    const idx = segments.findIndex(
        (segment) => segment.slug === todaySlugPrefix || segment.slug.startsWith(`${todaySlugPrefix}-`),
    );

    return idx >= 0 ? idx : 0;
}

export default function MobileLibrary({
    books,
    categories,
    meditationUrl: meditationUrlProp = null,
    lessonUrl: lessonUrlProp = null,
    sunsetMeditationConfigured = false,
    librarySetupMessage = null,
    revistaAdventistaAcervo = null,
}: Props) {
    const page = usePage();
    const appUrl = (page.props as PageProps).appUrl ?? '';
    const viewerFragment = usePdfViewerFragment();
    const tabFromUrl = useMemo(() => {
        const raw = String(page.url ?? '');
        const qs = raw.includes('?') ? raw.slice(raw.indexOf('?') + 1) : '';
        const t = new URLSearchParams(qs).get('tab')?.trim().toLowerCase() ?? '';
        return categories.some((c) => c.value === t) ? t : '';
    }, [page.url, categories]);
    const [tab, setTab] = useState<string>(() => tabFromUrl || categories[0]?.value || 'books');
    const [search, setSearch] = useState('');
    const [selectedDetails, setSelectedDetails] = useState<BookItem | null>(null);
    const [readerStatus, setReaderStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
    const [readerHtml, setReaderHtml] = useState('');
    const [readerSegments, setReaderSegments] = useState<ReaderSegment[] | null>(null);
    const [readerError, setReaderError] = useState<string | null>(null);
    const [readerSourceUrl, setReaderSourceUrl] = useState<string | null>(null);
    const [dayIdx, setDayIdx] = useState(0);
    const [lessonNoteSlugs, setLessonNoteSlugs] = useState<string[]>([]);
    const isLessonTab = tab === 'lesson';
    const handleLessonNoteSlugsChange = useCallback((slugs: string[]) => {
        setLessonNoteSlugs(slugs);
    }, []);

    useEffect(() => {
        if (tabFromUrl) {
            setTab(tabFromUrl);
        }
    }, [tabFromUrl]);

    const meditationUrl = String(meditationUrlProp ?? '').trim();
    const lessonUrl = String(lessonUrlProp ?? '').trim();
    const isSunsetTab = tab === 'sunset_meditation';
    const isAcervoTab = tab === 'revista_adventista_acervo';
    const isConfiguredExternalTab = tab === 'meditation' || tab === 'lesson' || isSunsetTab;
    const configuredUrl =
        tab === 'meditation' ? meditationUrl : tab === 'lesson' ? lessonUrl : isSunsetTab && sunsetMeditationConfigured ? 'pdf' : '';

    const filtered = useMemo(() => {
        const q = normalizeForSearch(search);
        return books.filter((b) => {
            if (b.category !== tab) return false;
            if (!q) return true;
            const t = normalizeForSearch(b.title + (b.subtitle ? ` ${b.subtitle}` : ''));
            return t.includes(q);
        });
    }, [books, tab, search]);

    const selectAcervoYear = (year: number) => {
        router.get(
            route('mobile.biblioteca'),
            { tab: 'revista_adventista_acervo', ano: year },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const emptyMessage = useMemo(() => {
        if (librarySetupMessage) {
            return librarySetupMessage;
        }
        if (isConfiguredExternalTab) {
            if (!configuredUrl) {
                return isSunsetTab ? 'PDF não configurado. Peça ao responsável para publicar o arquivo em Configurações.' : 'Link não configurado.';
            }
            return '';
        }
        const inTab = books.filter((b) => b.category === tab);
        if (inTab.length === 0) {
            if (tab === 'egw') {
                return 'Nenhum livro de Ellen G. White disponível ainda. Peça ao responsável para sincronizar o catálogo.';
            }

            return 'Nenhuma publicação nesta categoria.';
        }
        if (filtered.length === 0) return 'Nenhum resultado para a pesquisa.';
        return '';
    }, [books, tab, filtered.length, librarySetupMessage, isConfiguredExternalTab, configuredUrl, isSunsetTab]);

    const closeDetails = () => setSelectedDetails(null);

    useEffect(() => {
        if (!isConfiguredExternalTab || !configuredUrl) {
            setReaderStatus('idle');
            setReaderHtml('');
            setReaderSegments(null);
            setReaderError(null);
            setReaderSourceUrl(null);
            setDayIdx(0);
            setLessonNoteSlugs([]);
            return;
        }

        let cancelled = false;
        setReaderStatus('loading');
        setReaderHtml('');
        setReaderSegments(null);
        setReaderError(null);
        setReaderSourceUrl(null);
        setDayIdx(0);
        setLessonNoteSlugs([]);

        fetch(route('mobile.biblioteca.config-external-content', tab), {
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
        })
            .then(async (r) => {
                const data: {
                    ok?: boolean;
                    html?: string;
                    segments?: ReaderSegment[] | null;
                    error?: string;
                    source_url?: string;
                    default_index?: number;
                } = await r.json();
                if (cancelled) return;
                if (data.ok && typeof data.html === 'string' && data.html.trim() !== '') {
                    setReaderHtml(data.html);
                    const segs = Array.isArray(data.segments) ? data.segments : null;
                    setReaderSegments(segs && segs.length > 1 ? segs : null);
                    setReaderSourceUrl(typeof data.source_url === 'string' ? data.source_url : configuredUrl);
                    const defaultDayIdx =
                        typeof data.default_index === 'number'
                            ? data.default_index
                            : tab === 'lesson' && segs && segs.length > 1
                              ? currentLessonDayIndex(segs)
                              : 0;
                    setDayIdx(defaultDayIdx);
                    setReaderStatus('ok');
                } else {
                    setReaderError(typeof data.error === 'string' ? data.error : 'Não foi possível carregar o texto.');
                    setReaderSourceUrl(typeof data.source_url === 'string' ? data.source_url : configuredUrl);
                    setReaderStatus('error');
                }
            })
            .catch(() => {
                if (cancelled) return;
                setReaderError('Não foi possível carregar o texto.');
                setReaderSourceUrl(configuredUrl);
                setReaderStatus('error');
            });

        return () => {
            cancelled = true;
        };
    }, [tab, configuredUrl, isConfiguredExternalTab]);

    const readerDisplayHtml = useMemo(() => {
        if (readerSegments && readerSegments.length > 1) {
            return readerSegments[dayIdx]?.html ?? '';
        }
        return readerHtml;
    }, [readerSegments, readerHtml, dayIdx]);

    const segmentTabs = useMemo(() => {
        if (!readerSegments || readerSegments.length <= 1) {
            return [];
        }

        return readerSegments.map((segment, index) => ({ segment, index }));
    }, [readerSegments]);

    const readerContentClassName =
        'rounded-xl border border-zinc-100 bg-zinc-50 p-4 text-sm leading-relaxed text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 [&_a]:font-medium [&_a]:text-primary-600 [&_a]:underline dark:[&_a]:text-primary-400 [&_blockquote]:my-3 [&_blockquote]:rounded-xl [&_blockquote]:border [&_blockquote]:border-dashed [&_blockquote]:border-zinc-300 [&_blockquote]:bg-white/90 [&_blockquote]:px-3.5 [&_blockquote]:py-3 dark:[&_blockquote]:border-zinc-600 dark:[&_blockquote]:bg-zinc-900/50 [&_blockquote+p]:mt-4 [&_blockquote+h2]:mt-6 [&_blockquote+blockquote]:mt-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2+p]:mt-3 [&_h2+p>em]:text-[15px] [&_h2+p>em]:leading-relaxed [&_h2+p>em]:text-zinc-700 dark:[&_h2+p>em]:text-zinc-300 [&_h3]:mt-2 [&_h3]:text-base [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_p:first-of-type]:text-[15px] [&_p+h2]:mt-6 [&_p+p]:mt-5 [&_p+p]:border-t [&_p+p]:border-zinc-200 [&_p+p]:pt-5 dark:[&_p+p]:border-zinc-700 [&_ul]:list-disc [&_ul]:pl-5';

    return (
        <MobileLayout>
            <Head title="Biblioteca" />

            <div className="space-y-6">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="min-w-0 text-balance text-3xl font-bold leading-[1.12] tracking-[-0.03em] text-zinc-900 antialiased dark:text-white sm:text-4xl sm:tracking-[-0.035em]">
                            Biblioteca
                        </h1>
                        <GratisBadge className="translate-y-0.5" />
                    </div>
                    <div className="relative w-full sm:max-w-xs">
                        {!isAcervoTab ? (
                            <>
                                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                                <input
                                    type="search"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Pesquisar…"
                                    className="w-full rounded-xl border border-zinc-200/90 bg-white py-2.5 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900/15 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-zinc-300 dark:focus:ring-zinc-300/20"
                                    aria-label="Pesquisar na biblioteca"
                                />
                            </>
                        ) : null}
                    </div>
                </header>

                {librarySetupMessage ? (
                    <div
                        role="alert"
                        className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800/80 dark:bg-amber-950/40 dark:text-amber-100"
                    >
                        <p className="font-semibold">Biblioteca indisponível</p>
                        <p className="mt-1 leading-relaxed">{librarySetupMessage}</p>
                    </div>
                ) : null}

                <nav
                    role="tablist"
                    aria-label="Categorias"
                    className="grid grid-cols-3 gap-2 sm:grid-cols-3 lg:grid-cols-6"
                >
                    {categories.map((c) => {
                        const active = tab === c.value;
                        const meta = libraryCategoryPresentation(c.value, c.label);
                        const Icon = meta.icon;

                        return (
                            <button
                                key={c.value}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                aria-label={c.label}
                                onClick={() => {
                                    setTab(c.value);
                                    router.get(
                                        route('mobile.biblioteca'),
                                        c.value === 'revista_adventista_acervo'
                                            ? {
                                                  tab: c.value,
                                                  ano: revistaAdventistaAcervo?.selectedYear,
                                              }
                                            : { tab: c.value },
                                        { preserveState: true, replace: true },
                                    );
                                }}
                                className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-3 text-center transition active:scale-[0.98] ${
                                    active
                                        ? 'bg-zinc-900 text-white shadow-md ring-2 ring-zinc-900/15 dark:bg-white dark:text-zinc-900 dark:ring-white/20'
                                        : 'border border-zinc-200/90 bg-white text-zinc-600 shadow-sm hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800'
                                }`}
                            >
                                <span
                                    className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${
                                        active
                                            ? 'bg-white/15 text-white dark:bg-zinc-900/10 dark:text-zinc-900'
                                            : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                                    }`}
                                >
                                    <Icon className="h-5 w-5 shrink-0" aria-hidden />
                                </span>
                                <span className="flex min-w-0 flex-col leading-tight">
                                    <span className="text-[11px] font-semibold tracking-tight">{meta.line1}</span>
                                    {meta.line2 ? (
                                        <span className="text-[10px] font-medium opacity-90">{meta.line2}</span>
                                    ) : null}
                                </span>
                            </button>
                        );
                    })}
                </nav>

                {isAcervoTab && revistaAdventistaAcervo ? (
                    <RevistaAdventistaAcervoContent
                        editions={revistaAdventistaAcervo.editions}
                        availableYears={revistaAdventistaAcervo.availableYears}
                        selectedYear={revistaAdventistaAcervo.selectedYear}
                        decades={revistaAdventistaAcervo.decades}
                        onSelectYear={selectAcervoYear}
                        showHeading={false}
                    />
                ) : isConfiguredExternalTab ? (
                    <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
                        {!configuredUrl ? (
                            <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">{emptyMessage}</p>
                        ) : readerStatus === 'loading' ? (
                            <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">A carregar leitura…</p>
                        ) : readerStatus === 'error' ? (
                            <div className="space-y-3 text-center">
                                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                                    {readerError}
                                </p>
                                {readerSourceUrl ? (
                                    <a
                                        href={readerSourceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-sm font-semibold text-primary-700 underline-offset-2 hover:underline dark:text-primary-300"
                                    >
                                        <ArrowTopRightOnSquareIcon className="h-4 w-4 shrink-0" aria-hidden />
                                        {isSunsetTab ? 'Abrir PDF completo' : 'Abrir no site original'}
                                    </a>
                                ) : null}
                            </div>
                        ) : readerStatus === 'ok' ? (
                            <div className="space-y-4">
                                {readerSegments && readerSegments.length > 1 ? (
                                    <nav
                                        className={
                                            isSunsetTab
                                                ? 'flex flex-wrap gap-1.5'
                                                : 'grid grid-cols-4 gap-1.5 sm:grid-cols-7'
                                        }
                                        role="tablist"
                                        aria-label={isSunsetTab ? 'Meditações semanais' : 'Dias da semana'}
                                    >
                                        {segmentTabs.map(({ segment, index }) => {
                                            const active = dayIdx === index;
                                            const hasNote = isLessonTab && lessonNoteSlugs.includes(segment.slug);
                                            const tabLabel = isSunsetTab ? segment.label : compactDayLabel(segment.label);

                                            return (
                                                <button
                                                    key={segment.slug}
                                                    type="button"
                                                    role="tab"
                                                    aria-selected={active}
                                                    aria-current={active ? 'true' : undefined}
                                                    aria-label={segment.label}
                                                    onClick={() => setDayIdx(index)}
                                                    className={`relative cursor-pointer rounded-xl px-2 py-2 text-center text-[11px] font-semibold leading-tight transition sm:text-xs ${
                                                        isSunsetTab ? 'min-w-[3.25rem]' : ''
                                                    } ${
                                                        active
                                                            ? isSunsetTab
                                                                ? 'bg-zinc-900 text-white shadow-md ring-2 ring-amber-400/80 dark:bg-white dark:text-zinc-900 dark:ring-amber-500/70'
                                                                : 'bg-zinc-900 text-white shadow-md ring-2 ring-zinc-900/15 dark:bg-zinc-900 dark:text-white dark:ring-white/20'
                                                            : 'border border-zinc-200/90 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800'
                                                    }`}
                                                >
                                                    {tabLabel}
                                                    {hasNote ? (
                                                        <span
                                                            className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-teal-500 ring-2 ring-white dark:ring-zinc-900"
                                                            aria-label="Com anotação"
                                                        />
                                                    ) : null}
                                                </button>
                                            );
                                        })}
                                    </nav>
                                ) : null}
                                {isLessonTab && readerSourceUrl ? (
                                    <LibraryLessonDayNotes
                                        lessonSourceUrl={readerSourceUrl}
                                        segments={readerSegments}
                                        dayIdx={dayIdx}
                                        onDayIdxChange={setDayIdx}
                                        readerHtml={readerDisplayHtml}
                                        readerContentClassName={readerContentClassName}
                                        onNoteSlugsChange={handleLessonNoteSlugsChange}
                                    />
                                ) : (
                                    <div
                                        className={readerContentClassName}
                                        dangerouslySetInnerHTML={{ __html: readerDisplayHtml }}
                                    />
                                )}
                                {readerSourceUrl ? (
                                    <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                                        <a
                                            href={readerSourceUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-medium text-primary-600 underline-offset-2 hover:underline dark:text-primary-400"
                                        >
                                            {isSunsetTab ? 'Abrir PDF completo' : 'Abrir no site original'}
                                        </a>
                                    </p>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-200/90 bg-white py-14 text-center dark:border-zinc-800 dark:bg-zinc-900">
                        <BookOpenIcon className="mx-auto h-9 w-9 text-zinc-400 dark:text-zinc-500" />
                        <p className="mt-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">{emptyMessage}</p>
                    </div>
                ) : (
                    <ul className="space-y-4">
                        {filtered.map((b) => {
                            const cover = imageSrc(b.cover_url, appUrl);
                            const pdf = b.pdf_url ? imageSrc(b.pdf_url, appUrl) : '';
                            const pdfReadUrl = pdf ? pdfUrlWithViewerParams(pdf, viewerFragment) : '';
                            const extRaw = (b.external_url ?? '').trim();
                            const ext = extRaw ? extRaw : '';
                            const showUrl = route('mobile.biblioteca.show', b.id);
                            const directOpen = ext !== '' ? ext : '';
                            const description = (b.description ?? '').trim();
                            const maxDesc = 180;
                            const shortDesc =
                                description.length > maxDesc ? description.slice(0, maxDesc).trimEnd() : description;
                            const hasMore = description.length > shortDesc.length;

                            const coverVisual = cover ? (
                                <img src={cover} alt="" className="h-full w-full object-cover" loading="lazy" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-zinc-100 dark:bg-zinc-800">
                                    <BookOpenIcon className="h-10 w-10 text-zinc-400" aria-hidden />
                                </div>
                            );

                            const coverShellClass =
                                'relative block aspect-[3/4] w-[8.75rem] shrink-0 overflow-hidden rounded-lg bg-zinc-100 touch-manipulation transition active:opacity-90 dark:bg-zinc-800 sm:w-36';

                            const coverBlock =
                                directOpen !== '' ? (
                                    <a
                                        href={directOpen}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`${coverShellClass} cursor-pointer`}
                                        aria-label={`Abrir no site: ${b.title}`}
                                        title="Abrir no site"
                                    >
                                        {coverVisual}
                                    </a>
                                ) : pdfReadUrl !== '' ? (
                                    <a href={pdfReadUrl} className={`${coverShellClass} cursor-pointer`} aria-label={`Ler: ${b.title}`}>
                                        {coverVisual}
                                    </a>
                                ) : (
                                    <Link href={showUrl} className={`${coverShellClass} cursor-pointer`} aria-label={`Ler: ${b.title}`}>
                                        {coverVisual}
                                    </Link>
                                );

                            return (
                                <li
                                    key={b.id}
                                    className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                                >
                                    <div className="flex items-start gap-4 p-4">
                                        {coverBlock}
                                        <div className="min-w-0 flex-1 pt-0.5">
                                            <h2 className="text-lg font-bold leading-snug tracking-[-0.02em] text-zinc-900 antialiased dark:text-white sm:text-xl sm:tracking-[-0.025em]">
                                                {b.title}
                                            </h2>
                                            {b.subtitle ? (
                                                <p className="mt-1.5 line-clamp-2 text-[15px] font-normal leading-relaxed text-zinc-500 dark:text-zinc-400">
                                                    {b.subtitle}
                                                </p>
                                            ) : null}
                                            <div className="mt-4 flex flex-wrap items-stretch gap-2">
                                                {pdf !== '' ? (
                                                    <a
                                                        href={pdfReadUrl}
                                                        className="inline-flex min-h-9 cursor-pointer touch-manipulation items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                                                        aria-label={`Ler: ${b.title}`}
                                                    >
                                                        <BookOpenIcon
                                                            className="h-4 w-4 shrink-0 text-white dark:text-zinc-900"
                                                            aria-hidden
                                                        />
                                                        Ler
                                                    </a>
                                                ) : ext !== '' ? (
                                                    <a
                                                        href={ext}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex min-h-9 cursor-pointer touch-manipulation items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                                                        aria-label={`Ler: ${b.title}`}
                                                    >
                                                        <BookOpenIcon
                                                            className="h-4 w-4 shrink-0 text-white dark:text-zinc-900"
                                                            aria-hidden
                                                        />
                                                        Ler
                                                    </a>
                                                ) : (
                                                    <Link
                                                        href={showUrl}
                                                        className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                                                    >
                                                        <BookOpenIcon
                                                            className="h-4 w-4 shrink-0 text-white dark:text-zinc-900"
                                                            aria-hidden
                                                        />
                                                        Ler
                                                    </Link>
                                                )}
                                                {pdf !== '' ? (
                                                    <a
                                                        href={route('mobile.biblioteca.pdf-download', b.id)}
                                                        className="inline-flex min-h-9 cursor-pointer touch-manipulation items-center gap-1.5 rounded-lg border border-zinc-900 bg-white px-3 py-2 text-xs font-medium text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-300 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                                                    >
                                                        <ArrowDownTrayIcon
                                                            className="h-4 w-4 shrink-0 text-zinc-900 dark:text-zinc-100"
                                                            aria-hidden
                                                        />
                                                        Download
                                                    </a>
                                                ) : ext !== '' ? (
                                                    <a
                                                        href={ext}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-900 bg-white px-3 py-2 text-xs font-medium text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-300 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                                                    >
                                                        <ArrowTopRightOnSquareIcon
                                                            className="h-4 w-4 shrink-0 text-zinc-900 dark:text-zinc-100"
                                                            aria-hidden
                                                        />
                                                        Abrir site
                                                    </a>
                                                ) : null}
                                            </div>

                                            {description ? (
                                                <p className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-300">
                                                    {shortDesc}
                                                    {hasMore ? (
                                                        <>
                                                            {' '}
                                                            <button
                                                                type="button"
                                                                onClick={() => setSelectedDetails(b)}
                                                                className="font-semibold text-primary-700 underline-offset-2 hover:underline dark:text-primary-300"
                                                            >
                                                                .. e mais
                                                            </button>
                                                        </>
                                                    ) : null}
                                                </p>
                                            ) : null}
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}

                {tab === 'egw' && filtered.length > 0 ? (
                    <p className="text-center text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                        Conteúdo disponibilizado pelo{' '}
                        <a
                            href="https://centrowhite.org.br/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-primary-600 underline-offset-2 hover:underline dark:text-primary-400"
                        >
                            Centro White
                        </a>
                        .
                    </p>
                ) : null}
            </div>

            <Modal show={selectedDetails !== null} onClose={closeDetails} maxWidth="lg">
                {selectedDetails && (
                    <>
                        <div className="relative">
                            {selectedDetails.cover_url ? (
                                <img
                                    src={imageSrc(selectedDetails.cover_url, appUrl)}
                                    alt=""
                                    className="max-h-52 w-full object-cover sm:max-h-64"
                                />
                            ) : null}
                            <button
                                type="button"
                                onClick={closeDetails}
                                className="absolute right-3 top-3 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
                                aria-label="Fechar"
                            >
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="space-y-3 p-5 sm:p-6">
                            <div>
                                <h2 className="text-xl font-bold text-zinc-900 dark:text-white sm:text-2xl">
                                    {selectedDetails.title}
                                </h2>
                                {selectedDetails.subtitle ? (
                                    <p className="mt-1 text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                        {selectedDetails.subtitle}
                                    </p>
                                ) : null}
                            </div>
                            {String(selectedDetails.description ?? '').trim() ? (
                                <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800">
                                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                                        {String(selectedDetails.description ?? '').trim()}
                                    </p>
                                </div>
                            ) : null}
                            <button
                                type="button"
                                onClick={closeDetails}
                                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 sm:w-auto sm:px-8"
                            >
                                Fechar
                            </button>
                        </div>
                    </>
                )}
            </Modal>
        </MobileLayout>
    );
}
