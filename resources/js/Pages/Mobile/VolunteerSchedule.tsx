import AdminLayout from '@/Layouts/MobileLayout';
import ScheduleLoginGate from '@/Components/ScheduleLoginGate';
import { Head, router } from '@inertiajs/react';
import { ChevronLeftIcon, ChevronRightIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
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

    const doCheckin = (assignmentId: number) => {
        router.post(route('escalas.checkin'), { assignment_id: assignmentId }, inertiaScroll);
    };

    const formatDay = (ymd: string) => {
        const d = new Date(ymd + 'T12:00:00');
        return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
    };

    return (
        <AdminLayout>
            <Head title="Minha escala" />
            <div className="space-y-6 max-w-3xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Minha escala</h1>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                            Os seus serviços como voluntário e quem está na equipe consigo.
                        </p>
                    </div>
                    {canViewSchedule && memberName && (
                        <div className="flex items-center gap-3">
                            {memberPhotoUrl ? (
                                <img
                                    src={memberPhotoUrl}
                                    alt=""
                                    className="h-12 w-12 rounded-full object-cover ring-2 ring-zinc-200 dark:ring-zinc-600"
                                />
                            ) : (
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-200 text-lg font-semibold text-zinc-700 ring-2 ring-zinc-200 dark:bg-zinc-600 dark:text-zinc-200 dark:ring-zinc-600">
                                    {memberName.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <span className="font-medium text-zinc-900 dark:text-white">{memberName}</span>
                        </div>
                    )}
                </div>

                {!canViewSchedule && <ScheduleLoginGate />}

                {canViewSchedule && needsMember && (
                    <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 text-sm text-amber-900 dark:text-amber-200">
                        O seu utilizador ainda não está associado a um membro. Peça à secretaria para concluir o
                        cadastro e poder ver a sua escala.
                    </div>
                )}

                {canViewSchedule && !needsMember && volunteerOverview && (
                    <>
                        {volunteerOverview.departments.length > 0 && (
                            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
                                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
                                    Os meus departamentos
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {volunteerOverview.departments.map((d) => {
                                        const Icon = getMinistryIcon(d.name);
                                        return (
                                            <span
                                                key={d.id}
                                                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-600 px-3 py-1.5 text-sm text-zinc-800 dark:text-zinc-200"
                                            >
                                                <Icon className="w-4 h-4 text-zinc-500" />
                                                {d.name}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between gap-4">
                            <button
                                type="button"
                                onClick={prevMonth}
                                className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                aria-label="Mês anterior"
                            >
                                <ChevronLeftIcon className="w-5 h-5" />
                            </button>
                            <span className="font-semibold text-zinc-900 dark:text-white capitalize">{monthLabel}</span>
                            <button
                                type="button"
                                onClick={nextMonth}
                                className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                aria-label="Próximo mês"
                            >
                                <ChevronRightIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {!volunteerOverview.hasVolunteerProfile && (
                            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 p-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
                                Ainda não há cadastro de voluntário associado ao seu membro. Quando a secretaria o
                                inscrever num departamento, a escala aparecerá aqui.
                            </div>
                        )}

                        {volunteerOverview.hasVolunteerProfile && volunteerOverview.events.length === 0 && (
                            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                                Nenhuma escala sua neste mês nos departamentos em que participa.
                            </div>
                        )}

                        <div className="space-y-4">
                            {volunteerOverview.events.map((ev) => (
                                <section
                                    key={`${ev.dateYmd}-${ev.ministryId}`}
                                    className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden"
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
                                                    {t.memberPhotoUrl ? (
                                                        <img
                                                            src={t.memberPhotoUrl}
                                                            alt=""
                                                            className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-zinc-100 dark:ring-zinc-800"
                                                        />
                                                    ) : (
                                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm font-semibold text-zinc-700 ring-2 ring-zinc-100 dark:bg-zinc-700 dark:text-zinc-200 dark:ring-zinc-800">
                                                            {t.memberName.charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
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
                                                            {t.checkedInAt ? (
                                                                <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                                                    <CheckCircleIcon className="w-4 h-4" /> Check-in
                                                                    feito
                                                                </span>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => doCheckin(t.assignmentId)}
                                                                    className="text-xs px-3 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700"
                                                                >
                                                                    Check-in
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </AdminLayout>
    );
}
