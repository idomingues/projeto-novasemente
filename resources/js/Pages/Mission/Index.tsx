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
import MissionInviteShareModal from '@/Components/Mission/MissionInviteShareModal';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { confirmAction } from '@/utils/confirmDialog';
import RecordDetailHeader from '@/Components/RecordDetail/RecordDetailHeader';
import RecordDetailSections from '@/Components/RecordDetail/RecordDetailSections';
import {
    missionVolunteerDetailSections,
    type MissionVolunteerDetail,
} from '@/utils/missionVolunteerDetailRows';
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

type DetailVolunteer = MissionVolunteerDetail;

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

export default function MissionIndex({
    volunteers,
    phases,
    filters,
    canManage,
    storeStageUrl,
    inviteUrl,
    bulkInviteUrl,
    detailUrlPattern,
}: Props) {
    const [selected, setSelected] = useState<number[]>([]);
    const [stageManageOpen, setStageManageOpen] = useState(false);
    const [stageEdits, setStageEdits] = useState(() => phases.map((p) => ({ id: p.id, name: p.name, sort_order: p.sort_order })));
    const [newStageName, setNewStageName] = useState('');
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detail, setDetail] = useState<DetailJson | null>(null);
    const [detailPhaseId, setDetailPhaseId] = useState('');
    const [inviteShareOpen, setInviteShareOpen] = useState(false);
    const [inviteShare, setInviteShare] = useState<{ link: string; name: string; phone: string | null } | null>(null);
    const openedCadastroFromUrl = useRef(false);

    const flash = usePage().props.flash as {
        invitation_link?: string | null;
        invitation_for_name?: string | null;
        mission_invite_phone?: string | null;
    };

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

    const closeDetail = useCallback(() => {
        setDetailOpen(false);
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            if (url.searchParams.has('cadastro')) {
                url.searchParams.delete('cadastro');
                window.history.replaceState({}, '', url.pathname + url.search);
            }
        }
    }, []);

    useEffect(() => {
        if (openedCadastroFromUrl.current || typeof window === 'undefined') {
            return;
        }
        const cadastro = new URLSearchParams(window.location.search).get('cadastro');
        if (cadastro && /^\d+$/.test(cadastro)) {
            openedCadastroFromUrl.current = true;
            void openDetail(Number(cadastro));
        }
    }, [openDetail]);

    useEffect(() => {
        const link = flash?.invitation_link;
        const name = flash?.invitation_for_name;
        if (typeof link === 'string' && link.length > 0) {
            setInviteShare({
                link,
                name: typeof name === 'string' ? name : '',
                phone: typeof flash?.mission_invite_phone === 'string' ? flash.mission_invite_phone : null,
            });
            setInviteShareOpen(true);
        }
    }, [flash?.invitation_link, flash?.invitation_for_name, flash?.mission_invite_phone]);

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
                title="Missão"
                subtitle="Quadro por fases, fichas e convites. Acesso da equipe administrativa (admin, secretaria, pastor)."
            />

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
                                    {canManage && <th className="w-28 p-3 text-right">Ações</th>}
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
                                                                            {canManage && (
                                            <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                                                <SecondaryButton type="button" className="text-xs" onClick={() => inviteOne(v.id)}>
                                                    Convite
                                                </SecondaryButton>
                                            </td>
                                        )}
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

            <Modal show={detailOpen} onClose={closeDetail} maxWidth="2xl">
                <div className="max-h-[min(90vh,80vh)] overflow-y-auto p-6">
                    {detailLoading && <p className="text-sm text-zinc-500">Carregando ficha…</p>}
                    {!detailLoading && detail && (
                        <DetailPanel
                            detail={detail}
                            detailPhaseId={detailPhaseId}
                            setDetailPhaseId={setDetailPhaseId}
                            onSavePhase={saveDetailPhase}
                            onInvite={() => inviteOne(detail.volunteer.id)}
                            onClose={closeDetail}
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

            <MissionInviteShareModal
                show={inviteShareOpen && !!inviteShare}
                link={inviteShare?.link ?? ''}
                inviteeName={inviteShare?.name}
                phone={inviteShare?.phone}
                onClose={() => {
                    setInviteShareOpen(false);
                    setInviteShare(null);
                }}
            />
        </AdminLayout>
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
    const sections = missionVolunteerDetailSections(v);

    const destroyVolunteer = async () => {
        if (!detail.destroyUrl) return;
        const ok = await confirmAction({
            title: 'Excluir cadastro?',
            text: `Excluir o cadastro de «${v.fullName}»? Esta ação não pode ser desfeita.`,
            danger: true,
        });
        if (!ok) return;
        router.delete(detail.destroyUrl, {
            preserveScroll: true,
            onSuccess: () => onClose(),
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 rounded-2xl border border-teal-200/70 bg-gradient-to-br from-teal-50/90 via-white to-white p-4 dark:border-teal-900/50 dark:from-teal-950/35 dark:via-zinc-900/80 dark:to-zinc-900/80">
                <div className="flex min-w-0 items-center gap-4">
                    {v.photoUrl ? (
                        <img
                            src={v.photoUrl}
                            alt=""
                            className="h-20 w-20 shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm dark:ring-zinc-800"
                        />
                    ) : (
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-lg font-semibold text-zinc-500 ring-2 ring-white dark:bg-zinc-700 dark:text-zinc-400 dark:ring-zinc-800">
                            {v.fullName.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div className="min-w-0">
                        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">{v.fullName}</h2>
                        {v.phaseName ? (
                            <span className="mt-1.5 inline-flex rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-800 dark:bg-teal-900/50 dark:text-teal-200">
                                {v.phaseName}
                            </span>
                        ) : null}
                    </div>
                </div>
                <SecondaryButton type="button" onClick={onClose}>
                    Fechar
                </SecondaryButton>
            </div>

            <div className="space-y-3">
                {sections.map((section) => (
                    <section
                        key={section.title}
                        className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-zinc-50/50 shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900/40"
                    >
                        <h3 className="border-b border-zinc-200/90 bg-teal-600/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-teal-900 dark:border-zinc-700 dark:bg-teal-500/10 dark:text-teal-200">
                            {section.title}
                        </h3>
                        <dl className="grid gap-2 p-3 sm:grid-cols-2 sm:gap-2.5">
                            {section.rows.map((row) => (
                                <DetailRow key={`${section.title}-${row.label}`} label={row.label} value={row.value} />
                            ))}
                        </dl>
                    </section>
                ))}
            </div>
            {detail.canManage && (
                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200/90 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
                    <SelectInput value={detailPhaseId} onChange={(e) => setDetailPhaseId(e.target.value)} className="min-w-[10rem]">
                        {detail.stages.map((s) => (
                            <option key={s.id} value={String(s.id)}>
                                {s.name}
                            </option>
                        ))}
                    </SelectInput>
                    <PrimaryButton type="button" onClick={onSavePhase}>
                        Salvar fase
                    </PrimaryButton>
                    <SecondaryButton type="button" onClick={onInvite}>
                        Enviar convite
                    </SecondaryButton>
                    {detail.destroyUrl ? (
                        <SecondaryButton type="button" onClick={() => void destroyVolunteer()}>
                            Excluir cadastro
                        </SecondaryButton>
                    ) : null}
                </div>
            )}
        </div>
    );
}

function DetailRow({ label, value }: { label: string; value: string }) {
    const numbered = label.match(/^(\d+)\.\s*(.+)$/);
    const number = numbered?.[1];
    const question = numbered?.[2] ?? label;
    const isEmpty = value === '—';

    return (
        <div className="rounded-xl border border-zinc-200/80 bg-white p-3 dark:border-zinc-700/80 dark:bg-zinc-950/40">
            <dt className="flex items-start gap-2.5">
                {number ? (
                    <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-600 text-[11px] font-bold text-white dark:bg-teal-500"
                        aria-hidden
                    >
                        {number}
                    </span>
                ) : null}
                <span className="min-w-0 pt-0.5 text-[11px] font-semibold uppercase leading-snug tracking-wide text-zinc-500 dark:text-zinc-400">
                    {question}
                </span>
            </dt>
            <dd
                className={[
                    number ? 'mt-2 pl-8' : 'mt-1.5',
                    'whitespace-pre-wrap text-sm leading-relaxed',
                    isEmpty
                        ? 'italic text-zinc-400 dark:text-zinc-500'
                        : 'font-medium text-zinc-900 dark:text-zinc-50',
                ].join(' ')}
            >
                {value}
            </dd>
        </div>
    );
}
