import MobileLayout from '@/Layouts/MobileLayout';
import ScheduleLoginGate from '@/Components/ScheduleLoginGate';
import { Head, Link, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { confirmAction } from '@/utils/confirmDialog';
import Swal from 'sweetalert2';

type Teammate = {
    assignmentId: number;
    memberId: number | null;
    volunteerId?: number | null;
    memberName: string;
    memberPhotoUrl: string | null;
    roleName: string | null;
    checkedInAt: string | null;
    isMe: boolean;
};

type ScheduleEvent = {
    dateYmd: string;
    ministryId: number;
    ministryName: string;
    myAssignmentId: number;
    myRoleName: string | null;
    myStartTime: string | null;
    myEndTime: string | null;
    myCheckedInAt: string | null;
    checkinEnabled: boolean;
    teammates: Teammate[];
};

type VolunteerOverview = {
    events: ScheduleEvent[];
    departments: { id: number; name: string }[];
    hasVolunteerProfile: boolean;
};

type MonthBlock = {
    month: number;
    year: number;
    overview: VolunteerOverview;
};

interface Props {
    canViewSchedule: boolean;
    needsMember: boolean;
    memberName: string | null;
    memberPhotoUrl: string | null;
    months: MonthBlock[];
}

function monthLabel(year: number, month: number) {
    return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
}

function dayBadge(ymd: string) {
    const d = new Date(ymd + 'T12:00:00');
    const wd = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase();
    const day = d.toLocaleDateString('pt-BR', { day: '2-digit' });
    return { wd, day };
}

export default function VolunteerScheduleHome({ canViewSchedule, needsMember, memberName, memberPhotoUrl, months }: Props) {
    const inertiaScroll = { preserveScroll: true };

    const hasVolunteerProfile = useMemo(() => months.some((m) => m.overview?.hasVolunteerProfile), [months]);
    const allEvents = useMemo(() => months.flatMap((m) => m.overview?.events ?? []), [months]);
    const todayYmd = useMemo(() => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }, []);

    const [pendingAssignmentIds, setPendingAssignmentIds] = useState<Set<number>>(new Set());
    const [localCheckedInOverride, setLocalCheckedInOverride] = useState<Record<number, boolean>>({});

    const isDarkMode = () =>
        typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

    const showAlert = (opts: { title: string; text?: string; icon: 'success' | 'error' | 'info' | 'warning' }) => {
        const dark = isDarkMode();
        return Swal.fire({
            title: opts.title,
            text: opts.text,
            icon: opts.icon,
            confirmButtonText: 'OK',
            background: dark ? '#18181b' : '#ffffff',
            color: dark ? '#fafafa' : '#18181b',
            confirmButtonColor: '#18181b',
            heightAuto: false,
            customClass: {
                popup: 'swal-app-popup',
                confirmButton: 'swal-app-btn',
            },
        });
    };

    const doToggleCheckin = async (assignmentId: number, dateYmd: string, checkedIn: boolean) => {
        if (pendingAssignmentIds.has(assignmentId)) return;

        const ok = await confirmAction({
            title: checkedIn ? 'Desfazer check-in?' : 'Fazer check-in?',
            text: checkedIn ? 'Você pode marcar novamente depois.' : 'Confirme para marcar sua presença.',
            confirmButtonText: checkedIn ? 'Desfazer' : 'Confirmar',
            danger: checkedIn,
            icon: checkedIn ? 'warning' : 'question',
        });
        if (!ok) return;

        setPendingAssignmentIds((prev) => new Set(prev).add(assignmentId));

        router.post(
            route('escalas.checkin'),
            { assignment_id: assignmentId, schedule_date: dateYmd },
            {
                ...inertiaScroll,
                onSuccess: () => {
                    // Atualiza UI imediatamente (mesmo se a navegação preservar estado)
                    setLocalCheckedInOverride((prev) => ({ ...prev, [assignmentId]: !checkedIn }));
                    void showAlert({
                        title: checkedIn ? 'Check-in desfeito' : 'Check-in realizado',
                        text: checkedIn ? 'Sua presença foi desmarcada.' : 'Sua presença foi confirmada.',
                        icon: 'success',
                    });
                },
                onError: (errors) => {
                    const msg =
                        (errors as Record<string, string>)?.assignment_id ||
                        Object.values(errors as Record<string, string>)[0] ||
                        'Não foi possível concluir a ação.';
                    void showAlert({ title: 'Não foi possível', text: msg, icon: 'error' });
                },
                onFinish: () => {
                    setPendingAssignmentIds((prev) => {
                        const next = new Set(prev);
                        next.delete(assignmentId);
                        return next;
                    });
                },
            },
        );
    };

    return (
        <MobileLayout>
            <Head title="Minha escala" />

            <div className="mx-auto w-full max-w-lg space-y-5 pb-4 md:max-w-3xl lg:max-w-5xl xl:max-w-6xl">
                <header className="text-center pt-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-zinc-500 dark:text-zinc-400">
                        Minha escala
                    </p>
                    <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
                        Minha Escala
                    </h1>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        Próximos 2 meses e check-in rápido
                    </p>
                </header>

                {!canViewSchedule && <ScheduleLoginGate />}

                {canViewSchedule && needsMember && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-sm dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                        O seu usuário ainda não está associado a um membro. Peça à secretaria para concluir o cadastro e
                        poder ver a sua escala.
                    </div>
                )}

                {canViewSchedule && !needsMember && (
                    <>
                        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                            <div className="flex flex-col items-center gap-4">
                                {memberPhotoUrl ? (
                                    <img
                                        src={memberPhotoUrl}
                                        alt=""
                                        className="h-24 w-24 rounded-full object-cover ring-4 ring-zinc-100 shadow-sm dark:ring-zinc-800"
                                    />
                                ) : (
                                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-zinc-200 text-3xl font-bold text-zinc-700 ring-4 ring-zinc-100 shadow-sm dark:bg-zinc-700 dark:text-zinc-200 dark:ring-zinc-800">
                                        {(memberName ?? '?').trim().charAt(0).toUpperCase() || '?'}
                                    </div>
                                )}
                                <div className="text-center">
                                    <p className="text-2xl font-bold tracking-tight text-brand-700 dark:text-brand-300">
                                        {memberName ?? '—'}
                                    </p>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Próximos 2 meses</p>
                                </div>
                            </div>
                        </section>

                        {!hasVolunteerProfile && (
                            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400">
                                Ainda não há cadastro de voluntário associado ao seu membro. Quando a secretaria o inscrever
                                num departamento, a escala aparecerá aqui.
                            </div>
                        )}

                        {hasVolunteerProfile && allEvents.length === 0 && (
                            <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
                                Nenhuma escala para si nos próximos 2 meses.
                            </div>
                        )}

                        {months
                            .map((m) => {
                                const events = (m.overview?.events ?? []).filter((ev) => ev.dateYmd >= todayYmd);
                                return { ...m, events };
                            })
                            .filter((m) => m.events.length > 0)
                            .map((m) => {
                                const events = m.events;
                            return (
                                <section key={`${m.year}-${m.month}`} className="space-y-3">
                                    <div className="flex items-center justify-center">
                                        <h2 className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-[0.28em] text-zinc-900 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-white">
                                            {monthLabel(m.year, m.month)}
                                        </h2>
                                    </div>

                                    <div className="space-y-4">
                                        {events.map((ev) => {
                                            const badge = dayBadge(ev.dateYmd);
                                            const canCheckin = ev.checkinEnabled;
                                            const isCheckedIn =
                                                localCheckedInOverride[ev.myAssignmentId] ?? !!ev.myCheckedInAt;
                                            const isPending = pendingAssignmentIds.has(ev.myAssignmentId);
                                            return (
                                                <article
                                                    key={`${ev.dateYmd}-${ev.ministryId}`}
                                                    className={`overflow-hidden rounded-3xl border shadow-sm ${
                                                        isCheckedIn
                                                            ? 'border-brand-300 bg-brand-50/40 dark:border-brand-700 dark:bg-brand-950/25'
                                                            : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
                                                    }`}
                                                >
                                                    <div className="p-4 sm:p-5">
                                                        <div className="flex items-start gap-4">
                                                            <div
                                                                className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl border text-zinc-900 dark:text-white ${
                                                                    isCheckedIn
                                                                        ? 'border-brand-300 bg-brand-100/80 dark:border-brand-700 dark:bg-brand-900/30'
                                                                        : canCheckin
                                                                          ? 'border-brand-200 bg-brand-50 dark:border-brand-800 dark:bg-brand-950/25'
                                                                          : 'border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800'
                                                                }`}
                                                            >
                                                                <span className="text-[10px] font-extrabold uppercase tracking-wide text-zinc-600 dark:text-zinc-200">
                                                                    {badge.wd}
                                                                </span>
                                                                <span className="text-2xl font-black leading-none">{badge.day}</span>
                                                            </div>

                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div className="min-w-0">
                                                                        <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                                                                            {ev.ministryName}
                                                                        </p>
                                                                        <p className="mt-1 text-xl font-black tracking-tight text-zinc-900 dark:text-white">
                                                                            {ev.myRoleName ?? 'Serviço'}
                                                                        </p>
                                                                        {(ev.myStartTime || ev.myEndTime) && (
                                                                            <p className="mt-1 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                                                                {ev.myStartTime ?? '—'}
                                                                                {ev.myEndTime ? `–${ev.myEndTime}` : ''}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="border-t border-zinc-100 p-4 dark:border-zinc-800">
                                                        <button
                                                            type="button"
                                                            disabled={!canCheckin || isPending}
                                                            onClick={() => void doToggleCheckin(ev.myAssignmentId, ev.dateYmd, isCheckedIn)}
                                                            className={`w-full rounded-2xl px-4 py-3 text-sm font-extrabold uppercase tracking-wider transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                                                                !canCheckin
                                                                    ? 'cursor-not-allowed border border-zinc-200 bg-zinc-100 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-500'
                                                                    : isCheckedIn
                                                                      ? 'bg-brand-700 text-white shadow-sm hover:bg-brand-800 focus-visible:ring-brand-500 dark:bg-brand-600 dark:hover:bg-brand-500'
                                                                      : 'border border-zinc-200 bg-white text-zinc-900 shadow-sm hover:bg-zinc-50 focus-visible:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800'
                                                            }`}
                                                        >
                                                            {!canCheckin
                                                                ? 'Check-in fechado'
                                                                : isPending
                                                                  ? 'Aguarde...'
                                                                  : isCheckedIn
                                                                    ? 'Desfazer check-in'
                                                                    : 'Check in'}
                                                        </button>
                                                    </div>
                                                </article>
                                            );
                                        })}
                                    </div>
                                </section>
                            );
                        })}

                        <Link
                            href={route('mobile.schedule.full', { month: months[0]?.month, year: months[0]?.year })}
                            className="block w-full rounded-2xl border border-zinc-200 bg-white px-4 py-4 text-center text-sm font-extrabold uppercase tracking-wider text-zinc-900 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
                        >
                            Escala completa
                        </Link>
                    </>
                )}
            </div>
        </MobileLayout>
    );
}

