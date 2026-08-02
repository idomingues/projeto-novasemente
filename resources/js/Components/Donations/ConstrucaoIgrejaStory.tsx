import {
    CONSTRUCAO_IGREJA_HERO_IMAGE,
    defaultConstrucaoIgrejaStory,
    formatConstrucaoDate,
    type ConstrucaoIgrejaStoryData,
} from '@/data/construcaoIgrejaStory';
import { parseMoneyInput } from '@/lib/pixPayload';
import PrimaryButton from '@/Components/PrimaryButton';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { BuildingOffice2Icon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

function formatBrl(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatMoneyFieldValue(value: number): string {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function resolveStory(initial?: ConstrucaoIgrejaStoryData | null): ConstrucaoIgrejaStoryData {
    if (!initial) {
        return defaultConstrucaoIgrejaStory();
    }
    return {
        ...initial,
        paragraphs: [...initial.paragraphs],
        highlights: [...initial.highlights],
    };
}

type Props = {
    story?: ConstrucaoIgrejaStoryData | null;
    coverImageUrl?: string | null;
    campaignTitle?: string;
    editable?: boolean;
    saving?: boolean;
    onChange?: (story: ConstrucaoIgrejaStoryData) => void;
    onSave?: (story: ConstrucaoIgrejaStoryData) => void;
};

export default function ConstrucaoIgrejaStory({
    story: storyProp = null,
    coverImageUrl = null,
    campaignTitle,
    editable = false,
    saving = false,
    onChange,
    onSave,
}: Props) {
    const [story, setStory] = useState<ConstrucaoIgrejaStoryData>(() => resolveStory(storyProp));
    const [raisedDraft, setRaisedDraft] = useState(() => formatMoneyFieldValue(resolveStory(storyProp).raised_amount));
    const [asOfDraft, setAsOfDraft] = useState(() => resolveStory(storyProp).as_of_date);

    useEffect(() => {
        const next = resolveStory(storyProp);
        setStory(next);
        setRaisedDraft(formatMoneyFieldValue(next.raised_amount));
        setAsOfDraft(next.as_of_date);
    }, [storyProp]);

    function commitStory(next: ConstrucaoIgrejaStoryData) {
        setStory(next);
        onChange?.(next);
    }

    function commitRaised(raw: string) {
        const parsed = parseMoneyInput(raw);
        if (parsed === null) {
            setRaisedDraft(formatMoneyFieldValue(story.raised_amount));
            return;
        }
        setRaisedDraft(formatMoneyFieldValue(parsed));
        commitStory({ ...story, raised_amount: parsed });
    }

    function commitAsOfDate(value: string) {
        setAsOfDraft(value);
        if (!value) {
            return;
        }
        commitStory({ ...story, as_of_date: value });
    }

    const heroSrc = coverImageUrl || CONSTRUCAO_IGREJA_HERO_IMAGE;
    const displayTitle = campaignTitle || story.title;

    return (
        <div className="space-y-5">
            <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="relative aspect-[16/10] w-full sm:aspect-[21/9]">
                    <img
                        src={heroSrc}
                        alt="Campanha da construção da Igreja Nova Semente"
                        className="absolute inset-0 h-full w-full object-cover object-center"
                    />
                    <div
                        className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/55 to-zinc-950/10"
                        aria-hidden
                    />
                    <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-100/90">
                            {story.eyebrow}
                        </p>
                        <h2 className="mt-1.5 max-w-xl text-xl font-semibold leading-snug text-white sm:text-2xl">
                            {displayTitle}
                        </h2>
                    </div>
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-sky-50 dark:border-emerald-900/60 dark:from-emerald-950/40 dark:via-zinc-900 dark:to-sky-950/30">
                <div className="px-4 py-5 sm:px-5">
                    <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
                            <BuildingOffice2Icon className="h-5 w-5" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                                Desde o lançamento oficial da campanha da construção, em{' '}
                                <span className="font-medium text-zinc-800 dark:text-zinc-100">
                                    {formatConstrucaoDate(story.launch_date)}
                                </span>
                                , até{' '}
                                {editable ? (
                                    <input
                                        type="date"
                                        value={asOfDraft}
                                        onChange={(e) => commitAsOfDate(e.target.value)}
                                        aria-label="Data de referência da arrecadação"
                                        className="mx-1 inline-flex cursor-pointer rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm font-medium text-zinc-800 shadow-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-emerald-500 dark:focus:ring-emerald-900/40"
                                    />
                                ) : (
                                    <span className="font-medium text-zinc-800 dark:text-zinc-100">
                                        {formatConstrucaoDate(story.as_of_date)}
                                    </span>
                                )}
                                , a igreja arrecadou:
                            </p>

                            {editable ? (
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={raisedDraft}
                                    onChange={(e) => setRaisedDraft(e.target.value)}
                                    onBlur={() => commitRaised(raisedDraft)}
                                    aria-label="Valor arrecadado na construção"
                                    className="mt-3 w-full max-w-md cursor-text rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-2xl font-bold tracking-tight tabular-nums text-zinc-900 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 dark:border-emerald-800 dark:bg-zinc-950 dark:text-white dark:focus:border-emerald-500 dark:focus:ring-emerald-900/40 sm:text-3xl"
                                />
                            ) : (
                                <p className="mt-3 text-3xl font-bold tracking-tight tabular-nums text-zinc-900 dark:text-white sm:text-4xl">
                                    {formatBrl(story.raised_amount)}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
                <h3 className="text-base font-semibold text-zinc-900 dark:text-white">{story.title}</h3>
                <div className="mt-3 space-y-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                    {story.paragraphs.map((paragraph, index) => {
                        const isHeading =
                            paragraph.length < 80
                            && !paragraph.includes('. ')
                            && (
                                /^\d+[ªº]?\s*Etapa/i.test(paragraph)
                                || /^(Investimento|Participação|Subvenção|Resultado|Nossa Participação|Um Motivo|Da subvenção)/i.test(paragraph)
                            );

                        if (isHeading) {
                            return (
                                <h4
                                    key={`p-${index}-${paragraph.slice(0, 24)}`}
                                    className="pt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50"
                                >
                                    {paragraph}
                                </h4>
                            );
                        }

                        return (
                            <p key={`p-${index}-${paragraph.slice(0, 24)}`} className="whitespace-pre-wrap">
                                {paragraph}
                            </p>
                        );
                    })}
                </div>
                {story.highlights.length > 0 ? (
                    <ul className="mt-4 space-y-2.5 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                        {story.highlights.map((item, index) => (
                            <li
                                key={`h-${index}-${item.slice(0, 24)}`}
                                className="flex gap-2.5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300"
                            >
                                <CheckCircleIcon
                                    className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400"
                                    aria-hidden
                                />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                ) : null}
            </section>

            {editable && onSave ? (
                <div className="sticky bottom-0 z-10 -mx-1 flex justify-end border-t border-zinc-200 bg-white/95 px-1 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 sm:mx-0">
                    <PrimaryButton
                        type="button"
                        disabled={saving}
                        onClick={() => {
                            const parsed = parseMoneyInput(raisedDraft);
                            const next = {
                                ...story,
                                as_of_date: asOfDraft || story.as_of_date,
                                raised_amount: parsed ?? story.raised_amount,
                            };
                            commitStory(next);
                            onSave(next);
                        }}
                    >
                        {saving ? 'Salvando…' : 'Salvar'}
                    </PrimaryButton>
                </div>
            ) : null}
        </div>
    );
}
