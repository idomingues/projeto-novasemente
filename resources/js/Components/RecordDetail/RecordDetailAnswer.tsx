export default function RecordDetailAnswer({ label, value }: { label: string; value: string }) {
    const numbered = label.match(/^(\d+)\.\s*(.+)$/);
    const number = numbered?.[1];
    const question = numbered?.[2] ?? label;
    const isEmpty = value === '—';

    return (
        <div className="rounded-xl border border-zinc-200/80 bg-white p-3 dark:border-zinc-700/80 dark:bg-zinc-950/40">
            <dt className="flex items-start gap-2.5">
                {number ? (
                    <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-600 text-[11px] font-bold text-white dark:bg-teal-500"
                        aria-hidden
                    >
                        {number}
                    </span>
                ) : null}
                <span className="min-w-0 pt-0.5 text-[11px] font-semibold uppercase leading-snug tracking-wide text-zinc-500 dark:text-zinc-400">
                    {question}
                </span>
            </dt>
            <dd
                className={[
                    number ? 'mt-2 pl-8' : 'mt-1.5',
                    'whitespace-pre-wrap text-sm leading-relaxed',
                    isEmpty
                        ? 'italic text-zinc-400 dark:text-zinc-500'
                        : 'font-medium text-zinc-900 dark:text-zinc-50',
                ].join(' ')}
            >
                {value}
            </dd>
        </div>
    );
}
