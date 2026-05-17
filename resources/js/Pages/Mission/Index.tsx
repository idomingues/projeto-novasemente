import AdminLayout from '@/Layouts/AdminLayout';
import FlashMessages from '@/Components/FlashMessages';
import Modal from '@/Components/Modal';
import PageHeader from '@/Components/PageHeader';
import Card from '@/Components/Card';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import SelectInput from '@/Components/SelectInput';
import Checkbox from '@/Components/Checkbox';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { FormEventHandler, useCallback, useEffect, useMemo, useState } from 'react';
import { confirmAction } from '@/utils/confirmDialog';
import axios from 'axios';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

type PhaseRow = { id: number; name: string; sort_order: number; volunteer_count: number };

type VolunteerRow = {
    id: number;
    fullName: string;
    email: string | null;
    phone: string | null;
    photoUrl: string | null;
    phaseId: number | null;
    phaseName: string;
    profileType: string | null;
    ministryPreference: string | null;
    hasEmail: boolean;
    createdAt: string | null;
};

type DetailVolunteer = Record<string, unknown> & { id: number; fullName: string; photoUrl?: string | null };

type DetailJson = {
    volunteer: DetailVolunteer;
    stages: { id: number; name: string; sort_order: number }[];
    canManage: boolean;
    updatePhaseUrl: string;
    inviteUrl: string;
    destroyUrl: string | null;
};

interface Paginated<T> {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
}

interface Props {
    volunteers: Paginated<VolunteerRow>;
    phases: PhaseRow[];
    filters: { search: string; mission_phase_id: string };
    canManage: boolean;
    storeStageUrl: string;
    inviteUrl: string;
    bulkInviteUrl: string;
    detailUrlPattern: string;
    formPublicUrl: string;
    mobileFormUrl: string;
}

function detailUrlFromPattern(pattern: string, id: number): string {
    return pattern.replace(/\/0(\/|$)/, `/${id}$1`);
}

function phaseBtnClass(active: boolean) {
    return [
        'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm',
        active
            ? 'bg-brand-600 font-medium text-white shadow-sm ring-2 ring-brand-800/40 dark:bg-brand-500'
            : 'text-zinc-800 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800',
    ].join(' ');
}

function yn(v: unknown): string {
    if (v === true) return 'Sim';
    if (v === false) return 'Não';
    return '—';
}

export default function MissionIndex({
    volunteers,
    phases,
    filters,
    canManage,
    storeStageUrl,
    inviteUrl,
    bulkInviteUrl,
    detailUrlPattern,
    formPublicUrl,
    mobileFormUrl,
}: Props) {
    const [selected, setSelected] = useState<number[]>([]);
    const [stageManageOpen, setStageManageOpen] = useState(false);
    const [stageEdits, setStageEdits] = useState(() => phases.map((p) => ({ id: p.id, name: p.name, sort_order: p.sort_order })));
    const [newStageName, setNewStageName] = useState('');
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detail, setDetail] = useState<DetailJson | null>(null);
    const [detailPhaseId, setDetailPhaseId] = useState('');

    const searchForm = useForm({ search: filters.search, mission_phase_id: filters.mission_phase_id });

    useEffect(() => {
        setStageEdits(phases.map((p) => ({ id: p.id, name: p.name, sort_order: p.sort_order })));
    }, [phases]);

    const currentStageFilter = filters.mission_phase_id ?? '';
    const pipelineTotalCount = useMemo(() => phases.reduce((acc, s) => acc + s.volunteer_count, 0), [phases]);
    const allIds = useMemo(() => volunteers.data.map((v) => v.id), [volunteers.data]);
    const allSelected = allIds.length > 0 && allIds.every((id) => selected.includes(id));

    const pickStage = (id: number | '') => {
        router.get(route('mission.index'), { search: filters.search, mission_phase_id: id === '' ? '' : String(id) }, { preserveState: true });
    };

    const applySearch = () => router.get(route('mission.index'), searchForm.data, { preserveState: true });

    const openDetail = useCallback(
        async (id: number) => {
            setDetailOpen(true);
            setDetailLoading(true);
            setDetail(null);
            try {
                const { data } = await axios.get<DetailJson>(detailUrlFromPattern(detailUrlPattern, id));
                setDetail(data);
                setDetailPhaseId(String(data.volunteer.phaseId ?? ''));
            } finally {
                setDetailLoading(false);
            }
        },
        [detailUrlPattern],
    );

    const saveDetailPhase = () => {
        if (!detail?.updatePhaseUrl || !detailPhaseId) return;
        router.patch(detail.updatePhaseUrl, { mission_phase_id: Number(detailPhaseId) }, {
            preserveScroll: true,
            onSuccess: () => void openDetail(detail.volunteer.id),
        });
    };

    const inviteOne = (id: number) => router.post(inviteUrl, { mission_volunteer_id: id }, { preserveScroll: true });

    const inviteSelected = () => {
        if (selected.length === 0) return;
        router.post(bulkInviteUrl, { mission_volunteer_ids: selected }, { preserveScroll: true, onSuccess: () => setSelected([]) });
    };

    const storeStage: FormEventHandler = (e) => {
        e.preventDefault();
        if (!newStageName.trim()) return;
        router.post(storeStageUrl, { name: newStageName.trim() }, { preserveScroll: true, onSuccess: () => setNewStageName('') });
    };

    const saveStageMeta = (stage: { id: number; name: string; sort_order: number }) => {
        router.put(route('mission.phases.update', stage.id), stage, { preserveScroll: true });
    };

    const deleteStage = async (stage: PhaseRow) => {
        const ok = await confirmAction({
            title: 'Excluir fase?',
            text:
                stage.volunteer_count > 0
                    ? `Excluir «${stage.name}»? ${stage.volunteer_count} cadastro(s) passam para a fase padrão.`
                    : `Excluir a fase «${stage.name}»?`,
            danger: true,
        });
        if (!ok) return;
        router.delete(route('mission.phases.destroy', stage.id), { preserveScroll: true });
    };

    return (
        <AdminLayout>
            <Head title="Missão — gestão" />
            <FlashMessages />
            <PageHeader
                title="Missão — Insight e Inflexão"
                subtitle="Quadro por fases, fichas e convites. Acesso da equipe administrativa (admin, secretaria, pastor)."
            >
                <FormLinks formPublicUrl={formPublicUrl} mobileFormUrl={mobileFormUrl} />
            </PageHeader>

            <div className="flex flex-col gap-6 lg:flex-row">
                <aside className="shrink-0 space-y-4 lg:w-64">
                    <Card className="p-4">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Fases</div>
                        <ul className="space-y-1">
                            <li>
                                <button type="button" onClick={() => pickStage('')} className={phaseBtnClass(currentStageFilter === '')}>
                                    <span>Todos</span>
                                    <span className="text-xs tabular-nums">{pipelineTotalCount}</span>
                                </button>
                            </li>
                            {phases.map((s) => (
                                <li key={s.id}>
                                    <button type="button" onClick={() => pickStage(s.id)} className={phaseBtnClass(currentStageFilter === String(s.id))}>
                                        <span className="truncate pr-2">{s.name}</span>
                                        <span className="text-xs tabular-nums">{s.volunteer_count}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </Card>
                    {canManage && (
                        <Card className="space-y-2 p-4">
                            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">Administração</p>
                            <PrimaryButton type="button" className="w-full" onClick={() => setStageManageOpen(true)}>
                                Gerir fases
                            </PrimaryButton>
                            <PrimaryButton type="button" className="w-full" disabled={selected.length === 0} onClick={inviteSelected}>
                                Convite em massa ({selected.length})
                            </PrimaryButton>
                        </Card>
                    )}
                </aside>

                <div className="min-w-0 flex-1 space-y-4">
                    <Card className="p-4">
                        <div className="flex flex-wrap items-end gap-3">
                            <SearchBlock searchForm={searchForm} applySearch={applySearch} />
                        </div>
                    </Card>

                    <Card className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-zinc-200 text-left dark:border-zinc-700">
                                    {canManage && (
                                        <th className="w-10 p-3">
                                            <Checkbox checked={allSelected} onChange={() => setSelected(allSelected ? [] : [...allIds])} />
                                        </th>
                                    )}
                                    <th className="p-3">Nome</th>
                                    <th className="p-3">Fase</th>
                                    <th className="p-3">Contato</th>
                                </tr>
                            </thead>
                            <tbody>
                                {volunteers.data.map((v) => (
                                    <tr
                                        key={v.id}
                                        className="cursor-pointer border-b border-zinc-100 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/50"
                                        onClick={() => void openDetail(v.id)}
                                    >
                                        {canManage && (
                                            <td className="p-3" onClick={(e) => e.stopPropagation()}>
                                                <Checkbox
                                                    checked={selected.includes(v.id)}
                                                    onChange={() =>
                                                        setSelected((prev) =>
                                                            prev.includes(v.id) ? prev.filter((x) => x !== v.id) : [...prev, v.id],
                                                        )
                                                    }
                                                />
                                            </td>
                                        )}
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                {v.photoUrl ? (
                                                    <img src={v.photoUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                                                ) : (
                                                    <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                                                )}
                                                <div>
                                                    <span className="font-medium">{v.fullName}</span>
                                                    {!v.hasEmail && <NoEmailHint />}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-3">{v.phaseName}</td>
                                        <td className="p-3">
                                            <div>{v.phone ?? '—'}</div>
                                            {v.email && <div className="text-xs text-zinc-500">{v.email}</div>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {volunteers.data.length === 0 && (
                            <p className="p-8 text-center text-zinc-500">Nenhum cadastro. Compartilhe o formulário Missão no menu Mais do app.</p>
                        )}
                    </Card>
                </div>
            </div>

            <Modal show={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="2xl">
                <div className="max-h-[min(90vh,720px)] overflow-y-auto p-6">
                    {detailLoading && <p className="text-sm text-zinc-500">Carregando ficha…</p>}
                    {!detailLoading && detail && (
                        <DetailPanel
                            detail={detail}
                            detailPhaseId={detailPhaseId}
                            setDetailPhaseId={setDetailPhaseId}
                            onSavePhase={saveDetailPhase}
                            onInvite={() => inviteOne(detail.volunteer.id)}
                            onClose={() => setDetailOpen(false)}
                        />
                    )}
                </div>
            </Modal>

            <Modal show={stageManageOpen} onClose={() => setStageManageOpen(false)} maxWidth="lg">
                <div className="p-6">
                    <h2 className="text-lg font-semibold">Gerir fases</h2>
                    <div className="mt-4 space-y-3">
                        {stageEdits.map((s, i) => {
                            const phase = phases.find((p) => p.id === s.id);
                            return (
                                <div key={s.id} className="flex flex-wrap items-end gap-2">
                                    <div className="min-w-[12rem] flex-1">
                                        <InputLabel value={`Fase ${i + 1}`} />
                                        <TextInput
                                            className="mt-1 w-full"
                                            value={s.name}
                                            onChange={(e) =>
                                                setStageEdits((rows) => rows.map((r) => (r.id === s.id ? { ...r, name: e.target.value } : r)))
                                            }
                                        />
                                    </div>
                                    <SecondaryButton type="button" onClick={() => saveStageMeta(s)}>
                                        Salvar
                                    </SecondaryButton>
                                    {phase && (
                                        <SecondaryButton type="button" onClick={() => void deleteStage(phase)}>
                                            Excluir
                                        </SecondaryButton>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <form onSubmit={storeStage} className="mt-6 border-t pt-4">
                        <InputLabel value="Nova fase" />
                        <NewStageRow newStageName={newStageName} setNewStageName={setNewStageName} />
                    </form>
                </div>
            </Modal>
        </AdminLayout>
    );
}

function FormLinks({ formPublicUrl, mobileFormUrl }: { formPublicUrl: string; mobileFormUrl: string }) {
    return (
        <div className="flex flex-wrap gap-2">
            <Link href={formPublicUrl} target="_blank" className="rounded-xl border px-3 py-2 text-sm font-medium shadow-sm hover:bg-zinc-50 dark:border-zinc-700">
                Formulário (web)
            </Link>
            <Link href={mobileFormUrl} target="_blank" className="rounded-xl border px-3 py-2 text-sm font-medium shadow-sm hover:bg-zinc-50 dark:border-zinc-700">
                Formulário (app)
            </Link>
        </div>
    );
}

function SearchBlock({
    searchForm,
    applySearch,
}: {
    searchForm: ReturnType<typeof useForm<{ search: string; mission_phase_id: string }>>;
    applySearch: () => void;
}) {
    return (
        <>
            <div className="min-w-[12rem] flex-1">
                <InputLabel value="Buscar" />
                <div className="relative mt-1">
                    <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <TextInput
                        className="w-full pl-9"
                        value={searchForm.data.search}
                        onChange={(e) => searchForm.setData('search', e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), applySearch())}
                        placeholder="Nome, e-mail ou telefone"
                    />
                </div>
            </div>
            <PrimaryButton type="button" onClick={applySearch}>
                Buscar
            </PrimaryButton>
        </>
    );
}

function NoEmailHint() {
    return <div className="text-xs text-amber-600">Sem e-mail</div>;
}

function NewStageRow({
    newStageName,
    setNewStageName,
}: {
    newStageName: string;
    setNewStageName: (v: string) => void;
}) {
    return (
        <div className="mt-1 flex gap-2">
            <TextInput className="flex-1" value={newStageName} onChange={(e) => setNewStageName(e.target.value)} placeholder="Nome da fase" />
            <PrimaryButton type="submit">Adicionar</PrimaryButton>
        </div>
    );
}

function DetailPanel({
    detail,
    detailPhaseId,
    setDetailPhaseId,
    onSavePhase,
    onInvite,
    onClose,
}: {
    detail: DetailJson;
    detailPhaseId: string;
    setDetailPhaseId: (v: string) => void;
    onSavePhase: () => void;
    onInvite: () => void;
    onClose: () => void;
}) {
    const v = detail.volunteer;
    const rows: [string, string][] = [
        ['E-mail', String(v.email ?? '—')],
        ['Telefone', String(v.phone ?? '—')],
        ['Endereço', String(v.fullAddress ?? '—')],
        ['Profissão', String(v.profession ?? '—')],
        ['Perfil', String(v.profileType ?? '—')],
        ['Ministério', String(v.ministryPreference ?? '—')],
        ['NPS', v.npsScore != null ? String(v.npsScore) : '—'],
        ['LGPD', yn(v.lgpdConsent)],
    ];

    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
                <h2 className="text-lg font-semibold">{String(v.fullName)}</h2>
                <SecondaryButton type="button" onClick={onClose}>
                    Fechar
                </SecondaryButton>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
                {rows.map(([k, val]) => (
                    <DetailRow key={k} label={k} value={val} />
                ))}
            </dl>
            {detail.canManage && (
                <div className="flex flex-wrap gap-2 border-t pt-4">
                    <SelectInput value={detailPhaseId} onChange={(e) => setDetailPhaseId(e.target.value)}>
                        {detail.stages.map((s) => (
                            <option key={s.id} value={String(s.id)}>
                                {s.name}
                            </option>
                        ))}
                    </SelectInput>
                    <PrimaryButton type="button" onClick={onSavePhase}>
                        Salvar fase
                    </PrimaryButton>
                    <SecondaryButton type="button" disabled={!v.email} onClick={onInvite}>
                        Enviar convite
                    </SecondaryButton>
                </div>
            )}
            <Link href={route('mission.show', v.id)} className="text-sm text-emerald-700 underline">
                Ficha completa
            </Link>
        </div>
    );
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-xs font-semibold uppercase text-zinc-500">{label}</dt>
            <dd className="text-sm">{value}</dd>
        </div>
    );
}
