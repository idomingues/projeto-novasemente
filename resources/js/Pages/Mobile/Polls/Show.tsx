import MobileLayout from '@/Layouts/MobileLayout';
import FlashMessages from '@/Components/FlashMessages';
import PrimaryButton from '@/Components/PrimaryButton';
import Textarea from '@/Components/Textarea';
import PollResultsCard from '@/Components/Polls/PollResultsCard';
import type { PollResults } from '@/Components/Polls/pollTypes';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';
import { FormEventHandler, useState } from 'react';

type PollOption = {
    id: number;
    label: string;
};

type PollShow = {
    id: number;
    question: string;
    allow_multiple: boolean;
    response_type: 'choice' | 'text';
    shows_results: boolean;
    text_answer_max: number;
    status: string;
    status_label: string;
    is_open: boolean;
    has_voted: boolean;
    options: PollOption[];
    selected_option_ids: number[];
    my_answer_text: string | null;
    results: PollResults | null;
};

type Props = {
    poll: PollShow;
    otherOpenUnansweredCount?: number;
};

export default function MobilePollsShow({ poll, otherOpenUnansweredCount = 0 }: Props) {
    const isText = poll.response_type === 'text';
    const [selected, setSelected] = useState<number[]>([]);
    const [answerText, setAnswerText] = useState('');
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toggleOption = (optionId: number) => {
        setError(null);
        setSelected([optionId]);
    };

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        if (isText) {
            const trimmed = answerText.trim();
            if (!trimmed) {
                setError('Escreva sua sugestão.');
                return;
            }
            const lines = trimmed.split(/\n/).filter((line, i, arr) => !(line === '' && i === arr.length - 1));
            if (lines.length > 2) {
                setError('Use no máximo duas linhas.');
                return;
            }
            setProcessing(true);
            setError(null);
            router.post(
                route('mobile.polls.vote', poll.id),
                { answer_text: trimmed },
                {
                    preserveScroll: true,
                    onFinish: () => setProcessing(false),
                    onError: (errs) => {
                        const msg = (errs as { answer_text?: string }).answer_text;
                        setError(msg ?? 'Não foi possível enviar sua sugestão.');
                    },
                },
            );
            return;
        }

        if (selected.length === 0) {
            setError('Selecione pelo menos uma opção.');
            return;
        }
        setProcessing(true);
        setError(null);
        router.post(
            route('mobile.polls.vote', poll.id),
            { option_ids: selected },
            {
                preserveScroll: true,
                onFinish: () => setProcessing(false),
                onError: (errs) => {
                    const msg = (errs as { option_ids?: string }).option_ids;
                    setError(msg ?? 'Não foi possível enviar sua resposta.');
                },
            },
        );
    };

    const showResults = !isText && poll.has_voted && poll.results != null;
    const showTextThanks = isText && poll.has_voted;

    return (
        <MobileLayout>
            <Head title="Enquete" />
            <div className="mx-auto max-w-3xl space-y-5">
                <div className="flex items-center gap-3">
                    <Link
                        href={route('mobile.polls.index')}
                        className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                        aria-label="Voltar"
                    >
                        <ArrowLeftIcon className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-lg font-semibold text-zinc-900 dark:text-white">Enquete</h1>
                        {!poll.is_open && (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">{poll.status_label}</p>
                        )}
                    </div>
                </div>

                <FlashMessages />

                {showResults && poll.results ? (
                    <PollResultsCard
                        question={poll.question}
                        allowMultiple={false}
                        results={poll.results}
                        selectedOptionIds={poll.selected_option_ids}
                    />
                ) : showTextThanks ? (
                    <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{poll.question}</h2>
                        <p className="text-sm text-emerald-900 dark:text-emerald-100">
                            Obrigado! Sua sugestão foi registrada. Esta enquete não exibe resultado público.
                        </p>
                        {poll.my_answer_text ? (
                            <div className="rounded-xl border border-emerald-200/80 bg-white/80 px-3 py-2 dark:border-emerald-800 dark:bg-zinc-900/60">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                                    Sua resposta
                                </p>
                                <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-100">
                                    {poll.my_answer_text}
                                </p>
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{poll.question}</h2>
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                {isText
                                    ? 'Texto livre · no máximo duas linhas · sem resultado público'
                                    : 'Selecione uma opção'}
                            </p>

                            {isText ? (
                                <div className="mt-4 space-y-2">
                                    <Textarea
                                        rows={2}
                                        maxLength={poll.text_answer_max || 160}
                                        value={answerText}
                                        onChange={(e) => {
                                            setError(null);
                                            setAnswerText(e.target.value);
                                        }}
                                        disabled={!poll.is_open}
                                        placeholder="Escreva sua sugestão…"
                                        className="w-full resize-none"
                                    />
                                    <p className="text-right text-[11px] text-zinc-400">
                                        {answerText.length}/{poll.text_answer_max || 160}
                                    </p>
                                </div>
                            ) : (
                                <ul className="mt-4 space-y-2">
                                    {poll.options.map((option) => {
                                        const isSelected = selected.includes(option.id);
                                        return (
                                            <li key={option.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleOption(option.id)}
                                                    disabled={!poll.is_open}
                                                    className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                                        isSelected
                                                            ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/40'
                                                            : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800/50 dark:hover:border-zinc-600'
                                                    }`}
                                                >
                                                    {isSelected ? (
                                                        <CheckCircleSolidIcon className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                                    ) : (
                                                        <span className="block h-5 w-5 shrink-0 rounded-full border-2 border-zinc-300 dark:border-zinc-500" />
                                                    )}
                                                    <span
                                                        className={`text-sm font-medium ${
                                                            isSelected
                                                                ? 'text-emerald-900 dark:text-emerald-100'
                                                                : 'text-zinc-800 dark:text-zinc-100'
                                                        }`}
                                                    >
                                                        {option.label}
                                                    </span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>

                        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

                        {poll.is_open ? (
                            <PrimaryButton
                                type="submit"
                                className="w-full cursor-pointer justify-center"
                                disabled={
                                    processing ||
                                    (isText ? answerText.trim().length === 0 : selected.length === 0)
                                }
                            >
                                {processing ? 'Enviando…' : 'Enviar'}
                            </PrimaryButton>
                        ) : (
                            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                                Esta enquete está encerrada.
                            </p>
                        )}

                        <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                            {isText
                                ? 'Sua sugestão fica só com a equipe — não há resultado em gráfico.'
                                : 'O resultado aparece assim que você enviar sua resposta.'}
                        </p>
                    </form>
                )}

                {poll.has_voted && otherOpenUnansweredCount > 0 ? (
                    <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
                        Ainda há{' '}
                        {otherOpenUnansweredCount === 1
                            ? 'outra enquete'
                            : `${otherOpenUnansweredCount} enquetes`}{' '}
                        para responder.{' '}
                        <Link
                            href={route('mobile.polls.index')}
                            className="cursor-pointer font-medium text-teal-700 underline-offset-2 hover:underline dark:text-teal-300"
                        >
                            Ver lista
                        </Link>
                    </p>
                ) : null}
            </div>
        </MobileLayout>
    );
}
