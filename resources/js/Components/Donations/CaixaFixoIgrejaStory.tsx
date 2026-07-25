import {
    CAIXA_FIXO_ANNUAL_LINES,
    CAIXA_FIXO_ANNUAL_YEAR,
    CAIXA_FIXO_CLOSING,
    CAIXA_FIXO_COST_ITEMS,
    CAIXA_FIXO_EXECUTIVE_SUMMARY,
    CAIXA_FIXO_INTRO,
    CAIXA_FIXO_MONTHLY_TOTAL,
    type AnnualLineTone,
    type CostBarTone,
} from '@/data/caixaFixoIgrejaStory';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import {
    BuildingLibraryIcon,
    ChartBarIcon,
    HeartIcon,
} from '@heroicons/react/24/outline';

function formatBrl(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatPercent(value: number): string {
    return value.toLocaleString('pt-BR', {
        minimumFractionDigits: value % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
    });
}

const barToneClass: Record<CostBarTone, string> = {
    sky: 'bg-sky-500 dark:bg-sky-400',
    emerald: 'bg-emerald-500 dark:bg-emerald-400',
    amber: 'bg-amber-500 dark:bg-amber-400',
    violet: 'bg-violet-500 dark:bg-violet-400',
    orange: 'bg-orange-500 dark:bg-orange-400',
    stone: 'bg-stone-500 dark:bg-stone-400',
    zinc: 'bg-zinc-400 dark:bg-zinc-500',
    cyan: 'bg-cyan-500 dark:bg-cyan-400',
    yellow: 'bg-yellow-400 dark:bg-yellow-300',
    lime: 'bg-lime-500 dark:bg-lime-400',
    blue: 'bg-blue-500 dark:bg-blue-400',
    rose: 'bg-rose-500 dark:bg-rose-400',
    indigo: 'bg-indigo-500 dark:bg-indigo-400',
    red: 'bg-red-500 dark:bg-red-400',
};

const annualToneClass: Record<
    AnnualLineTone,
    { row: string; amount: string; bar: string }
> = {
    emerald: {
        row: 'bg-emerald-50 dark:bg-emerald-950/50',
        amount: 'text-emerald-900 dark:text-emerald-100',
        bar: 'bg-emerald-500',
    },
    sky: {
        row: 'bg-sky-50 dark:bg-sky-950/50',
        amount: 'text-sky-900 dark:text-sky-100',
        bar: 'bg-sky-500',
    },
    amber: {
        row: 'bg-amber-50 dark:bg-amber-950/40',
        amount: 'text-amber-950 dark:text-amber-100',
        bar: 'bg-amber-500',
    },
    orange: {
        row: 'bg-orange-50 dark:bg-orange-950/40',
        amount: 'text-orange-950 dark:text-orange-100',
        bar: 'bg-orange-500',
    },
    brand: {
        row: 'bg-brand-600 dark:bg-brand-700',
        amount: 'text-white',
        bar: 'bg-white/80',
    },
};

export default function CaixaFixoIgrejaStory() {
    const mainCosts = CAIXA_FIXO_COST_ITEMS.filter((item) => !item.compact);
    const compactCosts = CAIXA_FIXO_COST_ITEMS.filter((item) => item.compact);

    return (
        <div className="space-y-5">
            <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
                <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-200">
                        <BuildingLibraryIcon className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                        <h2 className="text-lg font-semibold leading-snug text-zinc-900 dark:text-white">
                            {CAIXA_FIXO_INTRO.title}
                        </h2>
                        <div className="mt-3 space-y-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                            {CAIXA_FIXO_INTRO.paragraphs.map((paragraph) => (
                                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-sky-50 dark:border-brand-900/60 dark:from-brand-950/50 dark:via-zinc-900 dark:to-sky-950/30">
                <div className="border-b border-brand-100 px-4 py-4 dark:border-brand-900/40 sm:px-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
                        Como são distribuídos os custos fixos mensais?
                    </p>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Custo fixo mensal total</p>
                    <p className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                        {formatBrl(CAIXA_FIXO_MONTHLY_TOTAL)}
                    </p>
                </div>

                <div className="space-y-4 p-4 sm:p-5">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white">
                        <ChartBarIcon className="h-4 w-4 text-brand-600 dark:text-brand-400" aria-hidden />
                        Distribuição dos principais custos
                    </h3>

                    <ul className="space-y-3.5">
                        {mainCosts.map((item) => (
                            <li key={item.label}>
                                <div className="mb-1.5 flex items-end justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{item.label}</p>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                            {formatPercent(item.percent)}%
                                        </p>
                                    </div>
                                    <p className="shrink-0 text-sm font-semibold tabular-nums text-zinc-900 dark:text-white">
                                        {formatBrl(item.amount)}
                                    </p>
                                </div>
                                <div className="h-2.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                                    <div
                                        className={`h-full rounded-full ${barToneClass[item.tone]}`}
                                        style={{ width: `${Math.max(item.percent, 1.5)}%` }}
                                        role="presentation"
                                    />
                                </div>
                            </li>
                        ))}
                    </ul>

                    <ul className="space-y-2 border-t border-zinc-200 pt-3 dark:border-zinc-700">
                        {compactCosts.map((item) => (
                            <li
                                key={item.label}
                                className="flex items-center justify-between gap-3 text-sm text-zinc-700 dark:text-zinc-300"
                            >
                                <span className="flex min-w-0 items-center gap-2">
                                    <span
                                        className={`h-2 w-2 shrink-0 rounded-full ${barToneClass[item.tone]}`}
                                        aria-hidden
                                    />
                                    <span className="truncate">
                                        {item.label}
                                        <span className="text-zinc-500 dark:text-zinc-400">
                                            {' '}
                                            — {formatPercent(item.percent)}%
                                        </span>
                                    </span>
                                </span>
                                <span className="shrink-0 font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                                    {formatBrl(item.amount)}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Resumo executivo</h3>
                <ul className="mt-3 space-y-2.5">
                    {CAIXA_FIXO_EXECUTIVE_SUMMARY.map((item) => (
                        <li key={item.slice(0, 32)} className="flex gap-2.5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                            <CheckCircleIcon
                                className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400"
                                aria-hidden
                            />
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            </section>

            <section className="overflow-hidden rounded-2xl border border-sky-200 shadow-sm dark:border-sky-900/50">
                <div className="bg-gradient-to-br from-sky-700 to-sky-800 px-4 py-4 dark:from-sky-800 dark:to-sky-950 sm:px-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-sky-100">Transparência financeira</p>
                    <h3 className="mt-0.5 text-lg font-bold text-white">Saldo anual {CAIXA_FIXO_ANNUAL_YEAR}</h3>
                    <p className="mt-1 text-sm text-sky-100/90">
                        Movimentação do caixa da Oferta Nova Semente ao longo de {CAIXA_FIXO_ANNUAL_YEAR}.
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-2 border-b border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-4 sm:gap-3 sm:p-4">
                    {CAIXA_FIXO_ANNUAL_LINES.filter((line) => !line.emphasize).map((line) => (
                        <div
                            key={`chip-${line.label}`}
                            className={`rounded-xl px-3 py-2.5 ${annualToneClass[line.tone].row}`}
                        >
                            <p className="text-[11px] font-medium leading-tight text-zinc-600 dark:text-zinc-300">
                                {line.label}
                            </p>
                            <p className={`mt-1 text-sm font-bold tabular-nums leading-tight ${annualToneClass[line.tone].amount}`}>
                                {formatBrl(line.amount)}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="divide-y divide-zinc-200/80 dark:divide-zinc-800">
                    {CAIXA_FIXO_ANNUAL_LINES.map((line) => {
                        const tone = annualToneClass[line.tone];
                        const isEmphasized = Boolean(line.emphasize);

                        return (
                            <div
                                key={line.label}
                                className={`flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5 ${tone.row} ${
                                    isEmphasized ? 'py-4' : ''
                                }`}
                            >
                                <div className="flex min-w-0 items-center gap-2.5">
                                    {!isEmphasized && (
                                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${tone.bar}`} aria-hidden />
                                    )}
                                    <div className="min-w-0">
                                        <span
                                            className={`text-sm font-medium ${
                                                isEmphasized ? 'text-white' : 'text-zinc-800 dark:text-zinc-100'
                                            }`}
                                        >
                                            {line.label}
                                        </span>
                                        {line.flow && (
                                            <span
                                                className={`ml-2 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                                    line.flow === 'out'
                                                        ? 'bg-amber-200/80 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100'
                                                        : 'bg-emerald-200/80 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-100'
                                                }`}
                                            >
                                                {line.flow === 'out' ? 'Saída' : 'Entrada'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <span
                                    className={`shrink-0 text-sm font-bold tabular-nums sm:text-base ${tone.amount} ${
                                        isEmphasized ? 'text-lg sm:text-xl' : ''
                                    }`}
                                >
                                    {formatBrl(line.amount)}
                                </span>
                            </div>
                        );
                    })}
                </div>
                <p className="bg-zinc-50 px-4 py-3 text-xs leading-relaxed text-zinc-600 dark:bg-zinc-950/60 dark:text-zinc-400 sm:px-5">
                    O saldo atual considera o saldo inicial, as ofertas recebidas em {CAIXA_FIXO_ANNUAL_YEAR}, as
                    despesas do período e o repasse à AP Construção.
                </p>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
                <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-200">
                        <HeartIcon className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                        <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
                            {CAIXA_FIXO_CLOSING.title}
                        </h3>
                        <div className="mt-3 space-y-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                            {CAIXA_FIXO_CLOSING.paragraphs.map((paragraph) => (
                                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                            ))}
                        </div>
                        <blockquote className="mt-4 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/30">
                            <p className="text-sm italic leading-relaxed text-amber-950 dark:text-amber-100">
                                &ldquo;{CAIXA_FIXO_CLOSING.verse.text}&rdquo;
                            </p>
                            <footer className="mt-2 text-xs font-semibold text-amber-800 dark:text-amber-200">
                                {CAIXA_FIXO_CLOSING.verse.reference}
                            </footer>
                        </blockquote>
                    </div>
                </div>
            </section>
        </div>
    );
}
