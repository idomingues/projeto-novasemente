import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import { useMemo } from 'react';

type Slot = { day_of_week: number; start_time: string | null; end_time: string | null };

type Invite = {
    token: string;
    status: 'pending' | 'accepted' | 'declined' | string;
    expired: boolean;
    isFinal: boolean;
    volunteerName: string | null;
    volunteerEmail: string | null;
    ministryName: string | null;
    volunteerHasUser: boolean;
    registerUrl: string | null;
    pendingWithoutEmail: boolean;
    slots: Slot[];
    introParagraph: string;
};

export default function MinistryInvite() {
    const { invitation } = usePage().props as unknown as { invitation: Invite };

    const dayLabel = useMemo(() => ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'], []);

    const title = invitation.ministryName ? `Convite — ${invitation.ministryName}` : 'Convite';

    const statusPill = () => {
        if (invitation.expired) return <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">Expirado</span>;
        if (invitation.status === 'accepted') return <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">Confirmado</span>;
        if (invitation.status === 'declined') return <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800 dark:bg-red-950/40 dark:text-red-200">Recusado</span>;
        return <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">Aguardando</span>;
    };

    const statusMessage = () => {
        if (invitation.expired) {
            return 'Este convite expirou. Solicite um novo convite à equipe do departamento.';
        }
        if (invitation.status === 'accepted') {
            return invitation.volunteerHasUser
                ? 'Convite confirmado. Acesse o aplicativo com sua conta.'
                : 'Convite confirmado. Obrigado!';
        }
        if (invitation.status === 'declined') {
            return 'Este convite foi recusado. Se mudou de ideia, fale com a liderança do departamento.';
        }
        if (invitation.pendingWithoutEmail) {
            return 'Não há e-mail no cadastro de voluntário para abrir o cadastro. Entre em contato com a secretaria ou a liderança do departamento.';
        }
        if (invitation.volunteerHasUser) {
            return 'Este voluntário já tem conta no aplicativo. Faça login para continuar.';
        }
        return 'Não foi possível abrir o cadastro neste momento. Entre em contato com a equipe.';
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
                                )}
                            </p>
                            <p className="mt-2 text-sm whitespace-pre-wrap text-zinc-600 dark:text-zinc-300">{invitation.introParagraph}</p>
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

                    <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-300">
                        {statusMessage()}
                    </div>

                    {invitation.volunteerHasUser && invitation.status === 'accepted' ? (
                        <Link
                            href={route('login')}
                            className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-full bg-zinc-900 px-8 text-sm font-semibold uppercase tracking-widest text-white shadow-sm transition hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-100"
                        >
                            Entrar no app
                        </Link>
                    ) : null}

                    {invitation.volunteerHasUser && invitation.status === 'pending' && !invitation.expired ? (
                        <Link
                            href={route('login')}
                            className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-full bg-zinc-900 px-8 text-sm font-semibold uppercase tracking-widest text-white shadow-sm transition hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-100"
                        >
                            Fazer login
                        </Link>
                    ) : null}
                </div>
            </div>
        </MobileLayout>
    );
}
