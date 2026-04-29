import AdminLayout from '@/Layouts/AdminLayout';
import FlashMessages from '@/Components/FlashMessages';
import Modal from '@/Components/Modal';
import Card from '@/Components/Card';
import PageHeader from '@/Components/PageHeader';
import { titleBarAddIconClass } from '@/Components/AddButton';
import TextInput from '@/Components/TextInput';
import Textarea from '@/Components/Textarea';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import SelectInput from '@/Components/SelectInput';
import InputError from '@/Components/InputError';
import { Head, Link, router, useForm, usePage, useRemember } from '@inertiajs/react';
import { FormEventHandler, useEffect, useMemo, useState } from 'react';
import {
    AdjustmentsHorizontalIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    MagnifyingGlassIcon,
    PlusIcon,
} from '@heroicons/react/24/outline';
import PublicVolunteerSignupShareModal from '@/Components/Volunteers/PublicVolunteerSignupShareModal';

type StageRow = { id: number; name: string; sort_order: number; volunteer_count: number };

type VolunteerListRow = {
    id: number;
    name: string | null;
    email: string | null;
    phone: string | null;
    active: boolean;
    createdAt: string | null;
    stageId: number | undefined;
    stageName: string;
    pendingInvite?: boolean;
    ministryNames: string[];
    interestPreview: string | null;
    signals: { memberNs: boolean; sixMonthsInChurchOrLetter: boolean; ministryExperienceDeclared: boolean };
};

type BoardFilters = {
    search: string;
    has_whatsapp: string;
    has_social_networks: string;
    is_official_member: string;
    member_record_at_nova_semente: string;
    has_previous_ministry_volunteer_experience: string;
    needs_pastoral_guidance: string;
    lgpd_data_consent: string;
    active: string;
    app_access_only: string;
    role: string;
    has_email: string;
    has_phone: string;
    has_birth_date: string;
    attendance_duration: string;
    attendance_duration_text: string;
    created_from: string;
    created_to: string;
    birth_date_from: string;
    birth_date_to: string;
    member_record_church: string;
    professional_area: string;
    ministry_ids: string;
    text_interest: string;
    pipeline_stage_id: string;
};

interface Paginated<T> {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
}

type DetailVolunteer = Record<string, unknown> & { id: number; name: string | null };

type DetailNote = { id: number; body: string; authorName: string; createdAt: string };

type DetailJson = {
    volunteer: DetailVolunteer;
    pipeline: { stageId?: number; stageName?: string };
    stages: { id: number; name: string; sort_order: number }[];
    notes: DetailNote[];
    updateStageUrl: string;
    storeNoteUrl: string;
};

interface Props {
    stages: StageRow[];
    volunteers: Paginated<VolunteerListRow>;
    filters: BoardFilters;
    ministries: { id: number; name: string }[];
    storeStageUrl: string;
    canVolunteerManage: boolean;
    canPipelineMutate: boolean;
    volunteersAdminUrl: string;
    publicVolunteerSignupUrl: string | null;
}

const tri = (
    <>
        <option value="">Qualquer</option>
        <option value="1">Sim</option>
        <option value="0">Não</option>
    </>
);

function yn(v: unknown): string {
    if (v === true || v === 1 || v === '1') return 'Sim';
    if (v === false || v === 0 || v === '0') return 'Não';
    return '—';
}

function formatShortDate(iso: string | null): string {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
        return '—';
    }
}

function formatDateTime(iso: string): string {
    try {
        return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch {
        return iso;
    }
}

export default function Pipeline({
    stages,
    volunteers,
    filters,
    ministries,
    storeStageUrl,
    canVolunteerManage,
    canPipelineMutate,
    volunteersAdminUrl,
    publicVolunteerSignupUrl,
}: Props) {
    const page = usePage();
    const csrf = (page.props as { csrf_token?: string }).csrf_token ?? '';
    const currentChurch = (page.props as { currentChurch?: { name?: string } | null }).currentChurch;
    const churchName = currentChurch?.name ?? 'Igreja';

    const filterForm = useForm<BoardFilters>({ ...filters });
    const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);
    useEffect(() => {
        filterForm.setData({ ...filters });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filtersKey]);

    const stageForm = useForm({ name: '' });
    const [stageManageOpen, setStageManageOpen] = useState(false);
    const [stageEdit, setStageEdit] = useState<Record<string, { name: string }>>({});
    const [stageOrderBusy, setStageOrderBusy] = useState(false);

    const [filtersOpen, setFiltersOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detail, setDetail] = useState<DetailJson | null>(null);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [detailTab, setDetailTab] = useState<'ficha' | 'notas'>('ficha');
    const [publicInviteOpen, setPublicInviteOpen] = useState(false);
    const [inviteOpen, setInviteOpen] = useRemember(false, 'pipeline.inviteOpen');
    const [inviteVolunteer, setInviteVolunteer] = useRemember<VolunteerListRow | null>(null, 'pipeline.inviteVolunteer');
    const [inviteMinistryId, setInviteMinistryId] = useRemember<string>('', 'pipeline.inviteMinistryId');
    const [inviteChannels, setInviteChannels] = useRemember<{ inbox: boolean }>(
        { inbox: true },
        'pipeline.inviteChannels',
    );

    const noteForm = useForm({ body: '' });
    const stageMoveForm = useForm({ stage_id: '' as string | number });

    const openInvite = (v: VolunteerListRow) => {
        setInviteVolunteer(v);
        // Não resetamos automaticamente os campos do formulário.
        // O estado é "remembered" para sobreviver a reloads parciais do Inertia enquanto o modal está aberto.
        setInviteOpen(true);
    };

    const attendanceOptions: { value: string; label: string }[] = [
        { value: 'less_than_3_months', label: 'Menos de 3 meses' },
        { value: 'months_3_6', label: '3–6 meses' },
        { value: 'months_6_12', label: '6–12 meses' },
        { value: 'years_1_3', label: '1–3 anos' },
        { value: 'more_than_3_years', label: '+ 3 anos' },
    ];

    const openVolunteer = async (id: number, tab: 'ficha' | 'notas' = 'ficha') => {
        setSelectedId(id);
        setModalOpen(true);
        setDetailTab(tab);
        setDetail(null);
        setDetailLoading(true);
        noteForm.reset('body');
        try {
            const url = route('ministry-lead.volunteers.pipeline.detail', id);
            const r = await fetch(url, {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': csrf },
                credentials: 'same-origin',
            });
            const j = (await r.json()) as DetailJson;
            setDetail(j);
            const sid = j.pipeline?.stageId;
            stageMoveForm.setData('stage_id', sid != null ? String(sid) : '');
        } catch {
            setDetail(null);
        } finally {
            setDetailLoading(false);
        }
    };

    const applyFilters: FormEventHandler = (e) => {
        e.preventDefault();
        const data = Object.fromEntries(
            Object.entries(filterForm.data).filter(([, v]) => v !== '' && v !== null && v !== undefined),
        ) as Record<string, string>;
        router.get(route('ministry-lead.volunteers.index'), data, { preserveState: true, replace: true });
    };

    const clearFilters = () => {
        router.get(route('ministry-lead.volunteers.index'), {}, { preserveState: true, replace: true });
    };

    const pickStage = (stageId: number | '') => {
        const next = { ...filterForm.data, pipeline_stage_id: stageId === '' ? '' : String(stageId) };
        const data = Object.fromEntries(Object.entries(next).filter(([, v]) => v !== '')) as Record<string, string>;
        router.get(route('ministry-lead.volunteers.index'), data, { preserveState: true, replace: true });
    };

    const submitNewStage: FormEventHandler = (e) => {
        e.preventDefault();
        stageForm.post(storeStageUrl, { preserveScroll: true, onSuccess: () => stageForm.reset('name') });
    };

    useEffect(() => {
        if (stageManageOpen) {
            setStageEdit({});
        }
    }, [stageManageOpen]);

    const swapStageNeighbors = (fromIndex: number, direction: 'up' | 'down') => {
        if (stageOrderBusy) return;
        const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
        if (toIndex < 0 || toIndex >= stages.length) return;
        const a = stages[fromIndex];
        const b = stages[toIndex];
        const nameA = (stageEdit[String(a.id)]?.name ?? a.name ?? '').trim();
        const nameB = (stageEdit[String(b.id)]?.name ?? b.name ?? '').trim();
        if (!nameA || !nameB) return;
        setStageOrderBusy(true);
        router.put(
            route('ministry-lead.volunteers.pipeline.stages.update', a.id),
            { name: nameA, sort_order: b.sort_order },
            {
                preserveScroll: true,
                onSuccess: () => {
                    router.put(
                        route('ministry-lead.volunteers.pipeline.stages.update', b.id),
                        { name: nameB, sort_order: a.sort_order },
                        {
                            preserveScroll: true,
                            onFinish: () => setStageOrderBusy(false),
                        },
                    );
                },
                onError: () => setStageOrderBusy(false),
            },
        );
    };

    const saveStageName = (stageId: number, serverName: string) => {
        const key = String(stageId);
        const name = (stageEdit[key]?.name ?? serverName).trim();
        if (!name) return;
        router.put(route('ministry-lead.volunteers.pipeline.stages.update', stageId), { name }, { preserveScroll: true });
    };

    const requestDeleteStage = (stageId: number, stageName: string, count: number) => {
        const label = stageName.trim() || 'esta fase';
        const msg =
            count > 0
                ? `Eliminar a fase «${label}»? Os ${count} voluntários nesta fase passam para a fase padrão (Interessado).`
                : `Eliminar a fase «${label}»?`;
        if (!window.confirm(msg)) return;
        router.delete(route('ministry-lead.volunteers.pipeline.stages.destroy', stageId), { preserveScroll: true });
    };

    const submitNote: FormEventHandler = (e) => {
        e.preventDefault();
        if (!detail) return;
        noteForm.post(detail.storeNoteUrl, {
            preserveScroll: true,
            onSuccess: () => {
                noteForm.reset('body');
                if (selectedId) void openVolunteer(selectedId, 'notas');
            },
        });
    };

    const submitStageMove: FormEventHandler = (e) => {
        e.preventDefault();
        if (!detail) return;
        stageMoveForm.patch(detail.updateStageUrl, {
            preserveScroll: true,
            onSuccess: () => {
                if (selectedId) void openVolunteer(selectedId);
                const url = `${window.location.pathname}${window.location.search}`;
                router.get(url, {}, {
                    only: ['volunteers', 'stages'],
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                });
            },
        });
    };

    const postInvite = (channels: string[], closeOnSuccess: boolean) => {
        if (!inviteVolunteer || !inviteMinistryId) return;
        router.post(
            route('ministry-lead.volunteers.ministry-invite.store', inviteVolunteer.id),
            { ministry_id: Number(inviteMinistryId), channels },
            {
                preserveScroll: true,
                onSuccess: (p) => {
                    if (closeOnSuccess) {
                        setInviteOpen(false);
                        setInviteVolunteer(null);
                        setInviteMinistryId('');
                        setInviteChannels({ inbox: true });
                    }
                },
            },
        );
    };

    const submitInvite: FormEventHandler = (e) => {
        e.preventDefault();
        if (!inviteVolunteer || !inviteMinistryId) return;
        // Email é o canal principal (sempre). Notificação é opcional.
        const channels = ['email', ...(inviteChannels.inbox ? ['inbox'] : [])];
        if (channels.length === 0) return;
        postInvite(channels, true);
    };

    const currentStageFilter = filters.pipeline_stage_id ?? '';
    const activeFiltersCount = useMemo(() => {
        const entries = Object.entries(filters) as [string, unknown][];
        return entries.filter(([k, v]) => {
            if (k === 'pipeline_stage_id') return false;
            return v !== '' && v !== null && v !== undefined;
        }).length;
    }, [filters]);

    const pipelineTotalCount = useMemo(() => stages.reduce((acc, s) => acc + s.volunteer_count, 0), [stages]);

    return (
        <AdminLayout>
            <Head title="Voluntários" />
            <FlashMessages />
            <PageHeader
                title="Voluntários"
                subtitle="Quadro por fases: inscrição, treino até servir. Toque numa linha para abrir a ficha ou as anotações."
                actions={
                    canVolunteerManage ? (
                        <Link
                            href={`${volunteersAdminUrl}?modal=create`}
                            className={titleBarAddIconClass}
                            title="Novo voluntário"
                            aria-label="Novo voluntário"
                        >
                            <PlusIcon className="h-6 w-6" strokeWidth={2.25} />
                        </Link>
                    ) : undefined
                }
            >
                <div className="flex flex-wrap items-center gap-2">
                    {canVolunteerManage ? (
                        <Link
                            href={volunteersAdminUrl}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                        >
                            Cadastro secretaria
                        </Link>
                    ) : null}
                    {publicVolunteerSignupUrl && canPipelineMutate ? (
                        <button
                            type="button"
                            onClick={() => setPublicInviteOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                        >
                            Link cadastro público
                        </button>
                    ) : null}
                </div>
            </PageHeader>

            <div className="flex flex-col gap-6 lg:flex-row">
                <aside className="lg:w-64 shrink-0 space-y-4">
                    <Card className="p-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2">Fases</div>
                        <ul className="space-y-1">
                            <li>
                                <button
                                    type="button"
                                    onClick={() => pickStage('')}
                                    aria-pressed={currentStageFilter === ''}
                                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium ${
                                        currentStageFilter === ''
                                            ? 'bg-brand-600 text-white shadow-sm ring-2 ring-brand-800/40 dark:bg-brand-500 dark:ring-brand-300/35'
                                            : 'text-zinc-800 ring-1 ring-transparent hover:bg-zinc-100 hover:ring-zinc-200 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:hover:ring-zinc-600'
                                    }`}
                                >
                                    <span className="truncate">Todos</span>
                                    <span
                                        className={`shrink-0 tabular-nums text-xs ${
                                            currentStageFilter === '' ? 'text-white/90' : 'text-zinc-500 dark:text-zinc-400'
                                        }`}
                                    >
                                        {pipelineTotalCount}
                                    </span>
                                </button>
                            </li>
                            {stages.map((s) => {
                                const label = (s.name || '').trim() || 'Não definido';
                                const selected = currentStageFilter === String(s.id);
                                return (
                                    <li key={s.id}>
                                        <button
                                            type="button"
                                            onClick={() => pickStage(s.id)}
                                            aria-pressed={selected}
                                            title={
                                                s.volunteer_count === 0
                                                    ? 'Sem voluntários nesta fase — pode filtrar na mesma'
                                                    : undefined
                                            }
                                            className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                                                selected
                                                    ? 'bg-brand-600 font-medium text-white shadow-sm ring-2 ring-brand-800/40 dark:bg-brand-500 dark:ring-brand-300/35'
                                                    : 'text-zinc-800 ring-1 ring-transparent hover:bg-zinc-100 hover:ring-zinc-200 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:hover:ring-zinc-600'
                                            }`}
                                        >
                                            <span className="truncate pr-2">{label}</span>
                                            <span
                                                className={`shrink-0 tabular-nums text-xs ${
                                                    selected
                                                        ? 'text-white/90'
                                                        : s.volunteer_count === 0
                                                          ? 'text-zinc-400 dark:text-zinc-500'
                                                          : 'text-zinc-500 dark:text-zinc-400'
                                                }`}
                                            >
                                                {s.volunteer_count}
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </Card>
                    {canPipelineMutate ? (
                        <Card className="p-4 space-y-2">
                            <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">Fases</div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Criar, renomear e excluir fases.</p>
                            <PrimaryButton type="button" className="w-full" onClick={() => setStageManageOpen(true)}>
                                Gerir fases
                            </PrimaryButton>
                        </Card>
                    ) : null}
                    {canVolunteerManage ? (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 px-1">
                            <Link href={volunteersAdminUrl} className="underline">
                                Abrir lista completa (convites, edição)
                            </Link>
                        </p>
                    ) : null}
                </aside>

                <div className="min-w-0 flex-1 space-y-4">
                    <button
                        type="button"
                        onClick={() => setFiltersOpen((o) => !o)}
                        className="flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-semibold text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                    >
                        <span className="flex items-center gap-2">
                            <AdjustmentsHorizontalIcon className="h-5 w-5 text-zinc-500" aria-hidden />
                            Filtros do cadastro
                            {activeFiltersCount > 0 ? (
                                <span className="ml-1 inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                                    {activeFiltersCount}
                                </span>
                            ) : null}
                        </span>
                        {filtersOpen ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}
                    </button>
                    {filtersOpen ? (
                        <Card className="p-4">
                            <form onSubmit={applyFilters} className="space-y-4">
                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                    <div className="sm:col-span-2 xl:col-span-3">
                                        <InputLabel value="Nome, e-mail ou telefone" />
                                        <TextInput
                                            className="mt-1"
                                            value={filterForm.data.search}
                                            onChange={(e) => filterForm.setData('search', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <InputLabel value="WhatsApp" />
                                        <SelectInput
                                            className="mt-1"
                                            value={filterForm.data.has_whatsapp}
                                            onChange={(e) => filterForm.setData('has_whatsapp', e.target.value)}
                                        >
                                            {tri}
                                        </SelectInput>
                                    </div>
                                    <div>
                                        <InputLabel value="Redes sociais" />
                                        <SelectInput
                                            className="mt-1"
                                            value={filterForm.data.has_social_networks}
                                            onChange={(e) => filterForm.setData('has_social_networks', e.target.value)}
                                        >
                                            {tri}
                                        </SelectInput>
                                    </div>
                                    <div>
                                        <InputLabel value="Membro oficial" />
                                        <SelectInput
                                            className="mt-1"
                                            value={filterForm.data.is_official_member}
                                            onChange={(e) => filterForm.setData('is_official_member', e.target.value)}
                                        >
                                            {tri}
                                        </SelectInput>
                                    </div>
                                    <div>
                                        <InputLabel value="Registo na Nova Semente" />
                                        <SelectInput
                                            className="mt-1"
                                            value={filterForm.data.member_record_at_nova_semente}
                                            onChange={(e) => filterForm.setData('member_record_at_nova_semente', e.target.value)}
                                        >
                                            {tri}
                                        </SelectInput>
                                    </div>
                                    <div>
                                        <InputLabel value="Experiência em ministério" />
                                        <SelectInput
                                            className="mt-1"
                                            value={filterForm.data.has_previous_ministry_volunteer_experience}
                                            onChange={(e) => filterForm.setData('has_previous_ministry_volunteer_experience', e.target.value)}
                                        >
                                            {tri}
                                        </SelectInput>
                                    </div>
                                    <div>
                                        <InputLabel value="Orientação pastoral" />
                                        <SelectInput
                                            className="mt-1"
                                            value={filterForm.data.needs_pastoral_guidance}
                                            onChange={(e) => filterForm.setData('needs_pastoral_guidance', e.target.value)}
                                        >
                                            {tri}
                                        </SelectInput>
                                    </div>
                                    <div>
                                        <InputLabel value="LGPD" />
                                        <SelectInput
                                            className="mt-1"
                                            value={filterForm.data.lgpd_data_consent}
                                            onChange={(e) => filterForm.setData('lgpd_data_consent', e.target.value)}
                                        >
                                            {tri}
                                        </SelectInput>
                                    </div>
                                    <div>
                                        <InputLabel value="Ativo" />
                                        <SelectInput
                                            className="mt-1"
                                            value={filterForm.data.active}
                                            onChange={(e) => filterForm.setData('active', e.target.value)}
                                        >
                                            {tri}
                                        </SelectInput>
                                    </div>
                                    <div>
                                        <InputLabel value="Só app" />
                                        <SelectInput
                                            className="mt-1"
                                            value={filterForm.data.app_access_only}
                                            onChange={(e) => filterForm.setData('app_access_only', e.target.value)}
                                        >
                                            {tri}
                                        </SelectInput>
                                    </div>
                                    <div>
                                        <InputLabel value="Cargo (texto)" />
                                        <TextInput
                                            className="mt-1"
                                            value={filterForm.data.role}
                                            onChange={(e) => filterForm.setData('role', e.target.value)}
                                            placeholder="Ex.: Diácono, Líder…"
                                        />
                                    </div>
                                    <div>
                                        <InputLabel value="Tem e-mail" />
                                        <SelectInput
                                            className="mt-1"
                                            value={filterForm.data.has_email}
                                            onChange={(e) => filterForm.setData('has_email', e.target.value)}
                                        >
                                            {tri}
                                        </SelectInput>
                                    </div>
                                    <div>
                                        <InputLabel value="Tem telefone" />
                                        <SelectInput
                                            className="mt-1"
                                            value={filterForm.data.has_phone}
                                            onChange={(e) => filterForm.setData('has_phone', e.target.value)}
                                        >
                                            {tri}
                                        </SelectInput>
                                    </div>
                                    <div>
                                        <InputLabel value="Tem data de nascimento" />
                                        <SelectInput
                                            className="mt-1"
                                            value={filterForm.data.has_birth_date}
                                            onChange={(e) => filterForm.setData('has_birth_date', e.target.value)}
                                        >
                                            {tri}
                                        </SelectInput>
                                    </div>
                                    <div>
                                        <InputLabel value="Tempo na igreja (cadastro novo)" />
                                        <SelectInput
                                            className="mt-1"
                                            value={filterForm.data.attendance_duration}
                                            onChange={(e) => filterForm.setData('attendance_duration', e.target.value)}
                                        >
                                            <option value="">Qualquer</option>
                                            {attendanceOptions.map((o) => (
                                                <option key={o.value} value={o.value}>
                                                    {o.label}
                                                </option>
                                            ))}
                                        </SelectInput>
                                    </div>
                                    <div>
                                        <InputLabel value="Tempo como voluntário (recadastro) — texto" />
                                        <TextInput
                                            className="mt-1"
                                            value={filterForm.data.attendance_duration_text}
                                            onChange={(e) => filterForm.setData('attendance_duration_text', e.target.value)}
                                            placeholder="Ex.: 1 ano, 6 meses, desde 2020…"
                                        />
                                    </div>
                                    <div>
                                        <InputLabel value="Cadastro desde" />
                                        <TextInput
                                            type="date"
                                            className="mt-1"
                                            value={filterForm.data.created_from}
                                            onChange={(e) => filterForm.setData('created_from', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <InputLabel value="Cadastro até" />
                                        <TextInput
                                            type="date"
                                            className="mt-1"
                                            value={filterForm.data.created_to}
                                            onChange={(e) => filterForm.setData('created_to', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <InputLabel value="Nascimento desde" />
                                        <TextInput
                                            type="date"
                                            className="mt-1"
                                            value={filterForm.data.birth_date_from}
                                            onChange={(e) => filterForm.setData('birth_date_from', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <InputLabel value="Nascimento até" />
                                        <TextInput
                                            type="date"
                                            className="mt-1"
                                            value={filterForm.data.birth_date_to}
                                            onChange={(e) => filterForm.setData('birth_date_to', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <InputLabel value="Área profissional" />
                                        <TextInput
                                            className="mt-1"
                                            value={filterForm.data.professional_area}
                                            onChange={(e) => filterForm.setData('professional_area', e.target.value)}
                                            placeholder="Ex.: Saúde, TI, Educação…"
                                        />
                                    </div>
                                    <div className="sm:col-span-2 xl:col-span-2">
                                        <InputLabel value="Registo em qual igreja (texto)" />
                                        <TextInput
                                            className="mt-1"
                                            value={filterForm.data.member_record_church}
                                            onChange={(e) => filterForm.setData('member_record_church', e.target.value)}
                                            placeholder="Ex.: Central, Paulista…"
                                        />
                                    </div>
                                    <div className="sm:col-span-2 xl:col-span-3">
                                        <InputLabel value="Departamentos (seleção múltipla)" />
                                        <div className="mt-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900/50">
                                            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                                {ministries.map((m) => {
                                                    const selected = (filterForm.data.ministry_ids || '')
                                                        .split(',')
                                                        .map((x) => x.trim())
                                                        .filter(Boolean)
                                                        .includes(String(m.id));
                                                    return (
                                                        <label key={m.id} className="flex items-center gap-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={selected}
                                                                onChange={(e) => {
                                                                    const cur = (filterForm.data.ministry_ids || '')
                                                                        .split(',')
                                                                        .map((x) => x.trim())
                                                                        .filter(Boolean);
                                                                    const id = String(m.id);
                                                                    const next = e.target.checked
                                                                        ? Array.from(new Set([...cur, id]))
                                                                        : cur.filter((x) => x !== id);
                                                                    filterForm.setData('ministry_ids', next.join(','));
                                                                }}
                                                                className="rounded border-zinc-300 dark:border-zinc-600 text-zinc-900 focus:ring-zinc-500"
                                                            />
                                                            <span className="text-sm text-zinc-900 dark:text-zinc-100">{m.name}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                            {ministries.length === 0 ? (
                                                <div className="text-xs text-zinc-500 dark:text-zinc-400">Nenhum departamento disponível.</div>
                                            ) : null}
                                        </div>
                                    </div>
                                    <div className="sm:col-span-2 xl:col-span-3">
                                        <InputLabel value="Palavras nos textos (interesses, dons…)" />
                                        <TextInput
                                            className="mt-1"
                                            value={filterForm.data.text_interest}
                                            onChange={(e) => filterForm.setData('text_interest', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <PrimaryButton type="submit" className="inline-flex items-center gap-1" disabled={filterForm.processing}>
                                        <MagnifyingGlassIcon className="h-4 w-4" aria-hidden />
                                        Aplicar
                                    </PrimaryButton>
                                    <SecondaryButton type="button" onClick={clearFilters}>
                                        Limpar
                                    </SecondaryButton>
                                </div>
                            </form>
                        </Card>
                    ) : null}

                    <Card>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm hidden md:table">
                                <thead>
                                    <tr className="border-b border-zinc-200 text-left dark:border-zinc-700">
                                        <th className="pb-2 pr-3 font-semibold">Nome</th>
                                        <th className="pb-2 pr-3 font-semibold">Fase</th>
                                        <th className="pb-2 pr-3 font-semibold">Cadastro</th>
                                        <th className="pb-2 pr-3 font-semibold">Contacto</th>
                                        <th className="pb-2 pr-3 font-semibold">Interesses</th>
                                        <th className="pb-2 font-semibold">Ministérios</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {volunteers.data.map((v) => (
                                        <tr
                                            key={v.id}
                                            className={`border-b border-zinc-100 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/80 ${v.pendingInvite ? 'bg-amber-50/40 dark:bg-amber-950/10' : ''}`}
                                            onClick={() => void openVolunteer(v.id)}
                                        >
                                            <td className="py-2 pr-3 font-medium text-zinc-900 dark:text-white">{v.name}</td>
                                            <td className="py-2 pr-3 text-zinc-700 dark:text-zinc-200">{v.stageName}</td>
                                            <td className="py-2 pr-3 whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                                                {formatShortDate(v.createdAt)}
                                            </td>
                                            <td className="py-2 pr-3 text-zinc-600 dark:text-zinc-400">
                                                <div>{v.email}</div>
                                                {v.phone ? <div className="text-xs">{v.phone}</div> : null}
                                            </td>
                                            <td className="py-2 pr-3 max-w-[200px] text-xs text-zinc-500">{v.interestPreview ?? '—'}</td>
                                            <td className="py-2 text-xs text-zinc-500">
                                                {v.ministryNames.length ? v.ministryNames.join(', ') : '—'}
                                            </td>
                                            <td className="py-2 text-right">
                                                <button
                                                    type="button"
                                                    onClick={(ev) => {
                                                        ev.stopPropagation();
                                                        openInvite(v);
                                                    }}
                                                    className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                                                >
                                                    Encaminhar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile cards */}
                        <div className="md:hidden space-y-3">
                            {volunteers.data.map((v) => (
                                <div
                                    key={v.id}
                                    className={`w-full rounded-2xl border px-4 py-3 text-left shadow-sm transition hover:bg-zinc-50 dark:hover:bg-zinc-900/60 ${
                                        v.pendingInvite
                                            ? 'border-amber-200 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/10'
                                            : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <button type="button" onClick={() => void openVolunteer(v.id)} className="min-w-0 text-left">
                                            <div className="truncate font-semibold text-zinc-900 dark:text-white">{v.name ?? '—'}</div>
                                            <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                                                {v.stageName} · {formatShortDate(v.createdAt)}
                                            </div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => openInvite(v)}
                                            className="shrink-0 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                                        >
                                            Encaminhar
                                        </button>
                                    </div>
                                    <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-300 space-y-1">
                                        {v.email ? <div className="truncate">{v.email}</div> : null}
                                        {v.phone ? <div className="truncate">{v.phone}</div> : null}
                                        {v.interestPreview ? (
                                            <div className="text-zinc-500 dark:text-zinc-400 line-clamp-2">{v.interestPreview}</div>
                                        ) : null}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {volunteers.data.length === 0 ? (
                            <div className="mt-4 rounded-2xl border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
                                <div className="font-semibold text-zinc-900 dark:text-white">Nenhum voluntário encontrado</div>
                                <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                    Ajuste a fase selecionada ou limpe os filtros para ver mais resultados.
                                </div>
                                <div className="mt-4 flex justify-center gap-2">
                                    <SecondaryButton type="button" onClick={clearFilters}>
                                        Limpar filtros
                                    </SecondaryButton>
                                    <SecondaryButton type="button" onClick={() => pickStage('')}>
                                        Ver todos
                                    </SecondaryButton>
                                </div>
                            </div>
                        ) : null}
                        {volunteers.links.length > 3 ? (
                            <nav className="mt-4 flex flex-wrap gap-1">
                                {volunteers.links.map((l, i) =>
                                    l.url ? (
                                        <Link
                                            key={i}
                                            href={l.url}
                                            className={`rounded px-2 py-1 text-xs ${
                                                l.active
                                                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-black'
                                                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200'
                                            }`}
                                            dangerouslySetInnerHTML={{ __html: l.label }}
                                        />
                                    ) : (
                                        <span
                                            key={i}
                                            className="rounded px-2 py-1 text-xs text-zinc-400"
                                            dangerouslySetInnerHTML={{ __html: l.label }}
                                        />
                                    ),
                                )}
                            </nav>
                        ) : null}
                    </Card>
                </div>
            </div>

            <Modal show={modalOpen} onClose={() => setModalOpen(false)} maxWidth="2xl">
                <div className="flex max-h-[85vh] flex-col">
                    {detailLoading ? (
                        <div className="p-6">
                            <p className="text-sm text-zinc-500">A carregar…</p>
                        </div>
                    ) : detail?.volunteer ? (
                        <>
                            <div className="shrink-0 border-b border-zinc-200 p-4 dark:border-zinc-700">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{detail.volunteer.name}</h2>
                                        <p className="text-xs text-zinc-500">Dados do formulário de inscrição</p>
                                    </div>
                                    {canPipelineMutate ? (
                                        <form onSubmit={submitStageMove} className="flex flex-wrap items-end gap-2">
                                            <div>
                                                <InputLabel value="Fase / pasta" />
                                                <SelectInput
                                                    className="mt-1 min-w-[200px]"
                                                    value={stageMoveForm.data.stage_id}
                                                    onChange={(e) => stageMoveForm.setData('stage_id', e.target.value)}
                                                >
                                                    {detail.stages.map((s) => (
                                                        <option key={s.id} value={String(s.id)}>
                                                            {s.name}
                                                        </option>
                                                    ))}
                                                </SelectInput>
                                            </div>
                                            <PrimaryButton type="submit" disabled={stageMoveForm.processing}>
                                                Salvar fase
                                            </PrimaryButton>
                                            <InputError message={stageMoveForm.errors.stage_id} />
                                        </form>
                                    ) : (
                                        <div className="text-right text-sm text-zinc-600 dark:text-zinc-300">
                                            <div className="text-xs font-medium text-zinc-500">Fase / pasta</div>
                                            <div className="mt-1 font-medium text-zinc-900 dark:text-white">
                                                {detail.pipeline?.stageName ?? '—'}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-4 flex gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
                                    <button
                                        type="button"
                                        onClick={() => setDetailTab('ficha')}
                                        className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                                            detailTab === 'ficha'
                                                ? 'bg-white text-zinc-900 shadow dark:bg-zinc-950 dark:text-white'
                                                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                                        }`}
                                    >
                                        Ficha do cadastro
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDetailTab('notas')}
                                        className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                                            detailTab === 'notas'
                                                ? 'bg-white text-zinc-900 shadow dark:bg-zinc-950 dark:text-white'
                                                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                                        }`}
                                    >
                                        Lista de anotações
                                    </button>
                                </div>
                            </div>

                            <div className="min-h-0 flex-1 overflow-y-auto p-4">
                                {detailTab === 'ficha' ? (
                                    <>
                                        <div className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                                            {[
                                                ['E-mail', String(detail.volunteer.email ?? '—')],
                                                ['Telefone', String(detail.volunteer.phone ?? '—')],
                                                ['Data de nascimento', String(detail.volunteer.birth_date ?? '—')],
                                                ['WhatsApp', yn(detail.volunteer.has_whatsapp)],
                                                ['Redes sociais', yn(detail.volunteer.has_social_networks)],
                                                ['Tempo na igreja (texto)', String(detail.volunteer.attendance_duration ?? '—')],
                                                ['Membro oficial', yn(detail.volunteer.is_official_member)],
                                                ['Registo na NS', yn(detail.volunteer.member_record_at_nova_semente)],
                                                ['Registo noutra igreja', String(detail.volunteer.member_record_church ?? '—')],
                                                ['Experiência prévia em ministério', yn(detail.volunteer.has_previous_ministry_volunteer_experience)],
                                                ['Precisa orientação pastoral', yn(detail.volunteer.needs_pastoral_guidance)],
                                                ['Consentimento LGPD', yn(detail.volunteer.lgpd_data_consent)],
                                                ['Área profissional', String(detail.volunteer.professional_area ?? '—')],
                                                [
                                                    'Ministérios no cadastro',
                                                    Array.isArray(detail.volunteer.ministries)
                                                        ? (detail.volunteer.ministries as { name: string }[]).map((m) => m.name).join(', ') || '—'
                                                        : '—',
                                                ],
                                            ].map(([k, val]) => (
                                                <div key={k} className="border-b border-zinc-100 pb-2 dark:border-zinc-800">
                                                    <div className="text-xs font-medium text-zinc-500">{k}</div>
                                                    <div className="text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap">{val}</div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-6 space-y-2">
                                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Textos longos</h3>
                                            {(
                                                [
                                                    ['Experiências anteriores', detail.volunteer.previous_ministry_details],
                                                    ['Como quer servir', detail.volunteer.ministry_involvement],
                                                    ['Outros interesses', detail.volunteer.other_ministry_interest],
                                                    ['Dons a desenvolver', detail.volunteer.gifts_to_develop],
                                                ] as [string, unknown][]
                                            ).map(([label, val]) => {
                                                const text = val != null && String(val).trim() !== '' ? String(val) : '—';
                                                return (
                                                    <div key={label} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                                        <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">{label}</div>
                                                        <div className="mt-1 text-sm text-zinc-800 whitespace-pre-wrap dark:text-zinc-200">{text}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-4">
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                            Notas internas da equipe de voluntariado (histórico abaixo).
                                        </p>
                                        <ul className="max-h-[min(45vh,320px)] space-y-2 overflow-y-auto text-sm">
                                            {detail.notes.length === 0 ? (
                                                <li className="text-zinc-500">Ainda sem notas.</li>
                                            ) : (
                                                detail.notes.map((n) => (
                                                    <li key={n.id} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900">
                                                        <div className="text-xs text-zinc-500">
                                                            {n.authorName} · {formatDateTime(n.createdAt)}
                                                        </div>
                                                        <div className="text-zinc-800 whitespace-pre-wrap dark:text-zinc-200">{n.body}</div>
                                                    </li>
                                                ))
                                            )}
                                        </ul>
                                        {canPipelineMutate ? (
                                            <form onSubmit={submitNote} className="space-y-2 border-t border-zinc-200 pt-4 dark:border-zinc-700">
                                                <InputLabel value="Nova anotação" />
                                                <Textarea
                                                    value={noteForm.data.body}
                                                    onChange={(e) => noteForm.setData('body', e.target.value)}
                                                    rows={4}
                                                    className="w-full"
                                                    placeholder="Escreva uma nota visível à equipe de voluntariado…"
                                                />
                                                <InputError message={noteForm.errors.body} />
                                                <PrimaryButton type="submit" disabled={noteForm.processing}>
                                                    Adicionar nota
                                                </PrimaryButton>
                                            </form>
                                        ) : (
                                            <p className="border-t border-zinc-200 pt-4 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                                                Apenas consulta: não tem permissão para alterar fases nem adicionar anotações.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="p-6">
                            <p className="text-sm text-red-600">Não foi possível carregar a ficha.</p>
                        </div>
                    )}
                </div>
            </Modal>

            {publicVolunteerSignupUrl && canPipelineMutate ? (
                <PublicVolunteerSignupShareModal
                    show={publicInviteOpen}
                    link={publicVolunteerSignupUrl}
                    churchName={churchName}
                    onClose={() => setPublicInviteOpen(false)}
                />
            ) : null}

            <Modal
                show={inviteOpen}
                onClose={() => {
                    setInviteOpen(false);
                    setInviteVolunteer(null);
                    setInviteMinistryId('');
                    setInviteChannels({ inbox: true });
                }}
                maxWidth="lg"
            >
                <div className="p-6 space-y-4">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Encaminhar voluntário</h2>
                    <p className="text-sm text-zinc-600 dark:text-zinc-300">
                        {inviteVolunteer?.name ?? 'Voluntário'} — escolha o departamento e como deseja enviar.
                    </p>
                    <form onSubmit={submitInvite} className="space-y-4">
                        <div>
                            <InputLabel value="Departamento *" />
                            <select
                                value={inviteMinistryId}
                                onChange={(e) => setInviteMinistryId(e.target.value)}
                                className="mt-1 block h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                                required
                            >
                                <option value="">Selecione…</option>
                                {ministries.map((m) => (
                                    <option key={m.id} value={String(m.id)}>
                                        {m.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
                            <p className="text-sm font-semibold text-zinc-900 dark:text-white">Canais</p>
                            <div className="mt-3 space-y-2">
                                <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                                    <span className="text-zinc-700 dark:text-zinc-200">E-mail (principal)</span>
                                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Sempre</span>
                                </div>
                                <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
                                    <input
                                        type="checkbox"
                                        checked={inviteChannels.inbox}
                                        onChange={(e) => setInviteChannels({ inbox: e.target.checked })}
                                        className="rounded border-zinc-300 dark:border-zinc-600"
                                    />
                                    Notificação (app) — opcional
                                </label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <SecondaryButton
                                type="button"
                                onClick={() => {
                                    setInviteOpen(false);
                                    setInviteVolunteer(null);
                                    setInviteMinistryId('');
                                    setInviteChannels({ inbox: true });
                                }}
                            >
                                Cancelar
                            </SecondaryButton>
                            <PrimaryButton
                                type="submit"
                                disabled={!inviteMinistryId}
                            >
                                Enviar convite
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </Modal>

            <Modal show={stageManageOpen} onClose={() => setStageManageOpen(false)} maxWidth="lg" disableBodyScroll>
                <div className="p-6 space-y-5">
                    <div className="pr-10">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Gerir fases</h2>
                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                            A ordem das colunas no quadro segue a lista abaixo. Use as setas para mover uma fase; guarde o nome
                            só depois de o editar.
                        </p>
                    </div>

                    <ol className="max-h-[min(55vh,420px)] space-y-2 overflow-y-auto pr-1">
                        {stages.map((s, index) => {
                            const key = String(s.id);
                            const st = stageEdit[key] ?? { name: s.name ?? '' };
                            const serverName = s.name ?? '';
                            const nameDirty = st.name.trim() !== serverName.trim();
                            return (
                                <li key={s.id}>
                                    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/60 sm:flex-row sm:items-center sm:gap-3">
                                        <div className="flex items-center gap-2 sm:w-28 sm:shrink-0">
                                            <span
                                                className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-xs font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                                                title="Posição no quadro"
                                            >
                                                {index + 1}
                                            </span>
                                            <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-600">
                                                <button
                                                    type="button"
                                                    disabled={index === 0 || stageOrderBusy}
                                                    onClick={() => swapStageNeighbors(index, 'up')}
                                                    className="p-2 text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-30 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                                    aria-label="Mover fase para cima"
                                                    title="Mover para cima"
                                                >
                                                    <ChevronUpIcon className="h-4 w-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={index >= stages.length - 1 || stageOrderBusy}
                                                    onClick={() => swapStageNeighbors(index, 'down')}
                                                    className="border-l border-zinc-200 p-2 text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-30 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                                    aria-label="Mover fase para baixo"
                                                    title="Mover para baixo"
                                                >
                                                    <ChevronDownIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <label htmlFor={`stage-name-${s.id}`} className="sr-only">
                                                Nome da fase {index + 1}
                                            </label>
                                            <TextInput
                                                id={`stage-name-${s.id}`}
                                                value={st.name}
                                                onChange={(e) =>
                                                    setStageEdit((cur) => ({ ...cur, [key]: { name: e.target.value } }))
                                                }
                                                className="w-full"
                                                placeholder="Nome da fase"
                                            />
                                        </div>
                                        <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end sm:gap-2">
                                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                                <span className="font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">
                                                    {s.volunteer_count}
                                                </span>{' '}
                                                voluntário{s.volunteer_count === 1 ? '' : 's'}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                {nameDirty ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => saveStageName(s.id, serverName)}
                                                        className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:bg-brand-500 dark:hover:bg-brand-400 dark:focus:ring-brand-400 dark:focus:ring-offset-zinc-900"
                                                    >
                                                        Guardar nome
                                                    </button>
                                                ) : null}
                                                <button
                                                    type="button"
                                                    onClick={() => requestDeleteStage(s.id, st.name, s.volunteer_count)}
                                                    className="rounded-lg px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
                                                >
                                                    Excluir
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ol>

                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
                        <div className="text-sm font-semibold text-zinc-900 dark:text-white">Nova fase</div>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            A nova fase aparece no fim do quadro; depois pode reordená-la com as setas.
                        </p>
                        <form onSubmit={submitNewStage} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start">
                            <div className="flex-1">
                                <TextInput
                                    value={stageForm.data.name}
                                    onChange={(e) => stageForm.setData('name', e.target.value)}
                                    placeholder="Ex.: Entrevista agendada"
                                    className="w-full"
                                />
                                <InputError message={stageForm.errors.name} className="mt-1" />
                            </div>
                            <PrimaryButton type="submit" disabled={stageForm.processing} className="sm:self-start">
                                Adicionar fase
                            </PrimaryButton>
                        </form>
                    </div>

                    <div className="flex justify-end border-t border-zinc-200 pt-4 dark:border-zinc-700">
                        <SecondaryButton type="button" onClick={() => setStageManageOpen(false)}>
                            Fechar
                        </SecondaryButton>
                    </div>
                </div>
            </Modal>
        </AdminLayout>
    );
}
