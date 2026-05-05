import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link } from '@inertiajs/react';
import { MagnifyingGlassIcon, XMarkIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import { useEffect, useMemo, useRef, useState } from 'react';

type Testament = 'old' | 'new';

type BibleBook = {
    id: number;
    key: string;
    abbrev: string;
    name: string;
    testament: Testament;
    position: number;
    chapters_count: number;
};

type VerseRow = { verse: number; text: string };

type InitialPayload = {
    book: { key: string; abbrev: string; name: string; testament: Testament; chapters_count: number };
    chapter: number;
    verses: VerseRow[];
} | null;

interface Props {
    books: BibleBook[];
    initial: InitialPayload;
}

type SearchResult = {
    ref: string;
    book: string;
    chapter: number;
    verse: number;
    text: string;
};

type LastReading = {
    bookKey: string;
    chapter: number;
    updatedAt: number;
};

const LAST_READING_STORAGE_KEY = 'ns:bible:lastReading:v1';

function normalizeForSearch(s: string): string {
    return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function readLastReading(): LastReading | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(LAST_READING_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<LastReading>;
        const bookKey = typeof parsed.bookKey === 'string' ? parsed.bookKey.trim() : '';
        const chapter = typeof parsed.chapter === 'number' ? parsed.chapter : Number(parsed.chapter);
        const updatedAt = typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Number(parsed.updatedAt);
        if (!bookKey || !Number.isFinite(chapter) || chapter < 1) return null;
        return { bookKey, chapter, updatedAt: Number.isFinite(updatedAt) ? updatedAt : Date.now() };
    } catch {
        return null;
    }
}

function writeLastReading(value: { bookKey: string; chapter: number }) {
    if (typeof window === 'undefined') return;
    try {
        const payload: LastReading = { bookKey: value.bookKey, chapter: value.chapter, updatedAt: Date.now() };
        window.localStorage.setItem(LAST_READING_STORAGE_KEY, JSON.stringify(payload));
    } catch {
        // ignore (private mode / quota)
    }
}

export default function MobileBible({ books, initial }: Props) {
    const [testament, setTestament] = useState<Testament>(initial?.book.testament ?? 'old');
    const [selectedBook, setSelectedBook] = useState<BibleBook | null>(() => {
        if (!initial?.book) return null;
        return books.find((b) => b.key === initial.book.key) ?? null;
    });
    const [chapter, setChapter] = useState<number>(initial?.chapter ?? 1);
    const [verses, setVerses] = useState<VerseRow[]>(initial?.verses ?? []);
    const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

    const [search, setSearch] = useState('');
    const [searchStatus, setSearchStatus] = useState<'idle' | 'loading' | 'error'>('idle');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

    const requestSeq = useRef(0);
    const searchSeq = useRef(0);
    const searchDebounce = useRef<number | null>(null);
    const readerCardRef = useRef<HTMLDivElement | null>(null);
    const [focusedVerse, setFocusedVerse] = useState<number | null>(null);

    const booksByTestament = useMemo(() => {
        const old = books.filter((b) => b.testament === 'old');
        const neu = books.filter((b) => b.testament === 'new');
        return { old, new: neu };
    }, [books]);

    const filteredBooks = useMemo(() => {
        const list = testament === 'old' ? booksByTestament.old : booksByTestament.new;
        const q = normalizeForSearch(search.trim());
        if (!q) return list;
        return list.filter((b) => normalizeForSearch(b.name).includes(q) || normalizeForSearch(b.abbrev).includes(q));
    }, [booksByTestament, testament, search]);

    const chapters = useMemo(() => {
        const count = selectedBook?.chapters_count ?? 0;
        return Array.from({ length: count }, (_, i) => i + 1);
    }, [selectedBook]);

    const showSearchResults = search.trim().length >= 2;

    useEffect(() => {
        if (!selectedBook) return;
        const url = route('mobile.bible', { book: selectedBook.key, chapter });
        window.history.replaceState(null, '', url);
    }, [selectedBook, chapter]);

    const scrollToReader = () => {
        const el = readerCardRef.current;
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const scrollToVerse = (verse: number) => {
        const el = document.getElementById(`bible-verse-${verse}`);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const loadChapter = async (
        bookKey: string,
        chap: number,
        opts?: { scrollToReader?: boolean; focusVerse?: number | null },
    ) => {
        const seq = ++requestSeq.current;
        setStatus('loading');
        try {
            const u = route('mobile.bible.chapter', { book: bookKey, chapter: chap });
            const r = await fetch(u, {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'same-origin',
            });
            const data: { ok?: boolean; book?: any; chapter?: number; verses?: VerseRow[] } = await r.json();
            if (seq !== requestSeq.current) return;
            if (!data.ok || !data.book || !Array.isArray(data.verses)) throw new Error('bad');
            const book = books.find((b) => b.key === String(data.book.key)) ?? null;
            setSelectedBook(book);
            setTestament((data.book.testament as Testament) ?? testament);
            setChapter(Number(data.chapter ?? chap));
            setVerses(data.verses);
            setStatus('idle');

            if (book) {
                writeLastReading({ bookKey: book.key, chapter: Number(data.chapter ?? chap) });
            }

            // Espera o React pintar o novo capítulo antes de subir/posicionar.
            requestAnimationFrame(() => {
                if (opts?.scrollToReader) {
                    scrollToReader();
                }
                const v = typeof opts?.focusVerse === 'number' ? opts.focusVerse : null;
                if (v && Number.isFinite(v) && v > 0) {
                    // 2 RAFs para garantir que o DOM do map(verses) já foi montado.
                    requestAnimationFrame(() => scrollToVerse(v));
                }
            });
        } catch {
            if (seq !== requestSeq.current) return;
            setStatus('error');
        }
    };

    const onSelectBook = (b: BibleBook) => {
        setFocusedVerse(null);
        setSelectedBook(b);
        setChapter(1);
        setVerses([]);
        loadChapter(b.key, 1, { scrollToReader: true });
    };

    const onSelectChapter = (chap: number) => {
        if (!selectedBook) return;
        if (chap === chapter) return;
        setFocusedVerse(null);
        loadChapter(selectedBook.key, chap, { scrollToReader: true });
    };

    useEffect(() => {
        if (!showSearchResults) {
            setSearchStatus('idle');
            setSearchResults([]);
            if (searchDebounce.current) {
                window.clearTimeout(searchDebounce.current);
                searchDebounce.current = null;
            }
            return;
        }

        if (searchDebounce.current) window.clearTimeout(searchDebounce.current);
        const q = search.trim();
        searchDebounce.current = window.setTimeout(async () => {
            const seq = ++searchSeq.current;
            setSearchStatus('loading');
            try {
                const u = route('mobile.bible.search', { q, testament, limit: 20 });
                const r = await fetch(u, {
                    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                    credentials: 'same-origin',
                });
                const data: { ok?: boolean; results?: SearchResult[] } = await r.json();
                if (seq !== searchSeq.current) return;
                if (!data.ok || !Array.isArray(data.results)) throw new Error('bad');
                setSearchResults(data.results);
                setSearchStatus('idle');
            } catch {
                if (seq !== searchSeq.current) return;
                setSearchStatus('error');
            }
        }, 250);

        return () => {
            if (searchDebounce.current) window.clearTimeout(searchDebounce.current);
        };
    }, [search, testament, showSearchResults]);

    const onOpenSearchResult = (r: SearchResult) => {
        const b = books.find((x) => x.key === r.book) ?? null;
        if (!b) return;
        setSearch('');
        setSearchResults([]);
        setTestament(b.testament);
        setFocusedVerse(r.verse);
        loadChapter(b.key, r.chapter, { scrollToReader: true, focusVerse: r.verse });
    };

    const emptyBible = books.length === 0;

    // Ao abrir a Bíblia, retomar o último livro/capítulo (se a URL não trouxe um initial).
    useEffect(() => {
        if (emptyBible) return;
        if (initial?.book) return; // URL já definiu o lugar
        if (selectedBook) return; // já estamos com algo selecionado
        const last = readLastReading();
        if (!last) return;
        const b = books.find((x) => x.key === last.bookKey) ?? null;
        if (!b) return;
        setTestament(b.testament);
        loadChapter(b.key, Math.min(Math.max(1, last.chapter), b.chapters_count), { scrollToReader: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [emptyBible, books.length]);

    return (
        <MobileLayout>
            <Head title="Bíblia" />

            <div className="space-y-5">
                <div className="space-y-2">
                    <Link href={route('mobile.more')} className="text-sm text-zinc-500 underline dark:text-zinc-400">
                        ← Mais
                    </Link>
                    <div className="flex items-center justify-between gap-3">
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                            Bíblia
                        </h1>
                    </div>
                </div>

                <div className="space-y-3">
                    <div
                        className="-mx-1 flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] px-1 [&::-webkit-scrollbar]:hidden"
                        role="tablist"
                        aria-label="Testamento"
                    >
                        {([
                            { value: 'old' as const, label: 'Antigo Testamento' },
                            { value: 'new' as const, label: 'Novo Testamento' },
                        ] as const).map((t) => {
                            const active = testament === t.value;
                            return (
                                <button
                                    key={t.value}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    onClick={() => {
                                        setTestament(t.value);
                                        if (selectedBook?.testament !== t.value) setSelectedBook(null);
                                    }}
                                    className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                                        active
                                            ? 'bg-brand-600 text-white'
                                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
                                    }`}
                                >
                                    {t.label}
                                </button>
                            );
                        })}
                    </div>

                    <div className="relative">
                        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" aria-hidden />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar livro, capítulo ou versículo…"
                            className="w-full rounded-2xl border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800/50 py-3 pl-10 pr-10 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 dark:focus:border-brand-400 dark:focus:ring-brand-400/20 transition-all text-base"
                            aria-label="Buscar na Bíblia"
                        />
                        {search.trim() !== '' ? (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 active:bg-zinc-200 dark:active:bg-zinc-700"
                                aria-label="Limpar busca"
                            >
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        ) : null}
                    </div>
                </div>

                {emptyBible ? (
                    <div
                        role="alert"
                        className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800/80 dark:bg-amber-950/40 dark:text-amber-100"
                    >
                        <p className="font-semibold">Bíblia indisponível</p>
                        <p className="mt-1 leading-relaxed">
                            Ainda não foi importada para a base de dados. Rode o importador no servidor.
                        </p>
                    </div>
                ) : showSearchResults ? (
                    <div className="space-y-3">
                        {searchStatus === 'loading' ? (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">A procurar…</p>
                        ) : searchStatus === 'error' ? (
                            <p className="text-sm text-amber-700 dark:text-amber-300">
                                Não foi possível pesquisar agora. Tente novamente.
                            </p>
                        ) : searchResults.length === 0 ? (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">Nenhum resultado.</p>
                        ) : (
                            <ul className="space-y-2">
                                {searchResults.map((r) => (
                                    <li key={`${r.book}-${r.chapter}-${r.verse}-${r.ref}`}>
                                        <button
                                            type="button"
                                            onClick={() => onOpenSearchResult(r)}
                                            className="w-full text-left rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 active:scale-[0.99] transition"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-zinc-900 dark:text-white">
                                                        {r.ref}
                                                    </p>
                                                    <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                                                        {r.text}
                                                    </p>
                                                </div>
                                                <BookOpenIcon className="h-5 w-5 text-zinc-400 shrink-0" aria-hidden />
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                ) : selectedBook ? (
                    <div className="space-y-4">
                        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Livro</p>
                                    <p className="text-lg font-bold text-zinc-900 dark:text-white">{selectedBook.name}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedBook(null)}
                                    className="rounded-xl border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                >
                                    Trocar
                                </button>
                            </div>

                            <div className="mt-4">
                                <p className="text-sm font-semibold text-zinc-900 dark:text-white">Selecionar capítulo</p>
                                <div className="mt-3 grid grid-cols-5 sm:grid-cols-8 gap-2">
                                    {chapters.map((c) => {
                                        const active = c === chapter;
                                        return (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => onSelectChapter(c)}
                                                className={`h-11 rounded-xl border text-sm font-semibold transition ${
                                                    active
                                                        ? 'bg-brand-600 border-brand-600 text-white'
                                                        : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800'
                                                }`}
                                            >
                                                {c}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div
                            ref={readerCardRef}
                            className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <p className="font-semibold text-zinc-900 dark:text-white">
                                    {selectedBook.name} {chapter}
                                </p>
                                {status === 'loading' ? (
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">A carregar…</p>
                                ) : status === 'error' ? (
                                    <p className="text-sm text-amber-700 dark:text-amber-300">Erro ao carregar.</p>
                                ) : null}
                            </div>

                            {verses.length === 0 && status !== 'loading' ? (
                                <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">Sem conteúdo.</p>
                            ) : (
                                <div className="mt-4 space-y-4">
                                    {verses.map((v) => (
                                        <div
                                            key={v.verse}
                                            id={`bible-verse-${v.verse}`}
                                            className={`flex gap-3 scroll-mt-24 rounded-xl px-2 py-1.5 -mx-2 transition-colors ${
                                                focusedVerse === v.verse
                                                    ? 'bg-brand-50 dark:bg-brand-950/30'
                                                    : ''
                                            }`}
                                        >
                                            <div className="w-8 shrink-0">
                                                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 text-[12px] font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                                                    {v.verse}
                                                </span>
                                            </div>
                                            <p className="text-[15px] leading-relaxed text-zinc-900 dark:text-zinc-100">
                                                {v.text}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredBooks.length === 0 ? (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">Nenhum livro encontrado.</p>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {filteredBooks.map((b) => (
                                    <button
                                        key={b.key}
                                        type="button"
                                        onClick={() => onSelectBook(b)}
                                        className="text-left rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 active:scale-[0.99] transition"
                                    >
                                        <p className="font-bold text-zinc-900 dark:text-white">{b.name}</p>
                                        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                                            {b.chapters_count} {b.chapters_count === 1 ? 'cap.' : 'caps.'}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </MobileLayout>
    );
}

