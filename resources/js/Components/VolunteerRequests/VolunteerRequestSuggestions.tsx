import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { useCallback, useEffect, useState } from 'react';

export type VolunteerSuggestionRow = {
    id: number;
    name: string;
    email: string | null;
    score: number;
    reasons: string[];
    stageName: string;
    clearanceStatus: string | null;
    interestPreview: string | null;
    ministryNames: string[];
};

type SuggestResponse = {
    suggestions: VolunteerSuggestionRow[];
    ministryName: string | null;
    roleName: string | null;
    candidatesEvaluated: number;
    message: string | null;
};

function clearanceLabel(status: string | null): string | null {
    if (!status) return null;
    if (status === 'cleared') return 'Clearance aprovado';
    if (status === 'pending') return 'Clearance pendente';
    if (status === 'blocked') return 'Clearance bloqueado';
    return status;
}

interface Props {
    suggestUrl: string;
    csrf: string;
    selectedVolunteerId: number | '';
    onSelectVolunteer: (id: number, name: string) => void;
    /** Dentro do modal de vincular (sem borda externa duplicada). */
    embedded?: boolean;
    /** Carrega sugestões ao montar (ícone de sugestão no card). */
    autoLoad?: boolean;
}

export default function VolunteerRequestSuggestions({
    suggestUrl,
    csrf,
    selectedVolunteerId,
    onSelectVolunteer,
    embedded = false,
    autoLoad = false,
}: Props) {
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [payload, setPayload] = useState<SuggestResponse | null>(null);

    const loadSuggestions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const r = await fetch(suggestUrl, {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrf,
                },
                credentials: 'same-origin',
            });
            if (!r.ok) throw new Error('bad');
            const j = (await r.json()) as SuggestResponse;
            setPayload(j);
            setLoaded(true);
        } catch {
            setError('Não foi possível carregar as sugestões. Tente novamente.');
            setPayload(null);
            setLoaded(true);
        } finally {
            setLoading(false);
        }
    }, [suggestUrl, csrf]);

    useEffect(() => {
        if (autoLoad) {
            void loadSuggestions();
        }
    }, [autoLoad, loadSuggestions]);

    const shellClass = embedded
        ? 'space-y-3'
        : 'rounded-2xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-900/50 dark:bg-violet-950/20 sm:p-5';

    return (
        <div className={shellClass}>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-violet-900 dark:text-violet-200">
                        <SparklesIcon className="h-5 w-5 shrink-0" aria-hidden />
                        Sugestão inteligente
                    </h3>
                    <p className="mt-1 text-sm text-violet-900/85 dark:text-violet-100/85">
                        Cruza departamento, função, observações do pedido e o questionário do cadastro. A equipe confirma
                        antes de anexar.
                    </p>
                </div>
                <SecondaryButton type="button" disabled={loading} onClick={() => void loadSuggestions()}>
                    {loading ? 'Analisando…' : loaded ? 'Atualizar sugestões' : 'Sugerir voluntários'}
                </SecondaryButton>
            </div>

            {error ? (
                <p className="mt-3 text-sm text-red-700 dark:text-red-300" role="alert">
                    {error}
                </p>
            ) : null}

            {loaded && payload && !error ? (
                <div className={`space-y-3 ${embedded ? '' : 'mt-4'}`}>
                    {payload.ministryName ? (
                        <p className="text-xs text-violet-800/90 dark:text-violet-200/90">
                            Pedido: <strong className="font-semibold">{payload.ministryName}</strong>
                            {payload.roleName ? (
                                <>
                                    {' '}
                                    · Função: <strong className="font-semibold">{payload.roleName}</strong>
                                </>
                            ) : null}
                            {payload.candidatesEvaluated > 0 ? (
                                <>
                                    {' '}
                                    · {payload.candidatesEvaluated} candidato(s) avaliado(s)
                                </>
                            ) : null}
                        </p>
                    ) : null}

                    {payload.message && payload.suggestions.length === 0 ? (
                        <p className="text-sm text-violet-900 dark:text-violet-100">{payload.message}</p>
                    ) : null}

                    {payload.suggestions.length > 0 ? (
                        <ul className="space-y-2">
                            {payload.suggestions.map((row, index) => {
                                const isSelected = selectedVolunteerId === row.id;
                                const clearance = clearanceLabel(row.clearanceStatus);
                                return (
                                    <li
                                        key={row.id}
                                        className={`rounded-xl border bg-white p-3 shadow-sm dark:bg-zinc-900 ${
                                            isSelected
                                                ? 'border-emerald-400 ring-1 ring-emerald-400/40 dark:border-emerald-600'
                                                : 'border-violet-100 dark:border-violet-900/40'
                                        }`}
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                                                    <span className="mr-2 text-violet-600 dark:text-violet-400">
                                                        #{index + 1}
                                                    </span>
                                                    {row.name}
                                                    <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-800 dark:bg-violet-950 dark:text-violet-200">
                                                        {row.score} pts
                                                    </span>
                                                </p>
                                                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                                                    {row.stageName}
                                                    {clearance ? ` · ${clearance}` : ''}
                                                    {row.email ? ` · ${row.email}` : ''}
                                                </p>
                                                {row.interestPreview ? (
                                                    <p className="mt-1 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-300">
                                                        {row.interestPreview}
                                                    </p>
                                                ) : null}
                                            </div>
                                            <PrimaryButton
                                                type="button"
                                                className="shrink-0 text-xs"
                                                onClick={() => onSelectVolunteer(row.id, row.name)}
                                            >
                                                {isSelected ? 'Selecionado' : 'Usar sugestão'}
                                            </PrimaryButton>
                                        </div>
                                        {row.reasons.length > 0 ? (
                                            <ul className="mt-2 list-inside list-disc space-y-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                                                {row.reasons.map((reason) => (
                                                    <li key={reason}>{reason}</li>
                                                ))}
                                            </ul>
                                        ) : null}
                                    </li>
                                );
                            })}
                        </ul>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
