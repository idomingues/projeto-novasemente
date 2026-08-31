import { useForm } from '@inertiajs/react';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import SelectInput from '@/Components/SelectInput';
import PrimaryButton from '@/Components/PrimaryButton';
import InputError from '@/Components/InputError';
import { FormEventHandler, useMemo } from 'react';
import type { PastoralPastorOpt } from '@/Components/PastoralAppointment/PastoralAppointmentForm';

export interface PastoralAppointmentEditShape {
    id: number;
    status: string;
    requesterName: string | null;
    preferredPastorId: number | null;
    preferredStart: string | null;
    preferredModality: string | null;
    subject: string | null;
    notes: string | null;
}

export interface PastoralAppointmentEditFormProps {
    appointment: PastoralAppointmentEditShape;
    pastors: PastoralPastorOpt[];
    updateUrl: string;
    fieldIdPrefix?: string;
}

export default function PastoralAppointmentEditForm({
    appointment,
    pastors,
    updateUrl,
    fieldIdPrefix = 'pa_edit',
}: PastoralAppointmentEditFormProps) {
    const id = (suffix: string) => `${fieldIdPrefix}_${suffix}`;
    const isPending = appointment.status === 'pending';

    const initialPastorId =
        appointment.preferredPastorId != null ? String(appointment.preferredPastorId) : '';

    const slotValueForForm = useMemo(() => {
        if (!appointment.preferredStart || !appointment.preferredPastorId) return '';
        const p = pastors.find((x) => x.id === appointment.preferredPastorId);
        if (!p) return '';
        const match = p.slots.find((s) => {
            try {
                return new Date(s.value).getTime() === new Date(appointment.preferredStart as string).getTime();
            } catch {
                return s.value === appointment.preferredStart;
            }
        });
        return match?.value ?? '';
    }, [appointment.preferredPastorId, appointment.preferredStart, pastors]);

    const { data, setData, patch, processing, errors } = useForm({
        requester_name: appointment.requesterName ?? '',
        preferred_pastor_id: initialPastorId,
        subject: appointment.subject ?? '',
        notes: appointment.notes ?? '',
        preferred_start: slotValueForForm,
        preferred_modality: (appointment.preferredModality ?? '') as '' | 'presential' | 'online',
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
        patch(updateUrl);
    };

    const revert = () => {
        setData({
            requester_name: appointment.requesterName ?? '',
            preferred_pastor_id: initialPastorId,
            subject: appointment.subject ?? '',
            notes: appointment.notes ?? '',
            preferred_start: slotValueForForm,
            preferred_modality: (appointment.preferredModality ?? '') as '' | 'presential' | 'online',
        });
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            <div className="flex flex-wrap justify-end gap-2">
                <button
                    type="button"
                    className="cursor-pointer text-xs font-semibold text-zinc-500 underline dark:text-zinc-400"
                    onClick={revert}
                >
                    Desfazer alterações
                </button>
            </div>
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
            {isPending ? (
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
                </div>
            ) : null}
            {isPending && selectedPastor ? (
                <div>
                    <InputLabel htmlFor={id('slots')} value="Horário" />
                    {selectedPastor.slots.length > 0 ? (
                        <ul className="mt-2 space-y-2" id={id('slots')}>
                            {selectedPastor.slots.map((slot, i) => (
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
                                            required={i === 0 && selectedPastor.slots.length > 0}
                                        />
                                        <span className="text-sm text-zinc-800 dark:text-zinc-200">{slot.label}</span>
                                    </label>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                            Este pastor não tem horários livres na agenda — não é possível salvar sem escolher um horário publicado.
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
            {!isPending ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    O estado deste pedido não permite mais alterar pastor ou horário. Você pode atualizar o nome, o assunto e a descrição.
                </p>
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
                    (isPending &&
                        (pastors.length === 0 ||
                            data.preferred_pastor_id === '' ||
                            !selectedPastor ||
                            selectedPastor.slots.length === 0))
                }
            >
                Salvar alterações
            </PrimaryButton>
        </form>
    );
}
