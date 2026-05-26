import { ListBulletIcon, ViewColumnsIcon } from '@heroicons/react/24/outline';
import type { ListKanbanViewMode } from '@/utils/persistedViewMode';

type Props = {
    value: ListKanbanViewMode;
    onChange: (mode: ListKanbanViewMode) => void;
    className?: string;
};

export default function ListViewModeToggle({ value, onChange, className = '' }: Props) {
    return (
        <div
            className={`inline-flex rounded-xl border border-zinc-200 bg-white p-0.5 dark:border-zinc-700 dark:bg-zinc-900 ${className}`}
            role="group"
            aria-label="Modo de visualização"
        >
            <button
                type="button"
                onClick={() => onChange('list')}
                className={`rounded-lg p-2 ${
                    value === 'list' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'text-zinc-500'
                }`}
                title="Lista"
                aria-label="Visualização em lista"
                aria-pressed={value === 'list'}
            >
                <ListBulletIcon className="h-5 w-5" />
            </button>
            <button
                type="button"
                onClick={() => onChange('kanban')}
                className={`rounded-lg p-2 ${
                    value === 'kanban' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'text-zinc-500'
                }`}
                title="Kanban"
                aria-label="Visualização em kanban"
                aria-pressed={value === 'kanban'}
            >
                <ViewColumnsIcon className="h-5 w-5" />
            </button>
        </div>
    );
}
