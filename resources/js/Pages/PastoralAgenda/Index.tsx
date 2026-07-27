import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';
import { EyeIcon } from '@heroicons/react/24/outline';
import { CalendarDaysIcon, PlusIcon } from '@heroicons/react/24/solid';
import { useMemo, useRef, useState } from 'react';
import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import PastoralAgendaModuleShell from '@/Components/PastoralAgenda/PastoralAgendaModuleShell';
import PastoralWeeklyScheduleEditor, {
    type PastoralAppointmentSlotMatch,
    type PastoralWeeklyScheduleEditorHandle,
    type ScheduleRow,
} from '@/Components/PastoralAgenda/PastoralWeeklyScheduleEditor';

function memberBookingModalityLabel(m: string | null | undefined): string {
    if (m === 'presential') return 'Presencial';
    if (m === 'online') return 'Online';
    return '';
}

type PastoralAvailabilityRow = {
    id: number;
    date: string; // YYYY-MM-DD
    start: string; // H:i
    end: string; // H:i
    modality: string;
    note?: string | null;
    bookable_by_members?: boolean;
};

interface Props {
    pastor: { id: number; name: string; weekly_schedule: ScheduleRow[]; updated_at?: string | null };
    pastoralAppointments: PastoralAppointmentSlotMatch[];
    pastoralAvailabilities: PastoralAvailabilityRow[];
    availabilityStoreUrl: string;
    availabilityUpdateUrlTemplate: string;
    availabilityDestroyUrlTemplate: string;
    scheduleTimezone: string;
    scheduleAnchorIso: string;
    editingAsDelegate?: boolean;
    /** Conta logada é a do perfil de pastor (não delegado a editar outro). */
    linkedAccountPastorAgenda?: boolean;
    pastoralModuleNavUrl: string | null;
}

export default function PastoralAgendaIndex({
    pastor,
    pastoralAppointments,
    pastoralAvailabilities,
    availabilityStoreUrl,
    availabilityUpdateUrlTemplate,
    availabilityDestroyUrlTemplate,
    scheduleTimezone,
    scheduleAnchorIso,
    editingAsDelegate = false,
    linkedAccountPastorAgenda = false,
    pastoralModuleNavUrl,
}: Props) {
    const editorRef = useRef<PastoralWeeklyScheduleEditorHandle>(null);
    const [openedDetail, setOpenedDetail] = useState<PastoralAppointmentSlotMatch | null>(null);

    const sortedAppointments = useMemo(() => {
        return [...pastoralAppointments].sort((a, b) => {
            const ta = a.startAt ? new Date(a.startAt).getTime() : Number.POSITIVE_INFINITY;
            const tb = b.startAt ? new Date(b.startAt).getTime() : Number.POSITIVE_INFINITY;
            return ta - tb;
        });
    }, [pastoralAppointments]);

    const initialRows: ScheduleRow[] = useMemo(
        () =>
            pastor.weekly_schedule?.length > 0
                ? pastor.weekly_schedule.map((r) => ({
                      weekday: r.weekday,
                      start: r.start,
                      end: r.end,
                      modality: r.modality ?? 'both',
                  }))
                : [],
        [pastor.updated_at, pastor.weekly_schedule],
    );

    const description = linkedAccountPastorAgenda
        ? 'Os compromissos abaixo são pedidos de agendamento consigo. Mais abaixo, defina as faixas em que os membros podem marcar na app.'
        : editingAsDelegate
          ? `Configure as faixas em que os membros podem marcar com ${pastor.name}. Cada alteração guarda-se automaticamente.`
          : `Defina as janelas semanais em que aceita agendamentos na app. As alterações guardam-se ao fechar o formulário; sem faixas, o pedido segue pelo chat.`;

    const pageTitle = linkedAccountPastorAgenda ? `Minha agenda · ${pastor.name}` : `Agenda pastoral · ${pastor.name}`;
    const shellEyebrow = linkedAccountPastorAgenda ? 'Minha agenda' : 'Agenda pastoral';
    const shellTitle = linkedAccountPastorAgenda ? pastor.name : `Disponibilidade — ${pastor.name}`;

    const commitmentsHeading = linkedAccountPastorAgenda ? 'Os meus compromissos' : 'Compromissos agendados neste perfil';

    function statusPillClass(status: string): string {
        if (status === 'confirmed') {
            return 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100';
        }
        if (status === 'pending') {
            return 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-100';
        }
        if (status === 'in_progress') {
            return 'border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-100';
        }
        if (status === 'cancelled') {
            return 'border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
        }
        if (status === 'completed') {
            return 'border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-100';
        }
        return 'border-zinc-200 bg-white text-zinc-700 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200';
    }

    return (
        <AdminLayout wideLayout>
            <Head title={pageTitle} />
            <PastoralAgendaModuleShell
                pastoralModuleNavUrl={pastoralModuleNavUrl}
                eyebrow={shellEyebrow}
                title={shellTitle}
                description={description}
                headerFab={
                    <button
                        type="button"
                        onClick={() => editorRef.current?.openAdd()}
                        className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-950/40 ring-2 ring-white/25 transition hover:bg-emerald-400 hover:ring-white/40 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 sm:h-14 sm:w-14"
                        aria-label="Adicionar disponibilidade"
                    >
                        <PlusIcon className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden />
                    </button>
                }
            >
                <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:p-5">
                    <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                            <CalendarDaysIcon className="h-6 w-6" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2 className="text-base font-semibold text-zinc-900 dark:text-white">{commitmentsHeading}</h2>
                            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                                {linkedAccountPastorAgenda
                                    ? 'Inclui horários escolhidos na app («visita aos pastores») e pedidos do fluxo de agenda pastoral (ordenados por data).'
                                    : 'Inclui visitas agendadas na app e outros pedidos de agenda pastoral neste perfil (ordenados por data).'}
                            </p>
                        </div>
                    </div>
                    {sortedAppointments.length === 0 ? (
                        <p className="mt-4 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-400">
                            Sem compromissos por agora. Quando um membro pedir um horário consigo, aparece aqui.
                        </p>
                    ) : (
                        <ul className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
                            {sortedAppointments.map((row) => (
                                <li key={`${row.source ?? 'pastoral_appointment'}-${row.appointmentId}`} className="py-2 first:pt-0">
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        className="flex cursor-pointer flex-col gap-2 rounded-xl px-2 py-2 outline-none transition hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-emerald-500/60 dark:hover:bg-zinc-800/60 dark:focus-visible:ring-emerald-400/50 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                                        onClick={() => setOpenedDetail(row)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                setOpenedDetail(row);
                                            }
                                        }}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                                                {row.startLabel ?? 'Data a combinar'}
                                            </p>
                                            <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-300">
                                                <span className="font-medium text-zinc-800 dark:text-zinc-200">{row.requesterLabel}</span>
                                                {row.subject ? (
                                                    <span className="text-zinc-500 dark:text-zinc-400"> · {row.subject}</span>
                                                ) : null}
                                            </p>
                                            {row.notes ? (
                                                <p className="mt-1 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">{row.notes}</p>
                                            ) : null}
                                        </div>
                                        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end md:flex-row md:items-center">
                                            <button
                                                type="button"
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/80 hover:text-emerald-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-100"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenedDetail(row);
                                                }}
                                            >
                                                <EyeIcon className="h-4 w-4 shrink-0" aria-hidden />
                                                Detalhes
                                            </button>
                                            <span
                                                className={`inline-flex w-fit rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${statusPillClass(row.status)}`}
                                            >
                                                {row.statusLabel}
                                            </span>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <PastoralWeeklyScheduleEditor
                    ref={editorRef}
                    initialRows={initialRows}
                    serverScheduleVersion={pastor.updated_at ?? ''}
                    timezone={scheduleTimezone}
                    scheduleAnchorIso={scheduleAnchorIso}
                    pastoralAppointments={pastoralAppointments}
                    availabilities={pastoralAvailabilities}
                    availabilityStoreUrl={availabilityStoreUrl}
                    availabilityUpdateUrlTemplate={availabilityUpdateUrlTemplate}
                    availabilityDestroyUrlTemplate={availabilityDestroyUrlTemplate}
                />

                <Modal
                    show={openedDetail !== null}
                    onClose={() => setOpenedDetail(null)}
                    maxWidth="lg"
                    footer={
                        openedDetail?.source === 'church_solicitation' ? (
                            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3">
                                <Link
                                    href={route('solicitations.index', {
                                        modal_kind: 'solicitation',
                                        modal_id: String(Math.abs(openedDetail.appointmentId)),
                                    })}
                                    className="text-center text-sm font-semibold text-emerald-700 underline decoration-emerald-600/40 underline-offset-2 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 sm:text-left"
                                >
                                    Abrir em Atendimento Pastoral (chat e estado)
                                </Link>
                            </div>
                        ) : undefined
                    }
                >
                    <div className="p-6 pt-12 sm:p-8 sm:pt-10">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Dados do compromisso</h2>
                        {openedDetail?.startLabel ? (
                            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{openedDetail.startLabel}</p>
                        ) : (
                            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Data a combinar</p>
                        )}
                        {openedDetail ? (
                            <>
                                <dl className="mt-6 space-y-5 text-zinc-900 dark:text-zinc-100">
                                    <div>
                                        <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                            Nome
                                        </dt>
                                        <dd className="mt-1.5 text-xl font-bold leading-snug text-zinc-950 dark:text-white">
                                            {openedDetail.requesterLabel}
                                        </dd>
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                                Estado
                                            </dt>
                                            <dd className="mt-1.5">
                                                <span
                                                    className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${statusPillClass(openedDetail.status)}`}
                                                >
                                                    {openedDetail.statusLabel}
                                                </span>
                                            </dd>
                                        </div>
                                        {memberBookingModalityLabel(openedDetail.preferredModality) ? (
                                            <div>
                                                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                                    Preferência do membro
                                                </dt>
                                                <dd className="mt-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                                                    {memberBookingModalityLabel(openedDetail.preferredModality)}
                                                </dd>
                                            </div>
                                        ) : null}
                                    </div>
                                    {openedDetail.subject ? (
                                        <div>
                                            <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                                Assunto
                                            </dt>
                                            <dd className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                                                {openedDetail.subject}
                                            </dd>
                                        </div>
                                    ) : null}
                                    <div>
                                        <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                            Observações / mensagem
                                        </dt>
                                        <dd className="mt-1.5">
                                            {openedDetail.notes ? (
                                                <div className="max-h-72 overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 text-sm leading-relaxed text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-200">
                                                    {openedDetail.notes}
                                                </div>
                                            ) : (
                                                <p className="text-sm italic text-zinc-500 dark:text-zinc-400">
                                                    O membro não deixou mensagem neste pedido.
                                                </p>
                                            )}
                                        </dd>
                                    </div>
                                </dl>
                                <p className="mt-6 text-xs text-zinc-400 dark:text-zinc-500">
                                    {openedDetail.source === 'church_solicitation'
                                        ? `Pedido na app (visita aos pastores) n.º ${Math.abs(openedDetail.appointmentId)}`
                                        : `Identificador interno do pedido: ${openedDetail.appointmentId}`}
                                </p>
                            </>
                        ) : null}
                    </div>
                </Modal>
            </PastoralAgendaModuleShell>
        </AdminLayout>
    );
}
