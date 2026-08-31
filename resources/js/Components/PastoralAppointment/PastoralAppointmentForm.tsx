import { useForm } from '@inertiajs/react';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import SelectInput from '@/Components/SelectInput';
import PrimaryButton from '@/Components/PrimaryButton';
import InputError from '@/Components/InputError';
import { FormEventHandler, useMemo } from 'react';
import { inertiaListModalSave } from '@/utils/inertiaListModalSave';

export interface PastoralSlotOpt {
    value: string;
    label: string;
    modality: string;
}

export interface PastoralPastorOpt {
    id: number;
    name: string;
    slots: PastoralSlotOpt[];
}

export interface PastoralAppointmentFormProps {
    pastors: PastoralPastorOpt[];
    storeUrl: string;
    defaultRequesterName: string;
    /** Prefixo para ids únicos (ex.: `more` no modal, `page` na página dedicada). */
    fieldIdPrefix?: string;
    initialPastorId?: number | string | null;
    onSuccess?: () => void;
}

export default function PastoralAppointmentForm({
    pastors,
    storeUrl,
    defaultRequesterName,
    fieldIdPrefix = 'pa',
    initialPastorId = null,
    onSuccess,
}: PastoralAppointmentFormProps) {
    const id = (suffix: string) => `${fieldIdPrefix}_${suffix}`;
    const hideRequesterName = defaultRequesterName.trim() !== '';
    const initialPastor =
        initialPastorId !== null && initialPastorId !== undefined && String(initialPastorId) !== ''
            ? String(initialPastorId)
            : '';

    const { data, setData, post, processing, errors } = useForm({
        requester_name: defaultRequesterName,
        preferred_pastor_id: initialPastor as string | number,
        subject: '',
        notes: '',
        preferred_start: '',
        preferred_modality: '' as '' | 'presential' | 'online',
    });

    const selectedPastor = useMemo(() => {
        const pid = data.preferred_pastor_id === '' ? null : Number(data.preferred_pastor_id);
        if (pid === null || Number.isNaN(pid)) return null;
        return pastors.find((p) => p.id === pid) ?? null;
    }, [pastors, data.preferred_pastor_id]);

    const selectedSlot = useMemo(() => {
        if (!selectedPastor || !data.preferred_start) return null;
        return selectedPastor.slots.find((s) => s.value === data.preferred_start) ?? null;
    }, [selectedPastor, data.preferred_start]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(storeUrl, {
            ...inertiaListModalSave,
            onSuccess: () => onSuccess?.(),
        });
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            {hideRequesterName ? null : (
                <div>
                    <InputLabel htmlFor={id('name')} value="Nome" />
                    <TextInput
                        id={id('name')}
                        className="mt-1 block w-full"
                        value={data.requester_name}
                        onChange={(e) => setData('requester_name', e.target.value)}
                        autoComplete="name"
                    />
                    <InputError message={errors.requester_name} className="mt-1" />
                </div>
            )}
            <div>
                <InputLabel htmlFor={id('pastor')} value="Pastor" />
                <SelectInput
                    id={id('pastor')}
                    className="mt-1"
                    value={data.preferred_pastor_id}
                    onChange={(e) => {
                        setData('preferred_pastor_id', e.target.value);
                        setData('preferred_start', '');
                        setData('preferred_modality', '');
                    }}
                    required
                >
                    <option value="" disabled>
                        Selecione…
                    </option>
                    {pastors.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name}
                        </option>
                    ))}
                </SelectInput>
                <InputError message={errors.preferred_pastor_id} className="mt-1" />
                {pastors.length === 0 ? (
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                        Ainda não há pastores cadastrados. Entre em contato com a secretaria.
                    </p>
                ) : null}
            </div>
            {selectedPastor ? (
                <div>
                    <InputLabel htmlFor={id('slots')} value="Horário" />
                    {selectedPastor.slots.length > 0 ? (
                        <>
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                O pastor publicou horários na agenda — escolha um dos horários abaixo.
                            </p>
                            <ul className="mt-2 space-y-2" id={id('slots')} role="radiogroup" aria-label="Horários disponíveis">
                                {selectedPastor.slots.map((slot) => (
                                    <li key={slot.value}>
                                        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2.5 has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 dark:has-[:checked]:border-primary-600 dark:has-[:checked]:bg-primary-950/30">
                                            <input
                                                type="radio"
                                                name={`${fieldIdPrefix}_preferred_start_slot`}
                                                className="mt-1"
                                                value={slot.value}
                                                checked={data.preferred_start === slot.value}
                                                onChange={() => {
                                                    setData('preferred_start', slot.value);
                                                    setData('preferred_modality', '');
                                                }}
                                            />
                                            <span className="text-sm text-zinc-800 dark:text-zinc-200">{slot.label}</span>
                                        </label>
                                    </li>
                                ))}
                            </ul>
                        </>
                    ) : (
                        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                            No momento, os horários deste pastor estão todos preenchidos. Tente novamente mais tarde.
                        </p>
                    )}
                    {selectedSlot?.modality === 'both' && selectedPastor.slots.length > 0 ? (
                        <div className="mt-4 space-y-2">
                            <InputLabel value="Modalidade" />
                            <div className="flex flex-col gap-2">
                                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 dark:border-zinc-700 has-[:checked]:border-primary-500 dark:has-[:checked]:border-primary-600">
                                    <input
                                        type="radio"
                                        name={`${fieldIdPrefix}_preferred_modality`}
                                        value="presential"
                                        checked={data.preferred_modality === 'presential'}
                                        onChange={() => setData('preferred_modality', 'presential')}
                                    />
                                    <span className="text-sm text-zinc-800 dark:text-zinc-200">Presencial (na igreja)</span>
                                </label>
                                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 dark:border-zinc-700 has-[:checked]:border-primary-500 dark:has-[:checked]:border-primary-600">
                                    <input
                                        type="radio"
                                        name={`${fieldIdPrefix}_preferred_modality`}
                                        value="online"
                                        checked={data.preferred_modality === 'online'}
                                        onChange={() => setData('preferred_modality', 'online')}
                                    />
                                    <span className="text-sm text-zinc-800 dark:text-zinc-200">Online (videoconferência)</span>
                                </label>
                            </div>
                            <InputError message={errors.preferred_modality} className="mt-1" />
                        </div>
                    ) : null}
                    <InputError message={errors.preferred_start} className="mt-2" />
                </div>
            ) : null}
            <div>
                <InputLabel htmlFor={id('sub')} value="Assunto (opcional)" />
                <TextInput
                    id={id('sub')}
                    className="mt-1 block w-full"
                    value={data.subject}
                    onChange={(e) => setData('subject', e.target.value)}
                />
                <InputError message={errors.subject} className="mt-1" />
            </div>
            <div>
                <InputLabel htmlFor={id('notes')} value="O que gostaria de tratar?" />
                <textarea
                    id={id('notes')}
                    className="mt-1 block w-full rounded-xl border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 px-3 py-2 text-sm"
                    rows={4}
                    value={data.notes}
                    onChange={(e) => setData('notes', e.target.value)}
                />
                <InputError message={errors.notes} className="mt-1" />
            </div>
            <PrimaryButton
                type="submit"
                className="w-full cursor-pointer justify-center"
                disabled={
                    processing ||
                    pastors.length === 0 ||
                    data.preferred_pastor_id === '' ||
                    !selectedPastor ||
                    selectedPastor.slots.length === 0
                }
            >
                Enviar pedido
            </PrimaryButton>
        </form>
    );
}
