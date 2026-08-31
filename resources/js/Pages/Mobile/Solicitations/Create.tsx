import MobileLayout from '@/Layouts/MobileLayout';
import { Head, useForm, Link, router } from '@inertiajs/react';
import { solicitationsBackLinkClass } from '@/Pages/Mobile/Solicitations/solicitationNavClasses';
import { FormEventHandler, useMemo } from 'react';
import InputLabel from '@/Components/InputLabel';
import Textarea from '@/Components/Textarea';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputError from '@/Components/InputError';
import SelectInput from '@/Components/SelectInput';
import PastorVisitScheduleSection from '@/Components/Solicitations/PastorVisitScheduleSection';
import type { MemberPastoralBookingPayload } from '@/Components/Solicitations/SolicitationDetailPanel';

interface Option {
    value: number;
    label: string;
}

interface Props {
    type: string;
    typeLabel: string;
    storeUrl: string;
    pastorOptions: Option[];
    pastoralBooking?: MemberPastoralBookingPayload | null;
    pastoralAgendaUrl?: string;
}

export default function Create({
    type,
    typeLabel,
    storeUrl,
    pastorOptions,
    pastoralBooking = null,
    pastoralAgendaUrl = '',
}: Props) {
    const { data, setData, post, processing, errors } = useForm({
        type,
        message: '',
        preferred_date: '',
        assigned_pastor_id: '',
        preferred_start: '',
        preferred_modality: '' as '' | 'presential' | 'online',
    });

    const pastorVisitPastor = useMemo(() => {
        if (type !== 'pastor_visit' || !pastoralBooking) return null;
        const pid = data.assigned_pastor_id === '' ? null : Number(data.assigned_pastor_id);
        if (pid === null || Number.isNaN(pid)) return null;
        return pastoralBooking.pastors.find((p) => p.id === pid) ?? null;
    }, [type, data.assigned_pastor_id, pastoralBooking]);

    const pastorVisitReady = useMemo(() => {
        if (!pastorVisitPastor || !data.preferred_start) return false;
        const slot = pastorVisitPastor.slots.find((s) => s.value === data.preferred_start);
        if (!slot) return false;
        if (slot.modality === 'both') {
            return data.preferred_modality === 'presential' || data.preferred_modality === 'online';
        }
        return true;
    }, [pastorVisitPastor, data.preferred_start, data.preferred_modality]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(storeUrl);
    };

    const isPastorVisit = type === 'pastor_visit';

    return (
        <MobileLayout>
            <Head title={typeLabel} />
            <div className="space-y-6">
                <div>
                    <Link href={route('mobile.solicitations.hub')} className={solicitationsBackLinkClass}>
                        ← Solicitações
                    </Link>
                    <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">{typeLabel}</h1>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                        A igreja responderá pelo seu pedido através do App e email.
                    </p>
                </div>

                <form onSubmit={submit} className="space-y-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                    {isPastorVisit ? (
                        <>
                            {!pastoralBooking ? (
                                <div className="rounded-2xl border border-amber-200/80 bg-amber-50/90 p-4 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                                    <p className="font-medium">Não foi possível carregar os horários da igreja.</p>
                                    <p className="mt-1 text-xs opacity-90">
                                        Confirme que tem uma igreja ativa no app ou use Solicitações e escolha «Horário com pastor».
                                    </p>
                                </div>
                            ) : (
                                <PastorVisitScheduleSection
                                    pastors={pastoralBooking.pastors}
                                    value={{
                                        assigned_pastor_id: data.assigned_pastor_id,
                                        preferred_start: data.preferred_start,
                                        preferred_modality: data.preferred_modality,
                                    }}
                                    onChange={(patch) => {
                                        setData((prev) => ({ ...prev, ...patch }));
                                    }}
                                    errors={errors}
                                    fieldIdPrefix="create_pv"
                                    pastoralAgendaUrl={pastoralAgendaUrl || undefined}
                                />
                            )}
                            <div>
                                <InputLabel htmlFor="sol_message_pv" value="Notas ou motivo da visita (opcional)" />
                                <Textarea
                                    id="sol_message_pv"
                                    value={data.message}
                                    onChange={(e) => setData('message', e.target.value)}
                                    rows={5}
                                    className="mt-1 block w-full"
                                    placeholder="Se quiser, explique o que gostaria de tratar com o pastor…"
                                />
                                <InputError message={errors.message} className="mt-1" />
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <InputLabel htmlFor="sol_message" value="Mensagem" />
                                <Textarea
                                    id="sol_message"
                                    value={data.message}
                                    onChange={(e) => setData('message', e.target.value)}
                                    rows={8}
                                    className="mt-1 block w-full"
                                    placeholder="Escreva os detalhes do seu pedido…"
                                    required
                                />
                                <InputError message={errors.message} className="mt-1" />
                            </div>
                            <div>
                                <InputLabel htmlFor="sol_pref_date" value="Data pretendida ou relevante (opcional)" />
                                <input
                                    id="sol_pref_date"
                                    type="date"
                                    value={data.preferred_date}
                                    onChange={(e) => setData('preferred_date', e.target.value)}
                                    className="mt-1 block h-11 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-sm text-zinc-900 dark:text-zinc-100 shadow-sm focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900/20 dark:focus:ring-white/20"
                                />
                                <InputError message={errors.preferred_date} className="mt-1" />
                            </div>
                            {pastorOptions.length > 0 && (
                                <div>
                                    <InputLabel htmlFor="sol_pastor" value="Pastor (opcional)" />
                                    <SelectInput
                                        id="sol_pastor"
                                        className="mt-1"
                                        value={data.assigned_pastor_id}
                                        onChange={(e) => {
                                            setData('assigned_pastor_id', e.target.value);
                                        }}
                                    >
                                        <option value="">— Nenhum —</option>
                                        {pastorOptions.map((o) => (
                                            <option key={o.value} value={String(o.value)}>
                                                {o.label}
                                            </option>
                                        ))}
                                    </SelectInput>
                                    <InputError message={errors.assigned_pastor_id} className="mt-1" />
                                </div>
                            )}
                        </>
                    )}
                    <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                        <SecondaryButton type="button" className="justify-center" onClick={() => router.visit(route('mobile.solicitations.hub'))}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton
                            type="submit"
                            disabled={
                                processing ||
                                (isPastorVisit ? !pastoralBooking || !pastorVisitReady : !data.message.trim())
                            }
                            className="justify-center"
                        >
                            Enviar pedido
                        </PrimaryButton>
                    </div>
                </form>
            </div>
        </MobileLayout>
    );
}
