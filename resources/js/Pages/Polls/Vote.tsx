import MobileLayout from '@/Layouts/MobileLayout';
import FlashMessages from '@/Components/FlashMessages';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import PollResultsCard from '@/Components/Polls/PollResultsCard';
import type { PollResults } from '@/Components/Polls/pollTypes';
import { Head, router } from '@inertiajs/react';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';
import { FormEventHandler, useMemo, useState } from 'react';

type PollOption = {
    id: number;
    label: string;
    is_write_in?: boolean;
};

type PollShow = {
    id: number;
    question: string;
    allow_multiple: boolean;
    write_in_text_max?: number;
    write_in_text_min?: number;
    status: string;
    status_label: string;
    is_open: boolean;
    has_voted: boolean;
    can_change_vote?: boolean;
    options: PollOption[];
    selected_option_ids: number[];
    results: PollResults | null;
};

type Props = {
    poll: PollShow;
    vote_url: string;
    display_url: string | null;
};

export default function PollVote({ poll, vote_url, display_url }: Props) {
    const [selected, setSelected] = useState<number | null>(poll.selected_option_ids[0] ?? null);
    const [otherText, setOtherText] = useState('');
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editing, setEditing] = useState(false);

    const writeInMax = poll.write_in_text_max ?? 60;
    const writeInMin = poll.write_in_text_min ?? 3;
    const selectedOption = useMemo(
        () => poll.options.find((o) => o.id === selected) ?? null,
        [poll.options, selected],
    );
    const writingIn = Boolean(selectedOption?.is_write_in);

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        if (selected == null) {
            setError('Selecione uma opção.');
            return;
        }
        if (writingIn) {
            const typed = otherText.trim();
            if (typed.length < writeInMin) {
                setError(`Digite pelo menos ${writeInMin} letras.`);
                return;
            }
        }
        setProcessing(true);
        setError(null);
        router.post(
            vote_url,
            {
                option_ids: [selected],
                ...(writingIn ? { other_text: otherText.trim() } : {}),
            },
            {
                preserveScroll: true,
                onFinish: () => setProcessing(false),
                onSuccess: () => {
                    setEditing(false);
                    setOtherText('');
                },
                onError: (errs) => {
                    const e = errs as { option_ids?: string; other_text?: string };
                    setError(e.other_text ?? e.option_ids ?? 'Não foi possível enviar sua resposta.');
                },
            },
        );
    };

    const showResults = poll.has_voted && poll.results != null && !editing;

    return (
        <MobileLayout>
            <Head title={poll.question} />
            <div className="mx-auto max-w-lg space-y-5">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
                        Enquete
                    </p>
                    <h1 className="mt-1 text-xl font-semibold text-zinc-900 dark:text-white">Vote agora</h1>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Um voto por pessoa. Não precisa entrar na conta.
                    </p>
                </div>

                <FlashMessages />

                {showResults && poll.results ? (
                    <div className="space-y-4">
                        <PollResultsCard
                            question={poll.question}
                            allowMultiple={false}
                            results={poll.results}
                            selectedOptionIds={poll.selected_option_ids}
                        />
                        {poll.can_change_vote && poll.is_open ? (
                            <SecondaryButton
                                type="button"
                                className="w-full cursor-pointer justify-center"
                                onClick={() => {
                                    setEditing(true);
                                    setSelected(poll.selected_option_ids[0] ?? null);
                                    setError(null);
                                    setOtherText('');
                                }}
                            >
                                Mudar minha resposta
                            </SecondaryButton>
                        ) : null}
                        {display_url && (
                            <a
                                href={display_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex cursor-pointer text-sm font-semibold text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-300"
                            >
                                Abrir painel de resultados
                            </a>
                        )}
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{poll.question}</h2>
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                {editing ? 'Escolha outra opção' : 'Selecione uma opção'}
                            </p>

                            <ul className="mt-4 space-y-2">
                                {poll.options.map((option) => {
                                    const isSelected = selected === option.id;
                                    return (
                                        <li key={option.id}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setError(null);
                                                    setSelected(option.id);
                                                    if (!option.is_write_in) {
                                                        setOtherText('');
                                                    }
                                                }}
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
                                            {isSelected && option.is_write_in ? (
                                                <div className="mt-2 pl-1">
                                                    <TextInput
                                                        value={otherText}
                                                        onChange={(e) => {
                                                            setError(null);
                                                            setOtherText(e.target.value);
                                                        }}
                                                        maxLength={writeInMax}
                                                        minLength={writeInMin}
                                                        disabled={!poll.is_open}
                                                        placeholder={`Digite o nome (mín. ${writeInMin} letras)…`}
                                                        className="w-full"
                                                        autoFocus
                                                    />
                                                    <p className="mt-1 text-right text-[11px] text-zinc-400">
                                                        {otherText.length}/{writeInMax}
                                                    </p>
                                                </div>
                                            ) : null}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>

                        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

                        <div className="flex flex-col gap-2">
                            <PrimaryButton
                                type="submit"
                                className="w-full cursor-pointer justify-center"
                                disabled={
                                    processing ||
                                    !poll.is_open ||
                                    selected == null ||
                                    (writingIn && otherText.trim().length < writeInMin)
                                }
                            >
                                {processing
                                    ? 'Enviando…'
                                    : editing
                                      ? 'Salvar nova resposta'
                                      : 'Enviar voto'}
                            </PrimaryButton>
                            {editing ? (
                                <SecondaryButton
                                    type="button"
                                    className="w-full cursor-pointer justify-center"
                                    onClick={() => {
                                        setEditing(false);
                                        setError(null);
                                        setOtherText('');
                                        setSelected(poll.selected_option_ids[0] ?? null);
                                    }}
                                >
                                    Cancelar
                                </SecondaryButton>
                            ) : null}
                        </div>
                    </form>
                )}
            </div>
        </MobileLayout>
    );
}
