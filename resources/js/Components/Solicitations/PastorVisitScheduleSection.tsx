import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import type { PastoralPastorOpt } from '@/Components/PastoralAppointment/PastoralAppointmentForm';
import { useMemo } from 'react';
import { Link } from '@inertiajs/react';

export type PastorVisitScheduleValue = {
    assigned_pastor_id: string;
    preferred_start: string;
    preferred_modality: '' | 'presential' | 'online';
};

export type PastorVisitScheduleSectionProps = {
    pastors: PastoralPastorOpt[];
    value: PastorVisitScheduleValue;
    onChange: (patch: Partial<PastorVisitScheduleValue>) => void;
    errors: Partial<Record<string, string | undefined>>;
    fieldIdPrefix: string;
    /** Quando não há payload de agenda (ex.: sem igreja em contexto). */
    emptyStateMessage?: string;
    pastoralAgendaUrl?: string;
};

export default function PastorVisitScheduleSection({
    pastors,
    value,
    onChange,
    errors,
    fieldIdPrefix,
    emptyStateMessage = 'Não foi possível carregar os horários publicados pelos pastores.',
    pastoralAgendaUrl,
}: PastorVisitScheduleSectionProps) {
    const id = (suffix: string) => `${fieldIdPrefix}_${suffix}`;

    const selectedPastor = useMemo(() => {
        const pid = value.assigned_pastor_id === '' ? null : Number(value.assigned_pastor_id);
        if (pid === null || Number.isNaN(pid)) return null;
        return pastors.find((p) => p.id === pid) ?? null;
    }, [pastors, value.assigned_pastor_id]);

    const selectedSlot = useMemo(() => {
        if (!selectedPastor || !value.preferred_start) return null;
        return selectedPastor.slots.find((s) => s.value === value.preferred_start) ?? null;
    }, [selectedPastor, value.preferred_start]);

    const hasAnySlot = pastors.some((p) => p.slots.length > 0);

    if (pastors.length === 0) {
        return (
            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/90 p-4 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                <p className="font-medium">Ainda não há pastores cadastrados para esta igreja.</p>
                <p className="mt-1 text-xs opacity-90">Entre em contato a secretaria ou tente mais tarde.</p>
            </div>
        );
    }

    if (!hasAnySlot) {
        return (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 p-4 text-sm text-zinc-700 dark:text-zinc-200 space-y-2">
                <p>{emptyStateMessage}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Os horários surgem quando um pastor publica disponibilidades na agenda pastoral.
                </p>
                {pastoralAgendaUrl ? (
                    <Link
                        href={pastoralAgendaUrl}
                        className="inline-block text-sm font-semibold text-primary-600 underline dark:text-primary-400"
                    >
                        Abrir «Agendar com pastor»
                    </Link>
                ) : null}
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Passo 1</p>
                <InputLabel htmlFor={id('pastor_grid')} value="Escolha o pastor" className="!text-sm !font-semibold" />
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Toque num nome para ver os horários livres.</p>
                <div
                    id={id('pastor_grid')}
                    className="mt-3 flex flex-wrap gap-2"
                    role="listbox"
                    aria-label="Pastores disponíveis"
                >
                    {pastors.map((p) => {
                        const active = value.assigned_pastor_id === String(p.id);
                        const count = p.slots.length;
                        return (
                            <button
                                key={p.id}
                                type="button"
                                role="option"
                                aria-selected={active}
                                onClick={() => {
                                    onChange({
                                        assigned_pastor_id: String(p.id),
                                        preferred_start: '',
                                        preferred_modality: '',
                                    });
                                }}
                                className={`min-h-[44px] rounded-xl border px-3 py-2 text-left text-sm font-medium transition-colors ${
                                    active
                                        ? 'border-primary-600 bg-primary-50 text-primary-950 dark:border-primary-500 dark:bg-primary-950/40 dark:text-primary-50'
                                        : 'border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600'
                                }`}
                            >
                                <span className="block truncate max-w-[11rem]">{p.name}</span>
                                <span className="mt-0.5 block text-[11px] font-normal text-zinc-500 dark:text-zinc-400">
                                    {count === 0 ? 'Sem horários livres' : `${count} horário${count === 1 ? '' : 's'}`}
                                </span>
                            </button>
                        );
                    })}
                </div>
                <InputError message={errors.assigned_pastor_id} className="mt-2" />
            </div>

            {selectedPastor ? (
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Passo 2</p>
                    <InputLabel htmlFor={id('slots')} value="Data e horário" className="!text-sm !font-semibold" />
                    {selectedPastor.slots.length > 0 ? (
                        <>
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                Lista de horários publicados — deslize para ver todos.
                            </p>
                            <ul
                                className="mt-2 max-h-[min(42dvh,320px)] space-y-2 overflow-y-auto overscroll-y-contain pr-1"
                                id={id('slots')}
                                role="radiogroup"
                                aria-label="Horários disponíveis"
                            >
                                {selectedPastor.slots.map((slot) => (
                                    <li key={slot.value}>
                                        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2.5 has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 dark:has-[:checked]:border-primary-600 dark:has-[:checked]:bg-primary-950/30">
                                            <input
                                                type="radio"
                                                name={`${fieldIdPrefix}_preferred_start_slot`}
                                                className="mt-1"
                                                value={slot.value}
                                                checked={value.preferred_start === slot.value}
                                                onChange={() => {
                                                    onChange({
                                                        preferred_start: slot.value,
                                                        preferred_modality: '',
                                                    });
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
                            Este pastor não tem horários livres de momento. Escolha outro ou volte mais tarde.
                        </p>
                    )}
                    {selectedSlot?.modality === 'both' && selectedPastor.slots.length > 0 ? (
                        <div className="mt-4 space-y-2">
                            <InputLabel value="Como prefere o atendimento?" />
                            <div className="flex flex-col gap-2">
                                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 dark:border-zinc-700 has-[:checked]:border-primary-500 dark:has-[:checked]:border-primary-600">
                                    <input
                                        type="radio"
                                        name={`${fieldIdPrefix}_preferred_modality`}
                                        value="presential"
                                        checked={value.preferred_modality === 'presential'}
                                        onChange={() => onChange({ preferred_modality: 'presential' })}
                                    />
                                    <span className="text-sm text-zinc-800 dark:text-zinc-200">Presencial (na igreja)</span>
                                </label>
                                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 dark:border-zinc-700 has-[:checked]:border-primary-500 dark:has-[:checked]:border-primary-600">
                                    <input
                                        type="radio"
                                        name={`${fieldIdPrefix}_preferred_modality`}
                                        value="online"
                                        checked={value.preferred_modality === 'online'}
                                        onChange={() => onChange({ preferred_modality: 'online' })}
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
        </div>
    );
}
