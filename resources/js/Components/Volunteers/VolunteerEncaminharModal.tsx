import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import SortedMultiCheckboxList from '@/Components/SortedMultiCheckboxList';
import type { FormEventHandler } from 'react';

type MinistryOption = { id: number; name: string };

type Props = {
    show: boolean;
    volunteerName: string;
    ministries: MinistryOption[];
    blockedMinistryIds: Set<number>;
    selectedIds: number[];
    onChangeSelectedIds: (ids: number[]) => void;
    onClose: () => void;
    onSubmit: FormEventHandler;
};

export default function VolunteerEncaminharModal({
    show,
    volunteerName,
    ministries,
    blockedMinistryIds,
    selectedIds,
    onChangeSelectedIds,
    onClose,
    onSubmit,
}: Props) {
    const options = ministries.map((m) => {
        const blocked = blockedMinistryIds.has(m.id);
        return {
            id: m.id,
            name: m.name,
            disabled: blocked,
            trailing: blocked ? 'Já encaminhado' : null,
        };
    });
    const allBlocked = ministries.length > 0 && ministries.every((m) => blockedMinistryIds.has(m.id));

    return (
        <Modal show={show} onClose={onClose} maxWidth="lg" disableBodyScroll>
            <div className="flex max-h-[min(100dvh-1rem,720px)] min-h-0 w-full flex-col overflow-hidden sm:max-h-[min(90dvh,680px)]">
                <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-y-contain p-6">
                        <div>
                            <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">
                                Encaminhar voluntário
                            </h2>
                            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                                {volunteerName} — escolha um ou mais departamentos. O voluntário{' '}
                                <strong className="font-semibold text-zinc-800 dark:text-zinc-100">não</strong> é
                                notificado agora; cada líder envia o convite em{' '}
                                <strong className="font-semibold">Meus voluntários</strong>.
                            </p>
                        </div>
                        <div>
                            {ministries.length === 0 ? (
                                <p className="text-sm text-zinc-500">Nenhum departamento disponível para encaminhar.</p>
                            ) : allBlocked ? (
                                <p className="text-sm text-zinc-500">
                                    Este voluntário já foi encaminhado para todos os departamentos disponíveis.
                                </p>
                            ) : (
                                <SortedMultiCheckboxList
                                    className="mt-1"
                                    options={options}
                                    selectedIds={selectedIds}
                                    onChange={onChangeSelectedIds}
                                    maxHeightClass="max-h-[min(40vh,280px)]"
                                    emptyMessage="Nenhum departamento disponível para encaminhar."
                                />
                            )}
                        </div>
                    </div>
                    <div className="flex shrink-0 justify-end gap-2 border-t border-zinc-200 bg-zinc-50/80 px-6 py-4 dark:border-zinc-700 dark:bg-zinc-900/50">
                        <SecondaryButton type="button" onClick={onClose}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton
                            type="submit"
                            title="Encaminhar voluntário para os departamentos selecionados"
                            disabled={selectedIds.length === 0 || allBlocked}
                            className="cursor-pointer"
                        >
                            Encaminhar
                        </PrimaryButton>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
