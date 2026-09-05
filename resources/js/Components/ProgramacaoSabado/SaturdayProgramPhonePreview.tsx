import AppPhonePreview from '@/Components/AppPhonePreview/AppPhonePreview';
import SaturdayProgramScheduleView, {
    type SaturdaySchedule,
} from '@/Components/Mobile/SaturdayProgramScheduleView';

export type SaturdayProgramPreviewRow = {
    title: string | null;
    saturday_date: string | null;
    has_schedule?: boolean;
    schedule?: SaturdaySchedule | null;
    pdf_url?: string | null;
};

type Props = {
    show: boolean;
    row: SaturdayProgramPreviewRow | null;
    onClose: () => void;
};

function formatSaturday(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
}

/** Pré-visualização da Programação do Sábado no moldura de celular compartilhada. */
export default function SaturdayProgramPhonePreview({ show, row, onClose }: Props) {
    const title = row?.title?.trim() || 'Programação do Sábado';
    const subtitle = formatSaturday(row?.saturday_date ?? null);
    const hasSchedule = Boolean(row?.has_schedule && row.schedule?.items?.length);

    return (
        <AppPhonePreview show={show} onClose={onClose}>
            <p className="text-[12px] font-medium text-teal-700 dark:text-teal-300">
                ← Conheça a Nova Semente
            </p>
            <h1 className="mt-2 text-[1.35rem] font-bold leading-tight tracking-tight text-zinc-900 dark:text-white">
                {title}
            </h1>
            {subtitle ? (
                <p className="mt-1 text-[12px] font-medium capitalize text-zinc-500 dark:text-zinc-400">
                    {subtitle}
                </p>
            ) : null}

            <div className="mt-4">
                {hasSchedule && row?.schedule ? (
                    <SaturdayProgramScheduleView
                        schedule={row.schedule}
                        fallbackDateLabel={subtitle || null}
                        contentKey={`preview:${row.saturday_date ?? 'x'}:${title}`}
                    />
                ) : (
                    <div className="rounded-2xl bg-white px-4 py-8 text-center shadow-sm ring-1 ring-zinc-200/90 dark:bg-zinc-900 dark:ring-zinc-700">
                        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                            Sem dados formatados ainda.
                        </p>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            {row?.pdf_url
                                ? 'No app o membro verá o leitor de PDF até a captura funcionar.'
                                : 'Publique um PDF com captura bem-sucedida para pré-visualizar.'}
                        </p>
                    </div>
                )}
            </div>
        </AppPhonePreview>
    );
}
