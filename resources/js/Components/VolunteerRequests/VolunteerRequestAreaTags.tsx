import type { VolunteerRequestAreaTag } from '@/utils/volunteerRequestAreas';

type Props = {
    tags: VolunteerRequestAreaTag[];
    selectedArea: string | null;
    onSelect: (area: string) => void;
};

export default function VolunteerRequestAreaTags({ tags, selectedArea, onSelect }: Props) {
    if (tags.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar por área">
            {tags.map(({ area, count }) => {
                const isActive = selectedArea === area;
                return (
                    <button
                        key={area}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onSelect(area)}
                        className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                            isActive
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-100'
                                : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-800'
                        }`}
                    >
                        <span className="max-w-[12rem] truncate sm:max-w-none">{area}</span>
                        <span
                            className={`inline-flex min-w-[1.375rem] items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-bold tabular-nums ${
                                isActive
                                    ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                                    : count > 0
                                      ? 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100'
                                      : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500'
                            }`}
                        >
                            {count}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
