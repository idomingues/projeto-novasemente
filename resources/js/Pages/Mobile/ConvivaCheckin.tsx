import MobileLayout from '@/Layouts/MobileLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { CheckIcon } from '@heroicons/react/24/solid';
import { useEffect, useState } from 'react';

type ConvivaClassOption = {
    id: number;
    room_name: string;
    teacher_name: string;
};

type TodayCheckin = {
    id: number;
    class_id: number;
    room_name: string | null;
    teacher_name: string | null;
    checked_in_at: string | null;
};

interface Props {
    classes: ConvivaClassOption[];
    suggestedClassId: number | null;
    isSaturday: boolean;
    today: string;
    todayLabel: string;
    checkin: TodayCheckin | null;
}

export default function ConvivaCheckin({
    classes,
    suggestedClassId,
    isSaturday,
    todayLabel,
    checkin,
}: Props) {
    const page = usePage();
    const flashSuccess = (page.props.flash as { success?: string } | undefined)?.success;
    const [selectedId, setSelectedId] = useState<number | null>(
        checkin?.class_id ?? suggestedClassId,
    );
    const [submitting, setSubmitting] = useState(false);
    const [justCheckedIn, setJustCheckedIn] = useState(false);
    const [entered, setEntered] = useState(false);

    useEffect(() => {
        const t = window.setTimeout(() => setEntered(true), 40);
        return () => window.clearTimeout(t);
    }, []);

    useEffect(() => {
        setSelectedId(checkin?.class_id ?? suggestedClassId);
    }, [checkin?.class_id, suggestedClassId]);

    useEffect(() => {
        if (flashSuccess || checkin) {
            setJustCheckedIn(true);
            const t = window.setTimeout(() => setJustCheckedIn(false), 2200);
            return () => window.clearTimeout(t);
        }
    }, [flashSuccess, checkin?.id]);

    const selected = classes.find((c) => c.id === selectedId) ?? null;
    const alreadyHere = checkin != null && checkin.class_id === selectedId;
    const canSubmit = isSaturday && selectedId != null && !submitting && classes.length > 0;

    const doCheckin = () => {
        if (!canSubmit || selectedId == null) return;
        setSubmitting(true);
        router.post(
            route('mobile.conviva.checkin.store'),
            { conviva_class_id: selectedId },
            {
                preserveScroll: true,
                onFinish: () => setSubmitting(false),
            },
        );
    };

    return (
        <MobileLayout>
            <Head title="CONVIVA" />

            <div className="relative mx-auto max-w-lg pb-8">
                <div
                    aria-hidden
                    className="pointer-events-none absolute -left-16 top-0 h-48 w-48 rounded-full bg-teal-400/15 blur-3xl dark:bg-teal-500/10"
                />
                <div
                    aria-hidden
                    className="pointer-events-none absolute -right-10 top-24 h-40 w-40 rounded-full bg-emerald-300/20 blur-3xl dark:bg-emerald-500/10"
                />

                <div
                    className={`relative text-center transition duration-700 ease-out ${
                        entered ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
                    }`}
                >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-teal-700 dark:text-teal-300">
                        Estudo bíblico
                    </p>
                    <h1 className="mt-2 bg-gradient-to-br from-teal-800 via-teal-600 to-emerald-500 bg-clip-text text-5xl font-black tracking-tight text-transparent sm:text-6xl dark:from-teal-200 dark:via-teal-300 dark:to-emerald-300">
                        CONVIVA
                    </h1>
                    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{todayLabel}</p>
                </div>

                {!isSaturday && (
                    <div
                        className={`relative mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200 transition duration-700 delay-100 ${
                            entered ? 'opacity-100' : 'opacity-0'
                        }`}
                    >
                        O check-in do CONVIVA fica disponível aos sábados, no culto.
                    </div>
                )}

                {checkin && (
                    <div
                        className={`relative mt-5 overflow-hidden rounded-2xl border border-teal-200/80 bg-white p-4 shadow-sm ring-1 ring-teal-100 dark:border-teal-800/60 dark:bg-zinc-900 dark:ring-teal-900/40 transition duration-700 delay-150 ${
                            entered ? 'opacity-100' : 'opacity-0'
                        }`}
                    >
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white shadow-sm shadow-teal-600/30">
                                <CheckIcon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                                    Check-in feito
                                    {checkin.checked_in_at ? ` às ${checkin.checked_in_at}` : ''}
                                </p>
                                <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-300">
                                    {checkin.room_name} · {checkin.teacher_name}
                                </p>
                                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                    Pode trocar de turma abaixo se mudou de sala.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div
                    className={`relative mt-8 transition duration-700 delay-200 ${
                        entered ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                    }`}
                >
                    <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                        Sua turma
                    </h2>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        Sala e professor juntos — toque para escolher.
                    </p>

                    {classes.length === 0 ? (
                        <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
                            Nenhuma turma ativa no momento. Peça à secretaria para cadastrar.
                        </div>
                    ) : (
                        <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {classes.map((c, index) => {
                                const selected = selectedId === c.id;
                                const suggested = suggestedClassId === c.id && !checkin;
                                return (
                                    <li
                                        key={c.id}
                                        style={{ transitionDelay: `${220 + index * 40}ms` }}
                                        className={`transition duration-500 ${
                                            entered ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
                                        }`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setSelectedId(c.id)}
                                            className={`group relative w-full cursor-pointer overflow-hidden rounded-2xl p-4 text-left shadow-sm ring-1 transition duration-200 active:scale-[0.99] ${
                                                selected
                                                    ? 'bg-teal-600 text-white ring-teal-700 shadow-teal-600/20 dark:bg-teal-500 dark:ring-teal-400'
                                                    : 'bg-white text-zinc-900 ring-zinc-200/90 hover:ring-teal-300 dark:bg-zinc-900 dark:text-white dark:ring-zinc-700 dark:hover:ring-teal-700'
                                            }`}
                                        >
                                            {suggested && !selected ? (
                                                <span className="absolute right-3 top-3 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-700 ring-1 ring-teal-200 dark:bg-teal-950/50 dark:text-teal-200 dark:ring-teal-800">
                                                    Sua turma
                                                </span>
                                            ) : null}
                                            {selected ? (
                                                <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                                                    <CheckIcon className="h-3.5 w-3.5" />
                                                </span>
                                            ) : null}
                                            <p
                                                className={`pr-10 text-base font-bold tracking-tight ${
                                                    selected ? 'text-white' : 'text-zinc-900 dark:text-white'
                                                }`}
                                            >
                                                {c.room_name}
                                            </p>
                                            <p
                                                className={`mt-1 text-sm ${
                                                    selected
                                                        ? 'text-teal-50'
                                                        : 'text-zinc-500 dark:text-zinc-400'
                                                }`}
                                            >
                                                {c.teacher_name}
                                            </p>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                <div
                    className={`relative mt-10 flex flex-col items-center transition duration-700 delay-300 ${
                        entered ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
                    }`}
                >
                    <button
                        type="button"
                        disabled={!canSubmit || alreadyHere}
                        onClick={doCheckin}
                        aria-label={
                            alreadyHere
                                ? 'Check-in já realizado nesta turma'
                                : checkin
                                  ? 'Atualizar check-in CONVIVA'
                                  : 'Fazer check-in CONVIVA'
                        }
                        className={`relative flex h-40 w-40 cursor-pointer flex-col items-center justify-center rounded-full text-white shadow-xl transition duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-400/40 disabled:cursor-not-allowed disabled:opacity-60 sm:h-44 sm:w-44 ${
                            alreadyHere
                                ? 'bg-emerald-600 shadow-emerald-600/25'
                                : 'bg-gradient-to-br from-teal-600 via-teal-500 to-emerald-500 shadow-teal-600/30 hover:scale-[1.03] active:scale-[0.98]'
                        } ${justCheckedIn && !alreadyHere ? 'animate-pulse' : ''}`}
                    >
                        {!alreadyHere && isSaturday && canSubmit ? (
                            <span
                                aria-hidden
                                className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-teal-400/25"
                                style={{ animationDuration: '2.4s' }}
                            />
                        ) : null}
                        {alreadyHere || justCheckedIn ? (
                            <CheckIcon className="relative h-12 w-12" />
                        ) : (
                            <span className="relative text-xl font-black uppercase tracking-[0.18em]">
                                Check-in
                            </span>
                        )}
                        <span className="relative mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/85">
                            CONVIVA
                        </span>
                    </button>

                    <p className="mt-4 max-w-xs text-center text-xs text-zinc-500 dark:text-zinc-400">
                        {!isSaturday
                            ? 'Volte no sábado para registrar sua presença.'
                            : alreadyHere
                              ? 'Você já está nesta turma hoje.'
                              : checkin
                                ? selected
                                  ? `Trocar para ${selected.room_name} · ${selected.teacher_name}`
                                  : 'Escolha uma turma para atualizar.'
                                : selected
                                  ? `${selected.room_name} · ${selected.teacher_name}`
                                  : 'Escolha sua sala e professor.'}
                    </p>
                </div>
            </div>
        </MobileLayout>
    );
}
