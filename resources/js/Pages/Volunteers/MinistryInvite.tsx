import MobileLayout from '@/Layouts/MobileLayout';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Textarea from '@/Components/Textarea';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import { Head, useForm, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';

type Slot = { day_of_week: number; start_time: string | null; end_time: string | null };

type Invite = {
    token: string;
    status: 'pending' | 'accepted' | 'declined' | string;
    expired: boolean;
    isFinal: boolean;
    volunteerName: string | null;
    ministryName: string | null;
    slots: Slot[];
};

export default function MinistryInvite() {
    const { invitation } = usePage().props as unknown as { invitation: Invite };
    const [mode, setMode] = useState<'none' | 'decline'>('none');

    const dayLabel = useMemo(() => ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'], []);

    const { data, setData, post, processing, errors } = useForm({
        reason: '',
    });

    const accept = () => {
        post(route('volunteers.ministry-invite.accept', invitation.token), { preserveScroll: true });
    };

    const decline = () => {
        post(route('volunteers.ministry-invite.decline', invitation.token), { preserveScroll: true });
    };

    const title = invitation.ministryName ? `Convite — ${invitation.ministryName}` : 'Convite';

    const statusPill = () => {
        if (invitation.expired) return <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">Expirado</span>;
        if (invitation.status === 'accepted') return <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">Aceito</span>;
        if (invitation.status === 'declined') return <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800 dark:bg-red-950/40 dark:text-red-200">Recusado</span>;
        return <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">Aguardando</span>;
    };

    return (
        <MobileLayout>
            <Head title={title} />

            <div className="mx-auto w-full max-w-md space-y-4">
                <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Convite</p>
                            <h1 className="mt-2 text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
                                {invitation.ministryName ?? 'Departamento'}
                            </h1>
                            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                                {invitation.volunteerName ? (
                                    <>
                                        Olá, <span className="font-semibold text-zinc-900 dark:text-white">{invitation.volunteerName}</span>.
                                    </>
                                ) : (
                                    <>Olá.</>
                                )}{' '}
                                Confirme se aceita servir neste departamento.
                            </p>
                        </div>
                        <div className="shrink-0">{statusPill()}</div>
                    </div>

                    {invitation.slots.length > 0 ? (
                        <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-950/40">
                            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Dias e horários</p>
                            <ul className="mt-3 space-y-2 text-sm text-zinc-800 dark:text-zinc-200">
                                {invitation.slots.map((s, i) => (
                                    <li key={i} className="flex items-center justify-between gap-3">
                                        <span className="font-semibold">{dayLabel[s.day_of_week] ?? 'Dia'}</span>
                                        <span className="text-zinc-600 dark:text-zinc-300">
                                            {s.start_time && s.end_time
                                                ? `${s.start_time}–${s.end_time}`
                                                : s.start_time
                                                  ? `a partir de ${s.start_time}`
                                                  : s.end_time
                                                    ? `até ${s.end_time}`
                                                    : 'a combinar'}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}

                    {invitation.expired ? (
                        <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-300">
                            Este convite expirou. Por favor solicite um novo convite à equipe.
                        </div>
                    ) : invitation.isFinal ? (
                        <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-300">
                            Obrigado! Sua resposta já foi registada.
                        </div>
                    ) : (
                        <div className="mt-5 space-y-3">
                            {mode === 'decline' ? (
                                <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                                    <InputLabel value="Motivo da recusa *" />
                                    <Textarea
                                        value={data.reason}
                                        onChange={(e) => setData('reason', e.target.value)}
                                        rows={4}
                                        className="mt-2 w-full"
                                        placeholder="Explique brevemente o motivo…"
                                    />
                                    <InputError message={errors.reason} className="mt-2" />
                                    <div className="mt-4 flex gap-2">
                                        <SecondaryButton type="button" onClick={() => setMode('none')} disabled={processing}>
                                            Voltar
                                        </SecondaryButton>
                                        <PrimaryButton
                                            type="button"
                                            onClick={decline}
                                            disabled={processing || data.reason.trim().length < 5}
                                            className="!bg-red-600 hover:!bg-red-700"
                                        >
                                            Confirmar recusa
                                        </PrimaryButton>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <PrimaryButton type="button" onClick={accept} disabled={processing} className="w-full sm:w-auto">
                                        Aceitar
                                    </PrimaryButton>
                                    <SecondaryButton type="button" onClick={() => setMode('decline')} disabled={processing} className="w-full sm:w-auto">
                                        Não aceitar
                                    </SecondaryButton>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </MobileLayout>
    );
}

