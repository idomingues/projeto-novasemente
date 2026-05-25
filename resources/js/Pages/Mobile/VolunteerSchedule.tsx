import AdminLayout from '@/Layouts/MobileLayout';
import ScheduleLoginGate from '@/Components/ScheduleLoginGate';
import UserListAvatar from '@/Components/UserListAvatar';
import { Head, router } from '@inertiajs/react';
import { CalendarDaysIcon, CheckCircleIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { getMinistryIcon } from '@/lib/ministryIcons';

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
    checkinEnabled: boolean;
    myCheckedInAt?: string | null;
    teammates: Teammate[];
};

type VolunteerOverview = {
    events: ScheduleEvent[];
    departments: { id: number; name: string }[];
    hasVolunteerProfile: boolean;
};

interface Props {
    canViewSchedule: boolean;
    month: number;
    year: number;
    memberName: string | null;
    memberPhotoUrl: string | null;
    needsMember: boolean;
    volunteerOverview: VolunteerOverview | null;
}

export default function VolunteerSchedule({
    canViewSchedule,
    month,
    year,
    memberName,
    memberPhotoUrl,
    needsMember,
    volunteerOverview,
}: Props) {
    const inertiaScroll = { preserveScroll: true };

    const reload = (m: number, y: number) => {
        router.get(route('mobile.schedule'), { month: m, year: y }, { preserveState: false });
    };

    const prevMonth = () => {
        let m = month - 1;
        let y = year;
        if (m < 1) {
            m = 12;
            y -= 1;
        }
        reload(m, y);
    };

    const nextMonth = () => {
        let m = month + 1;
        let y = year;
        if (m > 12) {
            m = 1;
            y += 1;
        }
        reload(m, y);
    };

    const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(
        new Date(year, month - 1, 1),
    );

    const doCheckin = (assignmentId: number, dateYmd: string) => {
        router.post(route('escalas.checkin'), { assignment_id: assignmentId, schedule_date: dateYmd }, inertiaScroll);
    };

    const formatDay = (ymd: string) => {
        const d = new Date(ymd + 'T12:00:00');
        return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
    };

    return (
        <AdminLayout>
            <Head title="Minha escala" />
            <div className="mx-auto w-full max-w-3xl space-y-6 lg:max-w-6xl">
                <header className="rounded-3xl border border-zinc-200 bg-white/80 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-200">
                                <CalendarDaysIcon className="h-6 w-6" aria-hidden />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                    Meu perfil
                                </p>
                                <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                                    Minha escala
                                </h1>
                                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                    Os seus serviços como voluntário e quem está na equipe consigo.
                                </p>
                            </div>
                        </div>

                        {canViewSchedule && memberName ? (
                            <div className="flex items-center gap-3 self-start">
                                <UserListAvatar name={memberName} photoUrl={memberPhotoUrl} size="md" />
                                <span className="font-medium text-zinc-900 dark:text-white">{memberName}</span>
                            </div>
                        ) : null}
                    </div>
                </header>

                {!canViewSchedule && <ScheduleLoginGate />}

                {canViewSchedule && needsMember && (
                    <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 text-sm text-amber-900 dark:text-amber-200">
                        O seu usuário ainda não está associado a um membro. Peça à secretaria para concluir o
                        cadastro e poder ver a sua escala.
                    </div>
                )}

                {canViewSchedule && !needsMember && volunteerOverview && (
                    <>
                        <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
                            <div className="space-y-4 lg:col-span-4">
                                {volunteerOverview.departments.length > 0 && (
                                    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                            Os meus departamentos
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {volunteerOverview.departments.map((d) => {
                                                const Icon = getMinistryIcon(d.name);
                                                return (
                                                    <span
                                                        key={d.id}
                                                        className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-1.5 text-sm text-zinc-800 dark:border-zinc-600 dark:text-zinc-200"
                                                    >
                                                        <Icon className="h-4 w-4 text-zinc-500" />
                                                        {d.name}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </section>
                                )}

                                <section className="rounded-2xl border border-zinc-200 bg-white px-2 py-2 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                                    <div className="flex items-center justify-between gap-2">
                                        <button
                                            type="button"
                                            onClick={prevMonth}
                                            className="rounded-xl p-2 text-zinc-600 transition hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/50 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:focus-visible:ring-brand-400/40"
                                            aria-label="Mês anterior"
                                        >
                                            <ChevronLeftIcon className="h-5 w-5" />
                                        </button>
                                        <span className="px-2 text-center text-sm font-semibold capitalize text-zinc-900 dark:text-white">
                                            {monthLabel}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={nextMonth}
                                            className="rounded-xl p-2 text-zinc-600 transition hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/50 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:focus-visible:ring-brand-400/40"
                                            aria-label="Próximo mês"
                                        >
                                            <ChevronRightIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </section>
                            </div>

                        {!volunteerOverview.hasVolunteerProfile && (
                            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400 lg:col-span-8">
                                Ainda não há cadastro de voluntário associado ao seu membro. Quando a secretaria o
                                inscrever num departamento, a escala aparecerá aqui.
                            </div>
                        )}

                        {volunteerOverview.hasVolunteerProfile && volunteerOverview.events.length === 0 && (
                            <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 lg:col-span-8">
                                Nenhuma escala sua neste mês nos departamentos em que participa.
                            </div>
                        )}

                        <div className="space-y-4 lg:col-span-8">
                            {volunteerOverview.events.map((ev) => (
                                <section
                                    key={`${ev.dateYmd}-${ev.ministryId}`}
                                    className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                                >
                                    <div className="px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 capitalize">
                                            {formatDay(ev.dateYmd)}
                                        </p>
                                        <p className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2 mt-0.5">
                                            {(() => {
                                                const Icon = getMinistryIcon(ev.ministryName);
                                                return <Icon className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />;
                                            })()}
                                            {ev.ministryName}
                                        </p>
                                        <p className="mt-1 text-sm text-brand-700 dark:text-brand-300">
                                            A sua função: {ev.myRoleName ?? '—'}
                                        </p>
                                    </div>
                                    {ev.checkinEnabled && (() => {
                                        const checkedIn = ev.teammates.filter((t) => t.checkedInAt).length;
                                        const teamTotal = ev.teammates.length;
                                        const pct = teamTotal > 0 ? Math.round((checkedIn / teamTotal) * 100) : 0;
                                        return (
                                            <div className="border-b border-zinc-100 bg-brand-50/70 px-4 py-3 dark:border-zinc-800 dark:bg-brand-950/25">
                                                <div className="mb-2 flex items-center justify-between gap-2">
                                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-800 dark:text-brand-300">
                                                        Check-in da equipe
                                                    </p>
                                                    <p className="text-lg font-bold tabular-nums text-zinc-900 dark:text-white">
                                                        {checkedIn}
                                                        <span className="text-sm font-semibold text-zinc-400 dark:text-zinc-500">
                                                            /{teamTotal}
                                                        </span>
                                                    </p>
                                                </div>
                                                <div className="h-2 overflow-hidden rounded-full bg-zinc-200/80 dark:bg-zinc-800">
                                                    <div
                                                        className="h-full rounded-full bg-brand-600 transition-all dark:bg-brand-500"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })()}
                                    <div className="border-b border-zinc-100 px-4 py-2 dark:border-zinc-800">
                                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                            Membros escalados
                                        </p>
                                    </div>
                                    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                        {ev.teammates.map((t) => (
                                            <li
                                                key={t.assignmentId}
                                                className="px-4 py-3 flex gap-3 items-center justify-between flex-wrap"
                                            >
                                                <div className="flex gap-3 min-w-0">
                                                    <UserListAvatar name={t.memberName} photoUrl={t.memberPhotoUrl} size="md" />
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-zinc-900 dark:text-white">
                                                            {t.memberName}
                                                            {t.isMe && (
                                                                <span className="ml-2 text-xs text-primary-600 dark:text-primary-400">
                                                                    (você)
                                                                </span>
                                                            )}
                                                        </p>
                                                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                                            {t.roleName ?? 'Sem função'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {t.isMe && ev.checkinEnabled && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                    onClick={() => doCheckin(t.assignmentId, ev.dateYmd)}
                                                                className={`inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                                                                    t.checkedInAt
                                                                        ? 'bg-brand-700 text-white hover:bg-brand-800 focus-visible:ring-brand-500 dark:bg-brand-600 dark:hover:bg-brand-500'
                                                                        : 'bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-500 dark:bg-brand-500 dark:hover:bg-brand-400'
                                                                }`}
                                                            >
                                                                {t.checkedInAt ? 'Desfazer check-in' : 'Check-in'}
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            ))}
                        </div>
                        </div>
                    </>
                )}
            </div>
        </AdminLayout>
    );
}
