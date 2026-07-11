/**
 * Agenda semanal em cards — UX premium para a página Horários.
 * Mantém a hierarquia tipográfica da agenda institucional (horário em destaque, título, corpo).
 */
export type WeeklyProgramScheduleItem = {
    id?: number;
    when: string;
    when_label?: string;
    display_time?: string | null;
    title: string | null;
    body: string | null;
    lines: string[] | null;
    day_of_week?: number;
    day_name?: string;
    home_message?: string | null;
};

interface Props {
    churchName?: string | null;
    items: WeeklyProgramScheduleItem[];
}

function dayShort(dayName?: string): string {
    if (!dayName) {
        return '';
    }
    const map: Record<string, string> = {
        Domingo: 'Dom',
        Segunda: 'Seg',
        Terça: 'Ter',
        Quarta: 'Qua',
        Quinta: 'Qui',
        Sexta: 'Sex',
        Sábado: 'Sáb',
    };
    return map[dayName] ?? dayName.slice(0, 3);
}

function timeHero(item: WeeklyProgramScheduleItem): string {
    const raw =
        item.display_time && item.display_time.trim() !== ''
            ? item.display_time.trim()
            : (() => {
                  const label = (item.when_label || item.when || '').trim();
                  return label.replace(/^(DOM|SEG|TER|QUA|QUI|SEX|SÁB|SAB)\s+/i, '').trim() || label;
              })();

    // 20:00 → 20h · 09:30 → 9h30 (tom da marca)
    const clock = raw.match(/^(\d{1,2}):(\d{2})$/);
    if (clock) {
        const hour = String(Number(clock[1]));
        return clock[2] === '00' ? `${hour}h` : `${hour}h${clock[2]}`;
    }

    return raw;
}

export default function WeeklyProgramSchedule({ churchName, items }: Props) {
    if (items.length === 0) {
        return (
            <section
                className="rounded-[1.75rem] border border-zinc-200/80 bg-white px-6 py-14 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                aria-label="Agenda semanal"
            >
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
                    Agenda semanal
                </p>
                <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                    Nenhuma programação cadastrada ainda.
                </p>
            </section>
        );
    }

    const groups = items.reduce<Array<{ dayKey: string; dayName: string; items: WeeklyProgramScheduleItem[] }>>(
        (acc, item) => {
            const dayName = item.day_name || 'Programação';
            const dayKey = String(item.day_of_week ?? dayName);
            const existing = acc.find((g) => g.dayKey === dayKey);
            if (existing) {
                existing.items.push(item);
            } else {
                acc.push({ dayKey, dayName, items: [item] });
            }
            return acc;
        },
        [],
    );

    return (
        <div className="space-y-8" aria-label="Agenda semanal">
            <div className="text-center">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
                    Agenda semanal
                </p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                    Momentos fixos para viver a fé em comunidade
                </p>
            </div>

            <div className="space-y-7">
                {groups.map((group) => (
                    <section key={group.dayKey} className="space-y-3" aria-labelledby={`day-${group.dayKey}`}>
                        <div className="flex items-center gap-3 px-1">
                            <span
                                id={`day-${group.dayKey}`}
                                className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-brand-700 dark:text-brand-400"
                            >
                                {group.dayName}
                            </span>
                            <span className="h-px flex-1 bg-gradient-to-r from-brand-200/80 to-transparent dark:from-brand-800/60" aria-hidden />
                        </div>

                        <ul className="space-y-3">
                            {group.items.map((item, index) => {
                                const hero = timeHero(item);
                                const key = item.id ?? `${group.dayKey}-${index}`;

                                return (
                                    <li key={key}>
                                        <article className="group relative overflow-hidden rounded-[1.35rem] border border-zinc-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] transition duration-300 hover:border-brand-200/80 hover:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_16px_32px_-12px_rgba(0,141,54,0.18)] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none dark:hover:border-brand-800">
                                            <div
                                                className="absolute inset-y-3 left-0 w-[3px] rounded-full bg-gradient-to-b from-brand-400 via-brand-600 to-brand-700 opacity-90 dark:from-brand-500 dark:via-brand-400 dark:to-brand-600"
                                                aria-hidden
                                            />
                                            <div
                                                className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-brand-50/80 blur-2xl transition duration-500 group-hover:bg-brand-100/90 dark:bg-brand-950/40 dark:group-hover:bg-brand-900/50"
                                                aria-hidden
                                            />

                                            <div className="relative grid gap-4 px-5 py-5 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-6 sm:px-6 sm:py-6">
                                                <div className="flex flex-row items-end justify-between gap-3 sm:flex-col sm:items-start sm:justify-start">
                                                    <div>
                                                        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">
                                                            {dayShort(group.dayName)}
                                                        </p>
                                                        <p className="mt-1 text-[1.65rem] font-extrabold leading-none tracking-tight text-brand-700 tabular-nums dark:text-brand-300 sm:text-[1.85rem]">
                                                            {hero}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="min-w-0 border-t border-zinc-100 pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0 dark:border-zinc-800">
                                                    {item.title ? (
                                                        <h3 className="text-[0.95rem] font-semibold uppercase tracking-[0.08em] text-zinc-900 dark:text-white sm:text-base">
                                                            {item.title}
                                                        </h3>
                                                    ) : null}

                                                    {item.body ? (
                                                        <p
                                                            className={`text-[0.925rem] leading-relaxed text-zinc-600 dark:text-zinc-400 ${
                                                                item.title ? 'mt-2.5' : ''
                                                            }`}
                                                        >
                                                            {item.body}
                                                        </p>
                                                    ) : null}

                                                    {item.lines && item.lines.length > 0 ? (
                                                        <ul className={`space-y-2.5 ${item.title || item.body ? 'mt-3.5' : ''}`}>
                                                            {item.lines.map((line) => (
                                                                <li
                                                                    key={line}
                                                                    className="flex items-start gap-2.5 text-sm font-semibold uppercase leading-snug tracking-[0.04em] text-zinc-800 dark:text-zinc-200"
                                                                >
                                                                    <span
                                                                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500 dark:bg-brand-400"
                                                                        aria-hidden
                                                                    />
                                                                    <span>{line}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : null}

                                                    {item.home_message && !item.body ? (
                                                        <p className="mt-3 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                                                            {item.home_message}
                                                        </p>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </article>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                ))}
            </div>

            {churchName ? (
                <p className="text-center text-xs font-medium tracking-wide text-zinc-400 dark:text-zinc-500">
                    {churchName}
                </p>
            ) : null}
        </div>
    );
}
