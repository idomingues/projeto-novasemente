import AdminLayout from '@/Layouts/AdminLayout';
import { Head } from '@inertiajs/react';
import { PlusIcon } from '@heroicons/react/24/solid';
import { useMemo, useRef } from 'react';
import PastoralAgendaModuleShell from '@/Components/PastoralAgenda/PastoralAgendaModuleShell';
import PastoralWeeklyScheduleEditor, {
    type PastoralAppointmentSlotMatch,
    type PastoralWeeklyScheduleEditorHandle,
    type ScheduleRow,
} from '@/Components/PastoralAgenda/PastoralWeeklyScheduleEditor';

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
    pastoralModuleNavUrl,
}: Props) {
    const editorRef = useRef<PastoralWeeklyScheduleEditorHandle>(null);

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

    const description = editingAsDelegate
        ? `Configure as faixas em que os membros podem marcar com ${pastor.name}. Cada alteração guarda-se automaticamente.`
        : `Defina as janelas semanais em que aceita agendamentos na app. As alterações guardam-se ao fechar o formulário; sem faixas, o pedido segue pelo chat.`;

    return (
        <AdminLayout wideLayout>
            <Head title={`Agenda pastoral · ${pastor.name}`} />
            <PastoralAgendaModuleShell
                pastoralModuleNavUrl={pastoralModuleNavUrl}
                eyebrow="Agenda pastoral"
                title={`Disponibilidade — ${pastor.name}`}
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
            </PastoralAgendaModuleShell>
        </AdminLayout>
    );
}
