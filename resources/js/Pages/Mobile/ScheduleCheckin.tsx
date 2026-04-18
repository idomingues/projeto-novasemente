import MobileLayout from '@/Layouts/MobileLayout';
import { Head, router } from '@inertiajs/react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

type Assignment = {
    id: number;
    memberName: string;
    memberPhotoUrl: string | null;
    ministryName?: string | null;
    roleName: string | null;
    scheduleDate: string | null;
    saturdayNumber: number | null;
    checkedInAt: string | null;
};

interface Props {
    date: string;
    dateLabel: string;
    assignments: Assignment[];
    checkinEnabled: boolean;
    needsMember: boolean;
    ministryName?: string | null;
}

export default function ScheduleCheckin({
    dateLabel,
    assignments,
    checkinEnabled,
    needsMember,
    ministryName,
}: Props) {
    const inertiaScrollOpts = { preserveScroll: true };

    const doCheckin = (assignmentId: number) => {
        router.post(route('escalas.checkin'), { assignment_id: assignmentId }, inertiaScrollOpts);
    };

    return (
        <MobileLayout>
            <Head title={`Check-in ${dateLabel}`} />
            <div className="space-y-4">
                <div>
                    <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Check-in</h1>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{dateLabel}</p>
                    {ministryName ? (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{ministryName}</p>
                    ) : null}
                </div>

                {needsMember && (
                    <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 text-sm text-amber-900 dark:text-amber-200">
                        A sua conta precisa de um membro ou de um cadastro de voluntário ligado para ver a escala e fazer
                        check-in. Peça à secretaria para vincular o cadastro.
                    </div>
                )}

                {!needsMember && !checkinEnabled && (
                    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 text-sm text-zinc-600 dark:text-zinc-400">
                        O check-in para este dia ainda não foi liberado pela equipe de escala.
                    </div>
                )}

                {!needsMember && checkinEnabled && assignments.length === 0 && (
                    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 text-sm text-zinc-600 dark:text-zinc-400">
                        Não há escala registada para si nesta data.
                    </div>
                )}

                {!needsMember && checkinEnabled && assignments.length > 0 && (
                    <ul className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                        {assignments.map((a) => (
                            <li key={a.id} className="px-4 py-4 flex gap-4 items-start">
                                {a.memberPhotoUrl ? (
                                    <img
                                        src={a.memberPhotoUrl}
                                        alt=""
                                        className="w-14 h-14 rounded-2xl object-cover flex-shrink-0 border border-zinc-200 dark:border-zinc-700"
                                    />
                                ) : (
                                    <div className="w-14 h-14 rounded-2xl bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-lg font-semibold text-zinc-700 dark:text-zinc-300 flex-shrink-0">
                                        {a.memberName.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    {a.ministryName && (
                                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                                            {a.ministryName}
                                        </p>
                                    )}
                                    <p className="font-medium text-zinc-900 dark:text-white">{a.roleName ?? 'Voluntário'}</p>
                                    {a.checkedInAt ? (
                                        <p className="mt-2 inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                                            <CheckCircleIcon className="w-5 h-5" /> Presença registada
                                        </p>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => doCheckin(a.id)}
                                            className="mt-2 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
                                        >
                                            Confirmar presença
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </MobileLayout>
    );
}
