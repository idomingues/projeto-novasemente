import type { RecordDetailSection } from '@/types/recordDetail';
import RecordDetailAnswer from '@/Components/RecordDetail/RecordDetailAnswer';

export default function RecordDetailSections({ sections }: { sections: RecordDetailSection[] }) {
    return (
        <div className="space-y-3">
            {sections.map((section) => (
                <section
                    key={section.title}
                    className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-zinc-50/50 shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900/40"
                >
                    <h3 className="border-b border-zinc-200/90 bg-teal-600/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-teal-900 dark:border-zinc-700 dark:bg-teal-500/10 dark:text-teal-200">
                        {section.title}
                    </h3>
                    <dl className="grid gap-2 p-3 sm:grid-cols-2 sm:gap-2.5">
                        {section.rows.map((row) => (
                            <RecordDetailAnswer key={`${section.title}-${row.label}`} label={row.label} value={row.value} />
                        ))}
                    </dl>
                </section>
            ))}
        </div>
    );
}
