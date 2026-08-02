import {
    DEVOTIONAL_AUDIENCE_OPTIONS,
    type DevotionalAudience,
} from '@/data/devotionalAudience';

type Props = {
    value: DevotionalAudience;
    onChange: (audience: DevotionalAudience) => void;
    /** compact = chips no card da home; default = segment control na página */
    size?: 'default' | 'compact';
    className?: string;
    disabled?: boolean;
};

function btnClass(active: boolean, size: 'default' | 'compact'): string {
    if (size === 'compact') {
        return [
            'min-w-0 flex-1 cursor-pointer touch-manipulation rounded-lg px-1.5 py-1.5 text-center text-[10px] font-semibold leading-tight transition',
            active
                ? 'bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200/90 dark:bg-zinc-800 dark:text-zinc-50 dark:ring-zinc-600'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100',
        ].join(' ');
    }

    return [
        'min-w-0 flex-1 cursor-pointer touch-manipulation rounded-xl px-3 py-2.5 text-center text-sm font-semibold transition',
        active
            ? 'bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200/90 dark:bg-zinc-800 dark:text-zinc-50 dark:ring-zinc-600'
            : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100',
    ].join(' ');
}

/**
 * Seletor Adulto / Mulher / Jovem para o devocional diário.
 */
export default function MeditationAudiencePicker({
    value,
    onChange,
    size = 'default',
    className = '',
    disabled = false,
}: Props) {
    return (
        <div
            role="tablist"
            aria-label="Público do devocional"
            className={[
                size === 'compact'
                    ? 'inline-flex w-full gap-0.5 rounded-xl bg-zinc-100/90 p-0.5 ring-1 ring-zinc-200/80 dark:bg-zinc-950/60 dark:ring-zinc-700'
                    : 'inline-flex w-full gap-1 rounded-2xl bg-zinc-100 p-1 ring-1 ring-zinc-200/90 dark:bg-zinc-950/50 dark:ring-zinc-700',
                className,
            ]
                .filter(Boolean)
                .join(' ')}
        >
            {DEVOTIONAL_AUDIENCE_OPTIONS.map((opt) => {
                const active = value === opt.value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        disabled={disabled}
                        className={`${btnClass(active, size)} disabled:cursor-not-allowed disabled:opacity-50`}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onChange(opt.value);
                        }}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}
