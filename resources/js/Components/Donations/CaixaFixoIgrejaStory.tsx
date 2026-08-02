import {
    CAIXA_FIXO_CLOSING,
    CAIXA_FIXO_EXECUTIVE_SUMMARY,
    CAIXA_FIXO_HERO_IMAGE,
    CAIXA_FIXO_INTRO,
    defaultCaixaFixoStoryFinancial,
    type AnnualLine,
    type AnnualLineTone,
    type CaixaFixoStoryFinancial,
    type CostBarTone,
    type CostItem,
} from '@/data/caixaFixoIgrejaStory';
import { parseMoneyInput, parseSignedMoneyInput } from '@/lib/pixPayload';
import PrimaryButton from '@/Components/PrimaryButton';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { ChartBarIcon, HeartIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

function formatBrl(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatMoneyFieldValue(value: number): string {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatSignedMoneyFieldValue(value: number): string {
    const abs = formatMoneyFieldValue(Math.abs(value));
    return value < 0 ? `-${abs}` : abs;
}

function formatPercent(value: number): string {
    return value.toLocaleString('pt-BR', {
        minimumFractionDigits: value % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
    });
}

function withRecalculatedPercents(story: CaixaFixoStoryFinancial): CaixaFixoStoryFinancial {
    const total = story.monthly_total;
    return {
        ...story,
        cost_items: story.cost_items.map((item) => ({
            ...item,
            percent: total > 0 ? Math.round((item.amount / total) * 10000) / 100 : 0,
        })),
    };
}

function resolveStory(initial?: CaixaFixoStoryFinancial | null): CaixaFixoStoryFinancial {
    if (!initial) {
        return defaultCaixaFixoStoryFinancial();
    }
    return withRecalculatedPercents({
        monthly_total: initial.monthly_total,
        cost_items: initial.cost_items.map((item) => ({ ...item })),
        annual_year: initial.annual_year,
        annual_lines: initial.annual_lines.map((line) => ({ ...line })),
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
    { chip: string; amount: string; bar: string }
> = {
    emerald: {
        chip: 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900',
        amount: 'text-zinc-900 dark:text-zinc-50',
        bar: 'bg-emerald-500',
    },
    sky: {
        chip: 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900',
        amount: 'text-zinc-900 dark:text-zinc-50',
        bar: 'bg-sky-500',
    },
    amber: {
        chip: 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900',
        amount: 'text-zinc-900 dark:text-zinc-50',
        bar: 'bg-amber-500',
    },
    orange: {
        chip: 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900',
        amount: 'text-zinc-900 dark:text-zinc-50',
        bar: 'bg-orange-500',
    },
    brand: {
        chip: 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-800 dark:bg-emerald-950/40',
        amount: 'text-emerald-900 dark:text-emerald-100',
        bar: 'bg-emerald-600 dark:bg-emerald-400',
    },
};

const moneyInputClass =
    'w-full min-w-[7.5rem] max-w-[11rem] cursor-text rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-right text-sm font-semibold tabular-nums text-zinc-900 shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-brand-500 dark:focus:ring-brand-900/50';

const moneyInputLargeClass =
    'mt-1 w-full max-w-xs cursor-text rounded-xl border border-brand-200 bg-white px-3 py-2 text-2xl font-bold tracking-tight tabular-nums text-zinc-900 shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200 dark:border-brand-800 dark:bg-zinc-950 dark:text-white dark:focus:border-brand-500 dark:focus:ring-brand-900/50 sm:text-3xl';

type MoneyFieldProps = {
    id: string;
    value: number;
    signed?: boolean;
    large?: boolean;
    'aria-label': string;
    onCommit: (value: number) => void;
};

function MoneyField({ id, value, signed = false, large = false, onCommit, ...aria }: MoneyFieldProps) {
    const [draft, setDraft] = useState(() =>
        signed ? formatSignedMoneyFieldValue(value) : formatMoneyFieldValue(value),
    );

    useEffect(() => {
        setDraft(signed ? formatSignedMoneyFieldValue(value) : formatMoneyFieldValue(value));
    }, [value, signed]);

    return (
        <input
            id={id}
            type="text"
            inputMode="decimal"
            aria-label={aria['aria-label']}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
                const parsed = signed ? parseSignedMoneyInput(draft) : parseMoneyInput(draft);
                if (parsed === null) {
                    setDraft(signed ? formatSignedMoneyFieldValue(value) : formatMoneyFieldValue(value));
                    return;
                }
                onCommit(parsed);
                setDraft(signed ? formatSignedMoneyFieldValue(parsed) : formatMoneyFieldValue(parsed));
            }}
            className={large ? moneyInputLargeClass : moneyInputClass}
        />
    );
}

type Props = {
    story?: CaixaFixoStoryFinancial | null;
    editable?: boolean;
    saving?: boolean;
    onChange?: (story: CaixaFixoStoryFinancial) => void;
    onSave?: (story: CaixaFixoStoryFinancial) => void;
};

export default function CaixaFixoIgrejaStory({
    story: storyProp = null,
    editable = false,
    saving = false,
    onChange,
    onSave,
}: Props) {
    const [story, setStory] = useState<CaixaFixoStoryFinancial>(() => resolveStory(storyProp));

    useEffect(() => {
        setStory(resolveStory(storyProp));
    }, [storyProp]);

    function commitStory(next: CaixaFixoStoryFinancial) {
        setStory(next);
        onChange?.(next);
    }

    function updateMonthlyTotal(amount: number) {
        commitStory(withRecalculatedPercents({ ...story, monthly_total: amount }));
    }

    function updateCostAmount(index: number, amount: number) {
        const cost_items = story.cost_items.map((item, i) => (i === index ? { ...item, amount } : item));
        commitStory(withRecalculatedPercents({ ...story, cost_items }));
    }

    function updateAnnualAmount(index: number, amount: number) {
        commitStory({
            ...story,
            annual_lines: story.annual_lines.map((line, i) => (i === index ? { ...line, amount } : line)),
        });
    }

    const mainCosts = story.cost_items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => !item.compact);
    const compactCosts = story.cost_items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.compact);

    function renderCostAmount(item: CostItem, index: number, className?: string) {
        if (editable) {
            return (
                <MoneyField
                    id={`caixa-fixo-cost-${index}`}
                    value={item.amount}
                    aria-label={`Valor de ${item.label}`}
                    onCommit={(value) => updateCostAmount(index, value)}
                />
            );
        }
        return (
            <p className={className ?? 'shrink-0 text-sm font-semibold tabular-nums text-zinc-900 dark:text-white'}>
                {formatBrl(item.amount)}
            </p>
        );
    }

    function renderAnnualAmount(line: AnnualLine, index: number, className: string) {
        if (editable) {
            return (
                <MoneyField
                    id={`caixa-fixo-annual-${index}`}
                    value={line.amount}
                    signed
                    aria-label={`Valor de ${line.label}`}
                    onCommit={(value) => updateAnnualAmount(index, value)}
                />
            );
        }
        return <span className={className}>{formatBrl(line.amount)}</span>;
    }

    return (
        <div className="space-y-5">
            <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="relative aspect-[16/10] w-full sm:aspect-[21/9]">
                    <img
                        src={CAIXA_FIXO_HERO_IMAGE}
                        alt="Igreja Nova Semente — casa de culto e missão"
                        className="absolute inset-0 h-full w-full object-cover object-center"
                    />
                    <div
                        className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/55 to-zinc-950/10"
                        aria-hidden
                    />
                    <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-100/90">
                            {CAIXA_FIXO_INTRO.eyebrow}
                        </p>
                        <h2 className="mt-1.5 max-w-xl text-xl font-semibold leading-snug text-white sm:text-2xl">
                            {CAIXA_FIXO_INTRO.title}
                        </h2>
                    </div>
                </div>
                <div className="space-y-3 p-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300 sm:p-5">
                    {CAIXA_FIXO_INTRO.paragraphs.map((paragraph) => (
                        <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                    ))}
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-sky-50 dark:border-brand-900/60 dark:from-brand-950/50 dark:via-zinc-900 dark:to-sky-950/30">
                <div className="border-b border-brand-100 px-4 py-4 dark:border-brand-900/40 sm:px-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
                        Como são distribuídos os custos fixos mensais?
                    </p>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Custo fixo mensal total</p>
                    {editable ? (
                        <MoneyField
                            id="caixa-fixo-monthly-total"
                            value={story.monthly_total}
                            large
                            aria-label="Custo fixo mensal total"
                            onCommit={updateMonthlyTotal}
                        />
                    ) : (
                        <p className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                            {formatBrl(story.monthly_total)}
                        </p>
                    )}
                </div>

                <div className="space-y-4 p-4 sm:p-5">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white">
                        <ChartBarIcon className="h-4 w-4 text-brand-600 dark:text-brand-400" aria-hidden />
                        Distribuição dos principais custos
                    </h3>

                    <ul className="space-y-3.5">
                        {mainCosts.map(({ item, index }) => (
                            <li key={item.label}>
                                <div className="mb-1.5 flex items-end justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{item.label}</p>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                            {formatPercent(item.percent)}%
                                        </p>
                                    </div>
                                    {renderCostAmount(item, index)}
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
                        {compactCosts.map(({ item, index }) => (
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
                                {renderCostAmount(
                                    item,
                                    index,
                                    'shrink-0 font-medium tabular-nums text-zinc-900 dark:text-zinc-100',
                                )}
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

            <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="border-b border-zinc-100 px-4 py-4 dark:border-zinc-800 sm:px-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                        Transparência financeira
                    </p>
                    <h3 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">
                        Saldo anual {story.annual_year}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Movimentação do caixa da Oferta Nova Semente ao longo de {story.annual_year}.
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-2 border-b border-zinc-100 p-3 dark:border-zinc-800 sm:grid-cols-4 sm:gap-3 sm:p-4">
                    {story.annual_lines
                        .filter((line) => !line.emphasize)
                        .map((line) => (
                            <div
                                key={`chip-${line.label}`}
                                className={`rounded-xl border px-3 py-2.5 ${annualToneClass[line.tone].chip}`}
                            >
                                <p className="text-[11px] font-medium leading-tight text-zinc-500 dark:text-zinc-400">
                                    {line.label}
                                </p>
                                <p
                                    className={`mt-1 text-sm font-semibold tabular-nums leading-tight ${annualToneClass[line.tone].amount}`}
                                >
                                    {formatBrl(line.amount)}
                                </p>
                            </div>
                        ))}
                </div>

                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {story.annual_lines.map((line, index) => {
                        const tone = annualToneClass[line.tone];
                        const isEmphasized = Boolean(line.emphasize);

                        return (
                            <div
                                key={line.label}
                                className={`flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5 ${
                                    isEmphasized
                                        ? 'border-t border-emerald-100 bg-emerald-50/60 py-4 dark:border-emerald-900/50 dark:bg-emerald-950/30'
                                        : 'bg-white dark:bg-zinc-900'
                                }`}
                            >
                                <div className="flex min-w-0 items-center gap-2.5">
                                    <span className={`h-2 w-2 shrink-0 rounded-full ${tone.bar}`} aria-hidden />
                                    <div className="min-w-0">
                                        <span
                                            className={`text-sm font-medium ${
                                                isEmphasized
                                                    ? 'text-emerald-950 dark:text-emerald-50'
                                                    : 'text-zinc-800 dark:text-zinc-100'
                                            }`}
                                        >
                                            {line.label}
                                        </span>
                                        {line.flow && (
                                            <span
                                                className={`ml-2 inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                                                    line.flow === 'out'
                                                        ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                                                        : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                                                }`}
                                            >
                                                {line.flow === 'out' ? 'Saída' : 'Entrada'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {renderAnnualAmount(
                                    line,
                                    index,
                                    `shrink-0 tabular-nums ${
                                        isEmphasized
                                            ? 'text-base font-bold text-emerald-900 dark:text-emerald-100 sm:text-lg'
                                            : 'text-sm font-semibold text-zinc-900 dark:text-zinc-50 sm:text-base'
                                    }`,
                                )}
                            </div>
                        );
                    })}
                </div>
                <p className="border-t border-zinc-100 px-4 py-3 text-xs leading-relaxed text-zinc-500 dark:border-zinc-800 dark:text-zinc-400 sm:px-5">
                    O saldo atual considera o saldo inicial, as ofertas recebidas em {story.annual_year}, as
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

            {editable && onSave ? (
                <div className="sticky bottom-0 z-10 -mx-1 flex justify-end border-t border-zinc-200 bg-white/95 px-1 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 sm:mx-0">
                    <PrimaryButton
                        type="button"
                        disabled={saving}
                        onClick={() => onSave(withRecalculatedPercents(story))}
                    >
                        {saving ? 'Salvando…' : 'Salvar'}
                    </PrimaryButton>
                </div>
            ) : null}
        </div>
    );
}
