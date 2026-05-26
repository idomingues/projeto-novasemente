import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { type Dispatch, FormEventHandler, type SetStateAction } from 'react';

export type MissionPhaseEdit = {
    id: number;
    name: string;
    sort_order: number;
    sla_days: number;
};

type PhaseSnapshot = {
    id: number;
    name: string;
    sla_days: number;
    volunteer_count: number;
};

type Props = {
    show: boolean;
    onClose: () => void;
    phases: PhaseSnapshot[];
    sortedStageEdits: MissionPhaseEdit[];
    setStageEdits: Dispatch<SetStateAction<MissionPhaseEdit[]>>;
    stageOrderBusy: boolean;
    onSwap: (index: number, direction: 'up' | 'down') => void;
    onSave: (stage: MissionPhaseEdit) => void;
    onDelete: (phase: PhaseSnapshot) => void;
    newStageName: string;
    setNewStageName: (value: string) => void;
    newStageSlaDays: string;
    setNewStageSlaDays: (value: string) => void;
    onSubmitNew: FormEventHandler;
};

function stageIsDirty(edit: MissionPhaseEdit, phases: PhaseSnapshot[]): boolean {
    const server = phases.find((p) => p.id === edit.id);
    if (!server) return false;
    return edit.name.trim() !== server.name.trim() || edit.sla_days !== server.sla_days;
}

export default function MissionPhaseManageModal({
    show,
    onClose,
    phases,
    sortedStageEdits,
    setStageEdits,
    stageOrderBusy,
    onSwap,
    onSave,
    onDelete,
    newStageName,
    setNewStageName,
    newStageSlaDays,
    setNewStageSlaDays,
    onSubmitNew,
}: Props) {
    return (
        <Modal show={show} onClose={onClose} maxWidth="2xl" disableBodyScroll>
            <div className="flex max-h-[min(90dvh,720px)] min-h-0 flex-col">
                <header className="shrink-0 px-6 pb-4 pt-6 pr-12">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Gerir fases</h2>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        A ordem do quadro segue a lista. Reordene com as setas; salve nome e SLA quando alterar.
                    </p>
                </header>

                <div
                    className="hidden shrink-0 grid-cols-[6.5rem_minmax(0,1fr)_4.5rem_6.5rem] items-end gap-3 border-b border-zinc-200 px-6 pb-2 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:text-zinc-400 sm:grid"
                    aria-hidden
                >
                    <span>Ordem</span>
                    <span>Nome</span>
                    <span className="text-center">SLA</span>
                    <span className="sr-only">Ações</span>
                </div>

                <ol className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-y-contain px-6 py-3">
                    {sortedStageEdits.map((edit, index) => {
                        const phase = phases.find((p) => p.id === edit.id);
                        const dirty = stageIsDirty(edit, phases);
                        const volunteerCount = phase?.volunteer_count ?? 0;

                        return (
                            <li key={edit.id}>
                                <div className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900/50 sm:grid-cols-[6.5rem_minmax(0,1fr)_4.5rem_6.5rem] sm:items-center sm:gap-3">
                                    <div className="flex items-center gap-2 sm:contents">
                                        <div className="flex shrink-0 items-center gap-1.5 sm:flex sm:justify-center">
                                            <span
                                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-xs font-bold tabular-nums text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                                                title={`Posição ${index + 1}`}
                                            >
                                                {index + 1}
                                            </span>
                                            <div className="flex shrink-0 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-600">
                                                <button
                                                    type="button"
                                                    disabled={index === 0 || stageOrderBusy}
                                                    onClick={() => onSwap(index, 'up')}
                                                    className="p-1.5 text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-30 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                                    aria-label="Mover fase para cima"
                                                    title="Mover para cima"
                                                >
                                                    <ChevronUpIcon className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={index >= sortedStageEdits.length - 1 || stageOrderBusy}
                                                    onClick={() => onSwap(index, 'down')}
                                                    className="border-l border-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-30 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                                    aria-label="Mover fase para baixo"
                                                    title="Mover para baixo"
                                                >
                                                    <ChevronDownIcon className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                                                </button>
                                            </div>
                                        </div>
                                        <span className="text-xs font-medium text-zinc-500 sm:hidden">Ordem</span>
                                    </div>

                                    <div className="min-w-0">
                                        <label htmlFor={`mission-phase-name-${edit.id}`} className="mb-1 block text-xs font-medium text-zinc-500 sm:sr-only">
                                            Nome da fase {index + 1}
                                        </label>
                                        <TextInput
                                            id={`mission-phase-name-${edit.id}`}
                                            className="w-full"
                                            value={edit.name}
                                            onChange={(e) =>
                                                setStageEdits((rows) =>
                                                    rows.map((r) => (r.id === edit.id ? { ...r, name: e.target.value } : r)),
                                                )
                                            }
                                            placeholder="Nome da fase"
                                        />
                                        {volunteerCount > 0 ? (
                                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                                <span className="font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">
                                                    {volunteerCount}
                                                </span>{' '}
                                                cadastro{volunteerCount === 1 ? '' : 's'}
                                            </p>
                                        ) : null}
                                    </div>

                                    <div>
                                        <label htmlFor={`mission-phase-sla-${edit.id}`} className="mb-1 block text-xs font-medium text-zinc-500 sm:sr-only">
                                            SLA (dias)
                                        </label>
                                        <TextInput
                                            id={`mission-phase-sla-${edit.id}`}
                                            type="number"
                                            min={1}
                                            step={1}
                                            inputMode="numeric"
                                            className="w-full text-center sm:max-w-[4.5rem]"
                                            value={String(edit.sla_days)}
                                            onChange={(e) =>
                                                setStageEdits((rows) =>
                                                    rows.map((r) =>
                                                        r.id === edit.id ? { ...r, sla_days: Number(e.target.value) || 1 } : r,
                                                    ),
                                                )
                                            }
                                            aria-label={`SLA em dias da fase ${index + 1}`}
                                        />
                                        <span className="mt-1 block text-center text-[10px] uppercase tracking-wide text-zinc-400 sm:hidden">
                                            dias
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-end gap-2 sm:justify-end">
                                        {dirty ? (
                                            <button
                                                type="button"
                                                onClick={() => onSave(edit)}
                                                className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:bg-brand-500 dark:hover:bg-brand-400 dark:focus:ring-brand-400 dark:focus:ring-offset-zinc-900"
                                            >
                                                Salvar
                                            </button>
                                        ) : (
                                            <span className="hidden px-3 py-2 text-xs text-zinc-400 sm:inline" aria-hidden>
                                                —
                                            </span>
                                        )}
                                        {phase ? (
                                            <button
                                                type="button"
                                                onClick={() => onDelete(phase)}
                                                className="rounded-lg px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
                                            >
                                                Excluir
                                            </button>
                                        ) : null}
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ol>

                <div className="shrink-0 border-t border-zinc-200 px-6 py-4 dark:border-zinc-700">
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
                        <div className="text-sm font-semibold text-zinc-900 dark:text-white">Nova fase</div>
                        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                            A nova fase entra no fim do quadro; depois pode reordená-la com as setas.
                        </p>
                        <form onSubmit={onSubmitNew} className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_5.5rem_auto] sm:items-end">
                            <div className="min-w-0">
                                <label htmlFor="mission-new-phase-name" className="mb-1 block text-xs font-medium text-zinc-500">
                                    Nome
                                </label>
                                <TextInput
                                    id="mission-new-phase-name"
                                    className="w-full"
                                    value={newStageName}
                                    onChange={(e) => setNewStageName(e.target.value)}
                                    placeholder="Ex.: Em contato"
                                />
                            </div>
                            <div>
                                <label htmlFor="mission-new-phase-sla" className="mb-1 block text-xs font-medium text-zinc-500">
                                    SLA (dias)
                                </label>
                                <TextInput
                                    id="mission-new-phase-sla"
                                    type="number"
                                    min={1}
                                    step={1}
                                    inputMode="numeric"
                                    className="w-full text-center"
                                    value={newStageSlaDays}
                                    onChange={(e) => setNewStageSlaDays(e.target.value)}
                                />
                            </div>
                            <PrimaryButton type="submit" className="!h-10 w-full !px-5 !text-xs !normal-case !tracking-normal sm:w-auto sm:self-end">
                                Adicionar fase
                            </PrimaryButton>
                        </form>
                    </div>

                    <div className="mt-4 flex justify-end">
                        <SecondaryButton type="button" onClick={onClose} className="!h-10 !px-5 !text-xs !normal-case !tracking-normal">
                            Fechar
                        </SecondaryButton>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
