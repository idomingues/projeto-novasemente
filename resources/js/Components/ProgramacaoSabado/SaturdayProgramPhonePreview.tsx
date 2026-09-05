import Modal from '@/Components/Modal';
import SaturdayProgramScheduleView, {
    type SaturdaySchedule,
} from '@/Components/Mobile/SaturdayProgramScheduleView';
import { DevicePhoneMobileIcon, XMarkIcon } from '@heroicons/react/24/outline';

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

export default function SaturdayProgramPhonePreview({ show, row, onClose }: Props) {
    const title = row?.title?.trim() || 'Programação do Sábado';
    const subtitle = formatSaturday(row?.saturday_date ?? null);
    const hasSchedule = Boolean(row?.has_schedule && row.schedule?.items?.length);

    return (
        <Modal show={show} onClose={onClose} maxWidth="sm" showCloseButton={false} disableBodyScroll>
            <div className="flex flex-col items-center gap-4 px-4 py-5 sm:px-6">
                <div className="flex w-full items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white">Pré-visualização no app</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Como o membro vê no celular</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                        aria-label="Fechar pré-visualização"
                    >
                        <XMarkIcon className="h-5 w-5" aria-hidden />
                    </button>
                </div>

                {/* Moldura de celular */}
                <div className="relative w-full max-w-[340px]">
                    <div className="rounded-[2.25rem] bg-zinc-900 p-2.5 shadow-xl ring-1 ring-zinc-800 dark:bg-zinc-950 dark:ring-zinc-700">
                        {/* Notch */}
                        <div className="relative overflow-hidden rounded-[1.85rem] bg-zinc-50 dark:bg-zinc-900">
                            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center pt-2" aria-hidden>
                                <div className="h-5 w-28 rounded-full bg-zinc-900 dark:bg-black" />
                            </div>

                            <div className="flex h-[min(72vh,640px)] flex-col">
                                {/* Status bar fake */}
                                <div className="flex shrink-0 items-center justify-between px-5 pb-1 pt-3 text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">
                                    <span>9:41</span>
                                    <span className="flex items-center gap-1">
                                        <DevicePhoneMobileIcon className="h-3 w-3" aria-hidden />
                                        App
                                    </span>
                                </div>

                                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 pb-5 pt-1">
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
                                </div>

                                {/* Home indicator */}
                                <div className="flex shrink-0 justify-center pb-2 pt-1" aria-hidden>
                                    <div className="h-1 w-28 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
