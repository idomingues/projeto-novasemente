import Modal from '@/Components/Modal';
import LibraryLessonReaderContent from '@/Components/Mobile/LibraryLessonReaderContent';
import {
    BookOpenIcon,
    CalendarDaysIcon,
    CheckIcon,
    LockClosedIcon,
    PencilSquareIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { Link, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface LessonDaySegment {
    slug: string;
    label: string;
    html: string;
    question?: string | null;
}

export interface LessonNoteItem {
    id: number;
    day_slug: string;
    body: string;
    answer_body?: string | null;
    updated_at: string | null;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

type ViewMode = 'reading' | 'notes';

type Props = {
    lessonSourceUrl: string;
    segments: LessonDaySegment[] | null;
    dayIdx: number;
    onDayIdxChange: (index: number) => void;
    readerHtml: string;
    readerContentClassName: string;
    onNoteSlugsChange?: (slugs: string[]) => void;
};

function formatSavedAt(iso: string | null): string {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleString('pt-BR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return '';
    }
}

function currentDaySlug(segments: LessonDaySegment[] | null, dayIdx: number): string {
    if (segments && segments.length > 0) {
        return segments[Math.min(Math.max(dayIdx, 0), segments.length - 1)]?.slug ?? 'all';
    }
    return 'all';
}

function currentDayLabel(segments: LessonDaySegment[] | null, dayIdx: number): string {
    if (segments && segments.length > 0) {
        return segments[Math.min(Math.max(dayIdx, 0), segments.length - 1)]?.label ?? 'Lição';
    }
    return 'Lição';
}

function currentDayQuestion(segments: LessonDaySegment[] | null, dayIdx: number): string | null {
    if (!segments || segments.length === 0) {
        return null;
    }
    const question = segments[Math.min(Math.max(dayIdx, 0), segments.length - 1)]?.question;
    const trimmed = typeof question === 'string' ? question.trim() : '';
    return trimmed !== '' ? trimmed : null;
}

export default function LibraryLessonDayNotes({
    lessonSourceUrl,
    segments,
    dayIdx,
    onDayIdxChange,
    readerHtml,
    readerContentClassName,
    onNoteSlugsChange,
}: Props) {
    const page = usePage();
    const authUser = (page.props as { auth?: { user?: { id?: number } | null } }).auth?.user;
    const csrf = (page.props as { csrf_token?: string }).csrf_token ?? '';
    const loginHref = `${route('login')}?redirect=${encodeURIComponent(page.url)}`;

    const [viewMode, setViewMode] = useState<ViewMode>('reading');
    const [notesBySlug, setNotesBySlug] = useState<Record<string, LessonNoteItem>>({});
    const [draftBody, setDraftBody] = useState('');
    const [draftAnswer, setDraftAnswer] = useState('');
    const [saveState, setSaveState] = useState<SaveState>('idle');
    const [answerSaveState, setAnswerSaveState] = useState<SaveState>('idle');
    const [loadError, setLoadError] = useState<string | null>(null);
    const [weekModalOpen, setWeekModalOpen] = useState(false);
    const [notesLoaded, setNotesLoaded] = useState(false);

    const lastSavedBodyRef = useRef('');
    const lastSavedAnswerRef = useRef('');
    const draftBodyRef = useRef('');
    const draftAnswerRef = useRef('');

    const daySlug = currentDaySlug(segments, dayIdx);
    const dayLabel = currentDayLabel(segments, dayIdx);
    const dayQuestion = currentDayQuestion(segments, dayIdx);
    const currentNote = notesBySlug[daySlug] ?? null;
    const hasSourceOmissionMarkers = readerHtml.includes('[...]') || (dayQuestion?.includes('[...]') ?? false);

    const noteSlugs = useMemo(
        () => Object.keys(notesBySlug).filter((slug) => notesBySlug[slug]?.body.trim() !== ''),
        [notesBySlug],
    );

    useEffect(() => {
        onNoteSlugsChange?.(noteSlugs);
    }, [noteSlugs, onNoteSlugsChange]);

    const syncNotesMap = useCallback((notes: LessonNoteItem[]) => {
        const map: Record<string, LessonNoteItem> = {};
        for (const note of notes) {
            if (note.body.trim() !== '' || (note.answer_body ?? '').trim() !== '') {
                map[note.day_slug] = note;
            }
        }
        setNotesBySlug(map);
    }, []);

    useEffect(() => {
        if (!authUser?.id || !lessonSourceUrl.trim()) {
            setNotesBySlug({});
            setNotesLoaded(true);
            return;
        }

        let cancelled = false;
        setLoadError(null);
        setNotesLoaded(false);

        const url = new URL(route('mobile.biblioteca.lesson-notes.index'), window.location.origin);
        url.searchParams.set('lesson_source_url', lessonSourceUrl);

        fetch(url.toString(), {
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
        })
            .then(async (r) => {
                if (r.status === 401) {
                    return { ok: false as const, unauthorized: true };
                }
                const data: { ok?: boolean; notes?: LessonNoteItem[]; error?: string } = await r.json();
                return { ok: data.ok === true, notes: data.notes ?? [], error: data.error, unauthorized: false };
            })
            .then((result) => {
                if (cancelled) return;
                if ('unauthorized' in result && result.unauthorized) {
                    setNotesBySlug({});
                    setNotesLoaded(true);
                    return;
                }
                if (result.ok) {
                    syncNotesMap(result.notes ?? []);
                } else {
                    setLoadError(result.error ?? 'Não foi possível carregar suas anotações.');
                }
                setNotesLoaded(true);
            })
            .catch(() => {
                if (cancelled) return;
                setLoadError('Não foi possível carregar suas anotações.');
                setNotesLoaded(true);
            });

        return () => {
            cancelled = true;
        };
    }, [authUser?.id, lessonSourceUrl, syncNotesMap]);

    useEffect(() => {
        const body = currentNote?.body ?? '';
        const answer = currentNote?.answer_body ?? '';
        setDraftBody(body);
        setDraftAnswer(answer);
        draftBodyRef.current = body;
        draftAnswerRef.current = answer;
        lastSavedBodyRef.current = body;
        lastSavedAnswerRef.current = answer;
        setSaveState('idle');
        setAnswerSaveState('idle');
    }, [daySlug, currentNote?.body, currentNote?.answer_body, currentNote?.id]);

    const persistNote = useCallback(
        async (body: string, answerBody: string, target: 'notes' | 'answer' | 'both' = 'both') => {
            if (!authUser?.id) return;

            if (target === 'notes' || target === 'both') {
                setSaveState('saving');
            }
            if (target === 'answer' || target === 'both') {
                setAnswerSaveState('saving');
            }

            try {
                const response = await fetch(route('mobile.biblioteca.lesson-notes.upsert'), {
                    method: 'PUT',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRF-TOKEN': csrf,
                    },
                    credentials: 'same-origin',
                    body: JSON.stringify({
                        lesson_source_url: lessonSourceUrl,
                        day_slug: daySlug,
                        body,
                        answer_body: answerBody,
                    }),
                });

                const data: { ok?: boolean; note?: LessonNoteItem | null; error?: string } = await response.json();

                if (!response.ok || !data.ok) {
                    if (target === 'notes' || target === 'both') setSaveState('error');
                    if (target === 'answer' || target === 'both') setAnswerSaveState('error');
                    return;
                }

                lastSavedBodyRef.current = body;
                lastSavedAnswerRef.current = answerBody;
                setNotesBySlug((prev) => {
                    const next = { ...prev };
                    if (data.note && (data.note.body.trim() !== '' || (data.note.answer_body ?? '').trim() !== '')) {
                        next[daySlug] = data.note;
                    } else {
                        delete next[daySlug];
                    }
                    return next;
                });
                if (target === 'notes' || target === 'both') setSaveState('saved');
                if (target === 'answer' || target === 'both') setAnswerSaveState('saved');
            } catch {
                if (target === 'notes' || target === 'both') setSaveState('error');
                if (target === 'answer' || target === 'both') setAnswerSaveState('error');
            }
        },
        [authUser?.id, csrf, daySlug, lessonSourceUrl],
    );

    const isNotesDirty = draftBody !== lastSavedBodyRef.current;
    const isAnswerDirty = draftAnswer !== lastSavedAnswerRef.current;

    const handleDraftChange = (value: string) => {
        setDraftBody(value);
        draftBodyRef.current = value;
        if (saveState === 'saved') {
            setSaveState('idle');
        }
    };

    const handleAnswerChange = (value: string) => {
        setDraftAnswer(value);
        draftAnswerRef.current = value;
        if (answerSaveState === 'saved') {
            setAnswerSaveState('idle');
        }
    };

    const handleSaveNotes = () => {
        if (!isNotesDirty || saveState === 'saving') {
            return;
        }
        void persistNote(draftBodyRef.current, draftAnswerRef.current, 'notes');
    };

    const handleSaveAnswer = () => {
        if (!isAnswerDirty || answerSaveState === 'saving') {
            return;
        }
        void persistNote(draftBodyRef.current, draftAnswerRef.current, 'answer');
    };

    const weekNotes = useMemo(() => {
        if (!segments || segments.length === 0) {
            const note = notesBySlug.all;
            return note ? [{ segment: { slug: 'all', label: 'Lição', html: '' }, note }] : [];
        }
        return segments
            .map((segment) => ({ segment, note: notesBySlug[segment.slug] ?? null }))
            .filter((item) => item.note && item.note.body.trim() !== '');
    }, [segments, notesBySlug]);

    const saveStatusLabel =
        saveState === 'saving'
            ? 'Salvando…'
            : saveState === 'saved'
              ? 'Salvo'
              : saveState === 'error'
                ? 'Erro ao salvar'
                : isNotesDirty
                  ? 'Alterações não salvas'
                  : currentNote?.updated_at
                    ? `Salvo ${formatSavedAt(currentNote.updated_at)}`
                    : '';

    const answerStatusLabel =
        answerSaveState === 'saving'
            ? 'Salvando…'
            : answerSaveState === 'saved'
              ? 'Salvo'
              : answerSaveState === 'error'
                ? 'Erro ao salvar'
                : isAnswerDirty
                  ? 'Alterações não salvas'
                  : currentNote?.updated_at && draftAnswer.trim() !== ''
                    ? `Salvo ${formatSavedAt(currentNote.updated_at)}`
                    : '';

    const saveButtonClass =
        'inline-flex cursor-pointer items-center justify-center rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100';

    return (
        <div className="space-y-3">
            <div
                className="inline-flex rounded-xl border border-zinc-200 bg-zinc-100/80 p-1 dark:border-zinc-700 dark:bg-zinc-800/80"
                role="tablist"
                aria-label="Modo de leitura"
            >
                <button
                    type="button"
                    role="tab"
                    aria-selected={viewMode === 'reading'}
                    onClick={() => setViewMode('reading')}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                        viewMode === 'reading'
                            ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-white'
                            : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100'
                    }`}
                >
                    <BookOpenIcon className="h-4 w-4 shrink-0" aria-hidden />
                    Leitura
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={viewMode === 'notes'}
                    onClick={() => setViewMode('notes')}
                    className={`relative inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                        viewMode === 'notes'
                            ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-white'
                            : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100'
                    }`}
                >
                    <PencilSquareIcon className="h-4 w-4 shrink-0" aria-hidden />
                    Anotações
                    {noteSlugs.includes(daySlug) ? (
                        <span
                            className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-teal-500 ring-2 ring-zinc-100 dark:ring-zinc-800"
                            aria-hidden
                        />
                    ) : null}
                </button>
            </div>

            {viewMode === 'reading' ? (
                <div className="space-y-4">
                    {hasSourceOmissionMarkers ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                            Os trechos com <strong>[...]</strong> já fazem parte do texto original publicado pela fonte e
                            indicam uma omissão editorial na citação, não um corte feito pelo app.
                        </div>
                    ) : null}
                    <LibraryLessonReaderContent html={readerHtml} className={readerContentClassName} />
                    {dayQuestion ? (
                        <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                            <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800 sm:px-5">
                                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                    Pergunta para reflexão
                                </p>
                                <LibraryLessonReaderContent
                                    html={dayQuestion}
                                    className="mt-2 text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-100 [&_p]:m-0"
                                />
                            </div>
                            <div className="p-4 sm:p-5">
                                {!authUser?.id ? (
                                    <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-5 text-center dark:border-zinc-600 dark:bg-zinc-950">
                                        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                                            Entre na sua conta para registrar sua resposta. Ela ficará salva só para você.
                                        </p>
                                        <Link
                                            href={loginHref}
                                            className="mt-4 inline-flex cursor-pointer items-center justify-center rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                                        >
                                            Entrar para responder
                                        </Link>
                                    </div>
                                ) : (
                                    <>
                                        <div className="mb-2 flex items-center justify-between gap-2">
                                            <label
                                                htmlFor={`lesson-answer-${daySlug}`}
                                                className="text-sm font-semibold text-zinc-900 dark:text-white"
                                            >
                                                Sua resposta
                                            </label>
                                            {answerSaveState === 'saved' ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 dark:text-teal-300">
                                                    <CheckIcon className="h-3.5 w-3.5" aria-hidden />
                                                    Salvo
                                                </span>
                                            ) : answerStatusLabel ? (
                                                <span
                                                    className={`text-xs font-medium ${
                                                        answerSaveState === 'error'
                                                            ? 'text-red-600 dark:text-red-400'
                                                            : isAnswerDirty
                                                              ? 'text-amber-700 dark:text-amber-300'
                                                              : 'text-zinc-500 dark:text-zinc-400'
                                                    }`}
                                                >
                                                    {answerStatusLabel}
                                                </span>
                                            ) : null}
                                        </div>
                                        <textarea
                                            id={`lesson-answer-${daySlug}`}
                                            value={draftAnswer}
                                            onChange={(e) => handleAnswerChange(e.target.value)}
                                            disabled={!notesLoaded}
                                            rows={5}
                                            placeholder="Escreva aqui sua reflexão ou resposta…"
                                            className="w-full resize-y rounded-xl border border-zinc-200/90 bg-zinc-50 px-4 py-3.5 text-[15px] leading-relaxed text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-300 dark:focus:ring-zinc-300/15"
                                        />
                                        <div className="mt-3 flex justify-end">
                                            <button
                                                type="button"
                                                onClick={handleSaveAnswer}
                                                disabled={!notesLoaded || !isAnswerDirty || answerSaveState === 'saving'}
                                                className={saveButtonClass}
                                            >
                                                {answerSaveState === 'saving' ? 'Salvando…' : 'Salvar resposta'}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    ) : null}
                </div>
            ) : !authUser?.id ? (
                <div className="rounded-2xl border border-dashed border-zinc-300 bg-gradient-to-br from-teal-50/80 via-white to-amber-50/50 p-6 text-center dark:border-zinc-600 dark:from-teal-950/20 dark:via-zinc-900 dark:to-amber-950/10 sm:p-8">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm dark:bg-zinc-800">
                        <LockClosedIcon className="h-6 w-6 text-zinc-500 dark:text-zinc-400" aria-hidden />
                    </div>
                    <h3 className="mt-4 text-base font-bold text-zinc-900 dark:text-white">Suas anotações pessoais</h3>
                    <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                        Entre na sua conta para registrar reflexões de cada dia da lição. Suas anotações ficam salvas só
                        para você.
                    </p>
                    <Link
                        href={loginHref}
                        className="mt-5 inline-flex cursor-pointer items-center justify-center rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                    >
                        Entrar para anotar
                    </Link>
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-teal-200/80 bg-gradient-to-br from-teal-50/90 via-white to-white shadow-sm dark:border-teal-900/50 dark:from-teal-950/30 dark:via-zinc-900 dark:to-zinc-900">
                    <div className="flex items-start justify-between gap-3 border-b border-teal-100/80 px-4 py-3 dark:border-teal-900/40 sm:px-5">
                        <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
                                Minhas anotações
                            </p>
                            <h3 className="mt-0.5 truncate text-base font-bold text-zinc-900 dark:text-white">{dayLabel}</h3>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            {saveState === 'saved' ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 dark:text-teal-300">
                                    <CheckIcon className="h-3.5 w-3.5" aria-hidden />
                                    Salvo
                                </span>
                            ) : saveStatusLabel ? (
                                <span
                                    className={`text-xs font-medium ${
                                        saveState === 'error'
                                            ? 'text-red-600 dark:text-red-400'
                                            : isNotesDirty
                                              ? 'text-amber-700 dark:text-amber-300'
                                              : 'text-zinc-500 dark:text-zinc-400'
                                    }`}
                                >
                                    {saveStatusLabel}
                                </span>
                            ) : null}
                        </div>
                    </div>

                    <div className="p-4 sm:p-5">
                        {loadError ? (
                            <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                                {loadError}
                            </p>
                        ) : null}

                        <textarea
                            value={draftBody}
                            onChange={(e) => handleDraftChange(e.target.value)}
                            disabled={!notesLoaded}
                            rows={8}
                            placeholder="Versículos que tocaram você, perguntas para o grupo, aplicações práticas…"
                            className="w-full resize-y rounded-xl border border-zinc-200/90 bg-white/90 px-4 py-3.5 text-[15px] leading-relaxed text-zinc-800 placeholder:text-zinc-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-teal-500"
                            aria-label={`Anotações de ${dayLabel}`}
                        />

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {draftBody.trim() === ''
                                    ? 'Suas anotações ficam salvas só para você.'
                                    : `${draftBody.trim().split(/\s+/).filter(Boolean).length} palavras`}
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                                {weekNotes.length > 0 ? (
                                    <button
                                        type="button"
                                        onClick={() => setWeekModalOpen(true)}
                                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-teal-800 transition hover:bg-teal-100/80 dark:text-teal-200 dark:hover:bg-teal-950/50"
                                    >
                                        <CalendarDaysIcon className="h-4 w-4 shrink-0" aria-hidden />
                                        Ver semana ({weekNotes.length})
                                    </button>
                                ) : null}
                                <button
                                    type="button"
                                    onClick={handleSaveNotes}
                                    disabled={!notesLoaded || !isNotesDirty || saveState === 'saving'}
                                    className={saveButtonClass}
                                >
                                    {saveState === 'saving' ? 'Salvando…' : 'Salvar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <Modal show={weekModalOpen} onClose={() => setWeekModalOpen(false)} maxWidth="lg">
                <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
                    <div>
                        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Anotações da semana</h2>
                        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                            Toque em um dia para editar
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setWeekModalOpen(false)}
                        className="cursor-pointer rounded-full p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                        aria-label="Fechar"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>
                <div className="max-h-[min(70vh,32rem)] space-y-3 overflow-y-auto p-5">
                    {weekNotes.length === 0 ? (
                        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
                            Ainda não há anotações nesta semana.
                        </p>
                    ) : (
                        weekNotes.map(({ segment, note }) => (
                            <button
                                key={segment.slug}
                                type="button"
                                onClick={() => {
                                    if (segments) {
                                        const idx = segments.findIndex((s) => s.slug === segment.slug);
                                        if (idx >= 0) {
                                            onDayIdxChange(idx);
                                        }
                                    }
                                    setViewMode('notes');
                                    setWeekModalOpen(false);
                                }}
                                className="w-full cursor-pointer rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-left transition hover:border-teal-300 hover:bg-teal-50/50 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:border-teal-800 dark:hover:bg-teal-950/20"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-bold text-zinc-900 dark:text-white">{segment.label}</span>
                                    {note?.updated_at ? (
                                        <span className="shrink-0 text-[11px] text-zinc-500 dark:text-zinc-400">
                                            {formatSavedAt(note.updated_at)}
                                        </span>
                                    ) : null}
                                </div>
                                <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                                    {note?.body}
                                </p>
                            </button>
                        ))
                    )}
                </div>
            </Modal>
        </div>
    );
}
