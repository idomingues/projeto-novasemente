import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { CheckIcon as CheckIconSolid } from '@heroicons/react/24/solid';
import { useEffect, useMemo, useRef, useState } from 'react';

export type ScheduleCrewRow = { role: string; names: string };

export type ScheduleItemRow =
    | {
          kind: 'item';
          start: string;
          duration?: string | null;
          title: string;
          person?: string | null;
          notes?: string | null;
      }
    | {
          kind: 'section';
          title: string;
      };

export type SaturdaySchedule = {
    version?: number;
    heading?: string | null;
    date_label?: string | null;
    crew?: ScheduleCrewRow[];
    items?: ScheduleItemRow[];
};

type Props = {
    schedule: SaturdaySchedule;
    fallbackDateLabel?: string | null;
    /** Chave estável para lembrar itens marcados (ex.: programacao-sabado:12:2026-09-05). */
    contentKey?: string | null;
};

type TimedItem = {
    index: number;
    startMin: number;
    endMin: number;
    row: Extract<ScheduleItemRow, { kind: 'item' }>;
};

function pad2(n: number): string {
    return String(Math.floor(n)).padStart(2, '0');
}

/** Exibe 09:00 (ou 09:26:30 se houver segundos relevantes). */
export function formatScheduleClock(raw: string): string {
    const parts = raw.trim().split(':');
    if (parts.length < 2) return raw;
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    const s = parts.length >= 3 ? Number(parts[2]) : 0;
    if (Number.isNaN(h) || Number.isNaN(m)) return raw;
    if (!Number.isNaN(s) && s > 0) {
        return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
    }
    return `${pad2(h)}:${pad2(m)}`;
}

function parseTimeToMinutes(raw: string): number | null {
    const parts = raw.trim().split(':').map((p) => Number(p));
    if (parts.length < 2 || parts.some((n) => Number.isNaN(n))) return null;
    const [h, m, s = 0] = parts;
    return h * 60 + m + s / 60;
}

/** Duração no PDF costuma ser mm:ss (ex.: 3:00 = 3 min). */
function parseDurationToMinutes(raw: string | null | undefined): number | null {
    if (!raw) return null;
    const cleaned = raw.replace(/in\s*mins?/i, '').trim();
    const parts = cleaned.split(':').map((p) => Number(p));
    if (parts.length === 1 && !Number.isNaN(parts[0])) return parts[0];
    if (parts.length >= 2 && !parts.some((n) => Number.isNaN(n))) {
        return parts[0] + parts[1] / 60;
    }
    return null;
}

function formatDurationLabel(raw: string | null | undefined): string | null {
    const mins = parseDurationToMinutes(raw);
    if (mins == null) return raw?.trim() || null;
    if (mins < 1) {
        const secs = Math.round(mins * 60);
        return `${secs}s`;
    }
    const whole = Math.round(mins * 10) / 10;
    if (Number.isInteger(whole)) return `${whole} min`;
    return `${whole.toFixed(1).replace('.', ',')} min`;
}

function itemStorageId(row: Extract<ScheduleItemRow, { kind: 'item' }>, index: number): string {
    return `${index}|${row.start}|${row.title}`;
}

function readDoneSet(contentKey: string | null | undefined): Set<string> {
    if (!contentKey || typeof window === 'undefined') return new Set();
    try {
        const raw = window.localStorage.getItem(`ns.saturday-done:${contentKey}`);
        if (!raw) return new Set();
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return new Set();
        return new Set(parsed.filter((x): x is string => typeof x === 'string'));
    } catch {
        return new Set();
    }
}

function writeDoneSet(contentKey: string | null | undefined, done: Set<string>): void {
    if (!contentKey || typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(`ns.saturday-done:${contentKey}`, JSON.stringify([...done]));
    } catch {
        // ignore quota / private mode
    }
}

function nowMinutesOfDay(): number {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

function buildTimedItems(items: ScheduleItemRow[]): TimedItem[] {
    const timed: TimedItem[] = [];
    items.forEach((row, index) => {
        if (row.kind !== 'item') return;
        const startMin = parseTimeToMinutes(row.start);
        if (startMin == null) return;
        timed.push({ index, startMin, endMin: startMin + 5, row });
    });

    for (let i = 0; i < timed.length; i++) {
        const cur = timed[i];
        const next = timed[i + 1];
        const fromDuration = parseDurationToMinutes(cur.row.duration);
        let end = cur.startMin + (fromDuration && fromDuration > 0 ? fromDuration : 5);
        if (next && next.startMin > cur.startMin) {
            end = Math.min(end, next.startMin);
            if (fromDuration == null || fromDuration <= 0) {
                end = next.startMin;
            }
        }
        cur.endMin = Math.max(end, cur.startMin + 0.5);
    }

    return timed;
}

export default function SaturdayProgramScheduleView({
    schedule,
    fallbackDateLabel = null,
    contentKey = null,
}: Props) {
    const crew = schedule.crew ?? [];
    const items = schedule.items ?? [];
    const [crewOpen, setCrewOpen] = useState(false);
    const [doneIds, setDoneIds] = useState<Set<string>>(() => readDoneSet(contentKey));
    const [nowMin, setNowMin] = useState(nowMinutesOfDay);
    const currentRef = useRef<HTMLElement | null>(null);
    const didScrollRef = useRef(false);

    useEffect(() => {
        setDoneIds(readDoneSet(contentKey));
    }, [contentKey]);

    useEffect(() => {
        const tick = () => setNowMin(nowMinutesOfDay());
        tick();
        const id = window.setInterval(tick, 15_000);
        return () => window.clearInterval(id);
    }, []);

    const visibleCrew = useMemo(() => (crewOpen ? crew : crew.slice(0, 4)), [crew, crewOpen]);
    const dateLabel = schedule.date_label?.trim() || fallbackDateLabel || null;
    const timedItems = useMemo(() => buildTimedItems(items), [items]);

    const currentTimedIndex = useMemo(() => {
        const hit = timedItems.findIndex((t) => nowMin >= t.startMin && nowMin < t.endMin);
        if (hit >= 0) return hit;
        // Entre itens: destaca o próximo a começar (até 2 min antes).
        const upcoming = timedItems.findIndex((t) => t.startMin > nowMin && t.startMin - nowMin <= 2);
        return upcoming;
    }, [timedItems, nowMin]);

    const currentItemIndex =
        currentTimedIndex >= 0 ? timedItems[currentTimedIndex]?.index ?? -1 : -1;

    useEffect(() => {
        if (currentItemIndex < 0 || didScrollRef.current) return;
        const el = currentRef.current;
        if (!el) return;
        didScrollRef.current = true;
        window.requestAnimationFrame(() => {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }, [currentItemIndex, items.length]);

    const toggleDone = (id: string) => {
        setDoneIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            writeDoneSet(contentKey, next);
            return next;
        });
    };

    const doneCount = useMemo(() => {
        let n = 0;
        items.forEach((row, index) => {
            if (row.kind === 'item' && doneIds.has(itemStorageId(row, index))) n += 1;
        });
        return n;
    }, [items, doneIds]);

    const itemTotal = timedItems.length;

    return (
        <div className="space-y-5">
            {(schedule.heading || dateLabel) && (
                <header className="space-y-1">
                    {schedule.heading ? (
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-300">
                            {schedule.heading}
                        </p>
                    ) : null}
                    {dateLabel ? (
                        <p className="text-sm font-medium capitalize text-zinc-500 dark:text-zinc-400">
                            {dateLabel}
                        </p>
                    ) : null}
                </header>
            )}

            {crew.length > 0 ? (
                <section
                    aria-label="Equipe do culto"
                    className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200/90 dark:bg-zinc-900 dark:ring-zinc-700"
                >
                    <div className="flex items-center justify-between gap-2">
                        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Equipe</h2>
                        {crew.length > 4 ? (
                            <button
                                type="button"
                                onClick={() => setCrewOpen((v) => !v)}
                                className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-teal-700 hover:underline dark:text-teal-300"
                            >
                                {crewOpen ? 'Recolher' : `Ver todas (${crew.length})`}
                                {crewOpen ? (
                                    <ChevronUpIcon className="h-3.5 w-3.5" aria-hidden />
                                ) : (
                                    <ChevronDownIcon className="h-3.5 w-3.5" aria-hidden />
                                )}
                            </button>
                        ) : null}
                    </div>
                    <ul className="mt-3 space-y-2.5">
                        {visibleCrew.map((row) => (
                            <li key={`${row.role}-${row.names}`} className="min-w-0">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                                    {row.role}
                                </p>
                                <p className="text-sm font-medium leading-snug text-zinc-800 dark:text-zinc-100">
                                    {row.names}
                                </p>
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}

            {itemTotal > 0 ? (
                <p className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400">
                    Toque no ✓ para marcar o que já passou
                    {doneCount > 0 ? (
                        <span className="text-zinc-400 dark:text-zinc-500">
                            {' '}
                            · {doneCount}/{itemTotal}
                        </span>
                    ) : null}
                </p>
            ) : null}

            <section aria-label="Timeline da programação" className="space-y-2.5">
                {items.map((row, index) => {
                    if (row.kind === 'section') {
                        return (
                            <div
                                key={`section-${index}-${row.title}`}
                                className="sticky top-0 z-[1] -mx-1 px-1 py-1.5"
                            >
                                <div className="rounded-xl bg-zinc-100/95 px-3 py-2.5 text-center backdrop-blur dark:bg-zinc-800/95">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-600 dark:text-zinc-300">
                                        {row.title}
                                    </p>
                                </div>
                            </div>
                        );
                    }

                    const id = itemStorageId(row, index);
                    const done = doneIds.has(id);
                    const isNow = index === currentItemIndex;
                    const timed = timedItems.find((t) => t.index === index);
                    const isPastByClock =
                        timed != null && nowMin >= timed.endMin && !isNow;
                    const durationLabel = formatDurationLabel(row.duration ?? null);

                    return (
                        <article
                            key={`item-${index}-${row.start}-${row.title}`}
                            ref={isNow ? currentRef : undefined}
                            aria-current={isNow ? 'true' : undefined}
                            className={[
                                'relative overflow-hidden rounded-2xl p-3.5 pr-12 shadow-sm transition-colors',
                                isNow
                                    ? 'bg-teal-50 ring-2 ring-teal-500/80 dark:bg-teal-950/50 dark:ring-teal-400/70'
                                    : done
                                      ? 'bg-zinc-100/90 ring-1 ring-zinc-200/80 dark:bg-zinc-800/60 dark:ring-zinc-700/80'
                                      : isPastByClock
                                        ? 'bg-white/80 ring-1 ring-zinc-200/70 opacity-80 dark:bg-zinc-900/70 dark:ring-zinc-700/70'
                                        : 'bg-white ring-1 ring-zinc-200/90 dark:bg-zinc-900 dark:ring-zinc-700',
                            ].join(' ')}
                        >
                            {isNow ? (
                                <span className="pointer-events-none absolute left-0 top-0 h-full w-1.5 bg-teal-500 dark:bg-teal-400" />
                            ) : null}

                            <button
                                type="button"
                                onClick={() => toggleDone(id)}
                                aria-pressed={done}
                                aria-label={done ? 'Desmarcar item' : 'Marcar como já passou'}
                                title={done ? 'Desmarcar' : 'Marcar como já passou'}
                                className={[
                                    'absolute right-2.5 top-2.5 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition',
                                    done
                                        ? 'bg-teal-600 text-white shadow-sm dark:bg-teal-500'
                                        : 'bg-white text-zinc-400 ring-1 ring-zinc-200 hover:text-teal-700 hover:ring-teal-300 dark:bg-zinc-900 dark:text-zinc-500 dark:ring-zinc-600 dark:hover:text-teal-300',
                                ].join(' ')}
                            >
                                {done ? (
                                    <CheckIconSolid className="h-4 w-4" aria-hidden />
                                ) : (
                                    <CheckIcon className="h-4 w-4" aria-hidden />
                                )}
                            </button>

                            <div className="flex gap-3.5">
                                <div className="w-[4.5rem] shrink-0 pt-0.5 text-right">
                                    <p
                                        className={[
                                            'font-bold tabular-nums leading-none tracking-tight',
                                            isNow
                                                ? 'text-[1.35rem] text-teal-800 dark:text-teal-100'
                                                : done
                                                  ? 'text-[1.15rem] text-zinc-400 dark:text-zinc-500'
                                                  : 'text-[1.2rem] text-zinc-900 dark:text-zinc-50',
                                        ].join(' ')}
                                    >
                                        {formatScheduleClock(row.start)}
                                    </p>
                                    {durationLabel ? (
                                        <p
                                            className={[
                                                'mt-1.5 text-[11px] font-semibold tabular-nums',
                                                isNow
                                                    ? 'text-teal-700/90 dark:text-teal-300/90'
                                                    : 'text-zinc-400 dark:text-zinc-500',
                                            ].join(' ')}
                                        >
                                            {durationLabel}
                                        </p>
                                    ) : null}
                                    {isNow ? (
                                        <span className="mt-2 inline-flex items-center rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white dark:bg-teal-500">
                                            Agora
                                        </span>
                                    ) : null}
                                </div>

                                <div
                                    className={[
                                        'mt-1 w-px shrink-0 self-stretch',
                                        isNow
                                            ? 'bg-teal-400 dark:bg-teal-500'
                                            : 'bg-gradient-to-b from-zinc-300 via-zinc-200 to-transparent dark:from-zinc-600 dark:via-zinc-700',
                                    ].join(' ')}
                                    aria-hidden
                                />

                                <div className="min-w-0 flex-1">
                                    <h3
                                        className={[
                                            'text-[15px] font-semibold leading-snug',
                                            done
                                                ? 'text-zinc-500 line-through decoration-zinc-300 dark:text-zinc-400 dark:decoration-zinc-600'
                                                : isNow
                                                  ? 'text-zinc-950 dark:text-white'
                                                  : 'text-zinc-900 dark:text-white',
                                        ].join(' ')}
                                    >
                                        {row.title}
                                    </h3>
                                    {row.person ? (
                                        <p
                                            className={[
                                                'mt-1 text-[13px] font-medium leading-snug',
                                                done
                                                    ? 'text-zinc-400 dark:text-zinc-500'
                                                    : 'text-zinc-600 dark:text-zinc-300',
                                            ].join(' ')}
                                        >
                                            {row.person}
                                        </p>
                                    ) : null}
                                    {row.notes ? (
                                        <p
                                            className={[
                                                'mt-1.5 text-[12px] leading-relaxed',
                                                done
                                                    ? 'text-zinc-400 dark:text-zinc-500'
                                                    : 'text-zinc-500 dark:text-zinc-400',
                                            ].join(' ')}
                                        >
                                            {row.notes}
                                        </p>
                                    ) : null}
                                </div>
                            </div>
                        </article>
                    );
                })}
            </section>
        </div>
    );
}
