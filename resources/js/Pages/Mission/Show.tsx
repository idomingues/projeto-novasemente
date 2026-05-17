import AdminLayout from '@/Layouts/AdminLayout';
import FlashMessages from '@/Components/FlashMessages';
import PageHeader from '@/Components/PageHeader';
import Card from '@/Components/Card';
import SelectInput from '@/Components/SelectInput';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

type VolunteerDetail = Record<string, unknown> & {
    id: number;
    fullName: string;
    photoUrl?: string | null;
    phaseId?: number | null;
};

interface Props {
    volunteer: VolunteerDetail;
    phases: { id: number; name: string }[];
    canManage: boolean;
    updatePhaseUrl: string;
    inviteUrl: string;
    destroyUrl: string;
}

function yn(v: unknown): string {
    if (v === true) return 'Sim';
    if (v === false) return 'Não';
    return '—';
}

export default function MissionShow({ volunteer, phases, canManage, updatePhaseUrl, inviteUrl, destroyUrl }: Props) {
    const phaseForm = useForm({ mission_phase_id: String(volunteer.phaseId ?? '') });

    const savePhase: FormEventHandler = (e) => {
        e.preventDefault();
        router.patch(updatePhaseUrl, { mission_phase_id: Number(phaseForm.data.mission_phase_id) }, { preserveScroll: true });
    };

    const sendInvite = () => {
        router.post(inviteUrl, { mission_volunteer_id: volunteer.id }, { preserveScroll: true });
    };

    const rows: [string, string][] = [
        ['E-mail', String(volunteer.email ?? '—')],
        ['Telefone', String(volunteer.phone ?? '—')],
        ['Endereço', String(volunteer.fullAddress ?? '—')],
        ['Profissão', String(volunteer.profession ?? '—')],
        ['Fase', String(volunteer.phaseName ?? '—')],
        ['Perfil', String(volunteer.profileType ?? '—')],
        ['Ministério', String(volunteer.ministryPreference ?? '—')],
        ['Engajamento', String(volunteer.engagementLevel ?? '—')],
        ['NPS', volunteer.npsScore != null ? String(volunteer.npsScore) : '—'],
        ['LGPD', yn(volunteer.lgpdConsent)],
    ];

    return (
        <AdminLayout>
            <Head title={`Missão — ${volunteer.fullName}`} />
            <FlashMessages />
            <PageHeader title={volunteer.fullName} subtitle="Cadastro missionário Insight / Inflexão" />
            <Link href={route('mission.index')} className="mb-4 inline-block text-sm text-emerald-700 underline">
                ← Voltar à lista
            </Link>

            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="p-6 lg:col-span-1">
                    {volunteer.photoUrl ? (
                        <img src={String(volunteer.photoUrl)} alt="" className="mx-auto h-32 w-32 rounded-full object-cover" />
                    ) : (
                        <div className="mx-auto h-32 w-32 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                    )}
                    {canManage && (
                        <ManageActions sendInvite={sendInvite} destroyUrl={destroyUrl} />
                    )}
                </Card>
                <Card className="p-6 lg:col-span-2">
                    <dl className="grid gap-3 sm:grid-cols-2">
                        {rows.map(([k, v]) => (
                            <div key={k}>
                                <dt className="text-xs font-semibold uppercase text-zinc-500">{k}</dt>
                                <dd className="text-sm text-zinc-900 dark:text-zinc-100">{v}</dd>
                            </div>
                        ))}
                    </dl>
                    {volunteer.closerToGodText ? (
                        <div className="mt-6">
                            <h3 className="text-sm font-semibold">Mais próximo de Deus</h3>
                            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{String(volunteer.closerToGodText)}</p>
                        </div>
                    ) : null}
                </Card>
            </div>

            {canManage && (
                <Card className="mt-6 p-6">
                    <form onSubmit={savePhase} className="flex flex-wrap items-end gap-3">
                        <div>
                            <InputLabel value="Alterar fase" />
                            <SelectInput
                                className="mt-1 min-w-[14rem]"
                                value={phaseForm.data.mission_phase_id}
                                onChange={(e) => phaseForm.setData('mission_phase_id', e.target.value)}
                            >
                                {phases.map((p) => (
                                    <option key={p.id} value={String(p.id)}>
                                        {p.name}
                                    </option>
                                ))}
                            </SelectInput>
                        </div>
                        <PrimaryButton type="submit">Salvar fase</PrimaryButton>
                    </form>
                </Card>
            )}
        </AdminLayout>
    );
}

function ManageActions({ sendInvite, destroyUrl }: { sendInvite: () => void; destroyUrl: string }) {
    return (
        <div className="mt-4 flex flex-col gap-2">
            <PrimaryButton type="button" className="w-full justify-center" onClick={sendInvite}>
                Enviar convite por e-mail
            </PrimaryButton>
            <SecondaryButton
                type="button"
                className="w-full justify-center"
                onClick={() => {
                    if (confirm('Excluir este cadastro?')) router.delete(destroyUrl);
                }}
            >
                Excluir cadastro
            </SecondaryButton>
        </div>
    );
}
