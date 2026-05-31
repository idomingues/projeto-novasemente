type Props = {
    isLeader: boolean;
    disabled?: boolean;
    onToggle: () => void;
};

export default function VolunteerMinistryLeaderToggle({ isLeader, disabled = false, onToggle }: Props) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggle();
            }}
            title={isLeader ? 'Remover como líder deste departamento' : 'Marcar como líder deste departamento'}
            className={`shrink-0 cursor-pointer rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-50 ${
                isLeader
                    ? 'bg-amber-200 text-amber-950 ring-1 ring-amber-400/80 hover:bg-amber-300 dark:bg-amber-900/60 dark:text-amber-100 dark:ring-amber-600'
                    : 'bg-zinc-200/80 text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600'
            }`}
        >
            {isLeader ? 'Líder' : 'Líder?'}
        </button>
    );
}
