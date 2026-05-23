interface Props {
    raisedAmount: number;
    goalAmount: number;
    remainingAmount?: number;
    progressPercent?: number;
    size?: 'sm' | 'md';
}

function formatBrl(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function DonationProgressBar({
    raisedAmount,
    goalAmount,
    remainingAmount,
    progressPercent,
    size = 'md',
}: Props) {
    const remaining = remainingAmount ?? Math.max(0, goalAmount - raisedAmount);
    const percent = progressPercent ?? (goalAmount > 0 ? Math.min(100, Math.floor((raisedAmount / goalAmount) * 100)) : 0);
    const barHeight = size === 'sm' ? 'h-2' : 'h-3';

    return (
        <div className="space-y-2">
            <div
                className={`w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800 ${barHeight}`}
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progresso da campanha"
            >
                <div
                    className={`${barHeight} rounded-full bg-emerald-500 transition-all duration-500`}
                    style={{ width: `${percent}%` }}
                />
            </div>
            <div className={`grid gap-2 ${size === 'sm' ? 'text-xs' : 'text-sm'} text-zinc-600 dark:text-zinc-400`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                        <strong className="text-zinc-900 dark:text-white">{formatBrl(raisedAmount)}</strong> arrecadados
                    </span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{percent}%</span>
                </div>
                <p>
                    Meta: {formatBrl(goalAmount)} · Faltam {formatBrl(remaining)}
                </p>
            </div>
        </div>
    );
}
