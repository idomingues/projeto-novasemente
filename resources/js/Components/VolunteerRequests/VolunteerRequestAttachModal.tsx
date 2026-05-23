import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import SelectInput from '@/Components/SelectInput';
import AttachVolunteerPickerModal from '@/Components/VolunteerRequests/AttachVolunteerPickerModal';
import VolunteerRequestSuggestions from '@/Components/VolunteerRequests/VolunteerRequestSuggestions';
import { useForm } from '@inertiajs/react';
import { UserPlusIcon } from '@heroicons/react/24/outline';
import { FormEventHandler, useEffect, useState } from 'react';

export type VolunteerRequestAttachTarget = {
    id: number;
    subject: string;
    attach_volunteer_url: string;
    suggest_volunteers_url: string | null;
};

type VolunteerAttachOption = {
    id: number;
    name: string;
    email: string | null;
};

interface Props {
    open: boolean;
    onClose: () => void;
    row: VolunteerRequestAttachTarget | null;
    volunteersForAttach?: VolunteerAttachOption[];
    attachVolunteerPickerUrl?: string;
    csrf: string;
    /** Ao abrir pelo ícone de sugestão inteligente. */
    autoLoadSuggestions?: boolean;
}

export default function VolunteerRequestAttachModal({
    open,
    onClose,
    row,
    volunteersForAttach = [],
    attachVolunteerPickerUrl,
    csrf,
    autoLoadSuggestions = false,
}: Props) {
    const [attachPickerOpen, setAttachPickerOpen] = useState(false);
    const [attachPickerChoice, setAttachPickerChoice] = useState<{ id: number; name: string } | null>(null);
    const [suggestionsKey, setSuggestionsKey] = useState(0);

    const attachForm = useForm({
        volunteer_id: '' as '' | number,
    });

    useEffect(() => {
        if (!open) {
            attachForm.reset();
            attachForm.clearErrors();
            setAttachPickerChoice(null);
            setAttachPickerOpen(false);
            return;
        }
        attachForm.setData('volunteer_id', '');
        attachForm.clearErrors();
        setAttachPickerChoice(null);
        setSuggestionsKey((k) => k + 1);
    }, [open, row?.id]);

    const close = () => {
        onClose();
    };

    const submitAttach: FormEventHandler = (e) => {
        e.preventDefault();
        if (!row?.attach_volunteer_url) return;
        attachForm.post(row.attach_volunteer_url, {
            preserveScroll: true,
            onSuccess: () => {
                close();
            },
        });
    };

    const selectVolunteer = (id: number, name: string) => {
        setAttachPickerChoice({ id, name });
        attachForm.setData('volunteer_id', id);
        attachForm.clearErrors('volunteer_id');
    };

    return (
        <>
            <Modal
                show={open && row !== null}
                onClose={close}
                maxWidth="2xl"
                footer={
                    row ? (
                        <div className="flex flex-wrap justify-end gap-2">
                            <SecondaryButton type="button" onClick={close}>
                                Cancelar
                            </SecondaryButton>
                            <PrimaryButton
                                type="submit"
                                form="volunteer-request-attach-modal-form"
                                disabled={
                                    attachForm.processing ||
                                    attachForm.data.volunteer_id === '' ||
                                    (!attachVolunteerPickerUrl && volunteersForAttach.length === 0)
                                }
                            >
                                Vincular e concluir
                            </PrimaryButton>
                        </div>
                    ) : null
                }
            >
                {row ? (
                    <div className="space-y-5 p-6">
                        <div className="flex items-start gap-3">
                            <UserPlusIcon className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                            <div className="min-w-0">
                                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Vincular voluntário</h2>
                                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{row.subject}</p>
                                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                                    Será criado o convite ao departamento do pedido. O pedido passa a{' '}
                                    <strong className="font-medium text-zinc-800 dark:text-zinc-200">concluído</strong> e o
                                    voluntário entra na fase «Encaminhado», quando existir.
                                </p>
                            </div>
                        </div>

                        {row.suggest_volunteers_url ? (
                            <VolunteerRequestSuggestions
                                key={`${row.id}-${suggestionsKey}`}
                                suggestUrl={row.suggest_volunteers_url}
                                csrf={csrf}
                                selectedVolunteerId={attachForm.data.volunteer_id}
                                onSelectVolunteer={selectVolunteer}
                                embedded
                                autoLoad={autoLoadSuggestions}
                            />
                        ) : null}

                        <form id="volunteer-request-attach-modal-form" onSubmit={submitAttach} className="space-y-4">
                            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
                                <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Seleção manual</h3>
                                {volunteersForAttach.length === 0 && !attachVolunteerPickerUrl ? (
                                    <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">
                                        Não há voluntários listáveis. Crie cadastros em <strong>Voluntários</strong> antes de
                                        vincular.
                                    </p>
                                ) : volunteersForAttach.length === 0 && attachVolunteerPickerUrl ? (
                                    <div className="mt-3 space-y-3">
                                        <p className="text-sm text-zinc-700 dark:text-zinc-300">
                                            Use o quadro completo para procurar o voluntário.
                                        </p>
                                        <SecondaryButton type="button" onClick={() => setAttachPickerOpen(true)}>
                                            Abrir filtros do cadastro
                                        </SecondaryButton>
                                        {attachForm.data.volunteer_id !== '' ? (
                                            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                                                Selecionado:{' '}
                                                {attachPickerChoice?.id === attachForm.data.volunteer_id
                                                    ? attachPickerChoice.name
                                                    : `ID ${String(attachForm.data.volunteer_id)}`}
                                            </p>
                                        ) : null}
                                        <InputError className="mt-2" message={attachForm.errors.volunteer_id} />
                                    </div>
                                ) : (
                                    <div className="mt-3">
                                        <InputLabel htmlFor="attach_modal_volunteer_id" value="Voluntário" />
                                        <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-end">
                                            <div className="min-w-0 flex-1">
                                                <SelectInput
                                                    id="attach_modal_volunteer_id"
                                                    name="volunteer_id"
                                                    value={
                                                        attachForm.data.volunteer_id === ''
                                                            ? ''
                                                            : String(attachForm.data.volunteer_id)
                                                    }
                                                    className="block w-full"
                                                    onChange={(e) => {
                                                        const v = e.target.value;
                                                        const id = v === '' ? '' : Number(v);
                                                        attachForm.setData(
                                                            'volunteer_id',
                                                            id === '' || Number.isNaN(id) ? '' : id,
                                                        );
                                                        if (v === '') {
                                                            setAttachPickerChoice(null);
                                                        } else {
                                                            const fromList = volunteersForAttach.find((x) => x.id === id);
                                                            if (fromList) {
                                                                setAttachPickerChoice(null);
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <option value="">Selecione o voluntário…</option>
                                                    {attachPickerChoice &&
                                                    !volunteersForAttach.some((x) => x.id === attachPickerChoice.id) ? (
                                                        <option value={String(attachPickerChoice.id)}>
                                                            {attachPickerChoice.name.trim() ||
                                                                `Voluntário #${attachPickerChoice.id}`}{' '}
                                                            (sugestão / quadro)
                                                        </option>
                                                    ) : null}
                                                    {volunteersForAttach.map((v) => (
                                                        <option key={v.id} value={String(v.id)}>
                                                            {v.name}
                                                            {v.email ? ` — ${v.email}` : ''}
                                                        </option>
                                                    ))}
                                                </SelectInput>
                                            </div>
                                            {attachVolunteerPickerUrl ? (
                                                <SecondaryButton type="button" onClick={() => setAttachPickerOpen(true)}>
                                                    Filtros
                                                </SecondaryButton>
                                            ) : null}
                                        </div>
                                        <InputError className="mt-2" message={attachForm.errors.volunteer_id} />
                                    </div>
                                )}
                            </div>
                        </form>
                    </div>
                ) : null}
            </Modal>

            {attachVolunteerPickerUrl ? (
                <AttachVolunteerPickerModal
                    open={attachPickerOpen}
                    onClose={() => setAttachPickerOpen(false)}
                    pickerUrl={attachVolunteerPickerUrl}
                    onSelectVolunteer={(id, name) => {
                        const label = (name ?? '').trim() || `Voluntário #${id}`;
                        selectVolunteer(id, label);
                    }}
                />
            ) : null}
        </>
    );
}
