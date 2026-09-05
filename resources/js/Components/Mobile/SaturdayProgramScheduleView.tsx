import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { useMemo, useState } from 'react';

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
};

function formatClock(raw: string): string {
    const parts = raw.trim().split(':');
    if (parts.length >= 2) {
        const h = String(Number(parts[0]));
        const m = parts[1].padStart(2, '0');
        if (parts.length === 3 && parts[2] !== '00') {
            return `${h}h${m}:${parts[2].padStart(2, '0')}`;
        }
        return m === '00' ? `${h}h` : `${h}h${m}`;
    }
    return raw;
}

export default function SaturdayProgramScheduleView({ schedule, fallbackDateLabel = null }: Props) {
    const crew = schedule.crew ?? [];
    const items = schedule.items ?? [];
    const [crewOpen, setCrewOpen] = useState(false);

    const visibleCrew = useMemo(() => (crewOpen ? crew : crew.slice(0, 4)), [crew, crewOpen]);
    const dateLabel = schedule.date_label?.trim() || fallbackDateLabel || null;

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
                        <p className="text-sm font-medium capitalize text-zinc-500 dark:text-zinc-400">{dateLabel}</p>
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

            <section aria-label="Timeline da programação" className="space-y-2">
                {items.map((row, index) => {
                    if (row.kind === 'section') {
                        return (
                            <div
                                key={`section-${index}-${row.title}`}
                                className="sticky top-0 z-[1] -mx-1 px-1 py-2"
                            >
                                <div className="rounded-xl bg-zinc-100/95 px-3 py-2 text-center backdrop-blur dark:bg-zinc-800/95">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-600 dark:text-zinc-300">
                                        {row.title}
                                    </p>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <article
                            key={`item-${index}-${row.start}-${row.title}`}
                            className="flex gap-3 rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-zinc-200/90 dark:bg-zinc-900 dark:ring-zinc-700"
                        >
                            <div className="w-[3.6rem] shrink-0 pt-0.5 text-right">
                                <p className="text-sm font-bold tabular-nums leading-none text-teal-800 dark:text-teal-200">
                                    {formatClock(row.start)}
                                </p>
                                {row.duration ? (
                                    <p className="mt-1 text-[10px] font-medium tabular-nums text-zinc-400 dark:text-zinc-500">
                                        {row.duration}
                                    </p>
                                ) : null}
                            </div>
                            <div
                                className="mt-1 w-px shrink-0 self-stretch bg-gradient-to-b from-teal-300 via-zinc-200 to-transparent dark:from-teal-700 dark:via-zinc-700"
                                aria-hidden
                            />
                            <div className="min-w-0 flex-1">
                                <h3 className="text-[15px] font-semibold leading-snug text-zinc-900 dark:text-white">
                                    {row.title}
                                </h3>
                                {row.person ? (
                                    <p className="mt-1 text-[13px] font-medium leading-snug text-zinc-600 dark:text-zinc-300">
                                        {row.person}
                                    </p>
                                ) : null}
                                {row.notes ? (
                                    <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                                        {row.notes}
                                    </p>
                                ) : null}
                            </div>
                        </article>
                    );
                })}
            </section>
        </div>
    );
}
