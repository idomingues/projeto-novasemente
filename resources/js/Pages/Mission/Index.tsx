import AdminLayout from '@/Layouts/AdminLayout';
import FlashMessages from '@/Components/FlashMessages';
import Modal from '@/Components/Modal';
import PageHeader from '@/Components/PageHeader';
import MissionAdminTabs from '@/Components/Mission/MissionAdminTabs';
import Card from '@/Components/Card';
import BrDateInput from '@/Components/BrDateInput';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import SelectInput from '@/Components/SelectInput';
import Checkbox from '@/Components/Checkbox';
import Textarea from '@/Components/Textarea';
import InputError from '@/Components/InputError';
import { Head, router, useForm } from '@inertiajs/react';
import { FormEventHandler, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { confirmAction } from '@/utils/confirmDialog';
import RecordDetailHeader from '@/Components/RecordDetail/RecordDetailHeader';
import UserListAvatar from '@/Components/UserListAvatar';
import {
    missionVolunteerDetailSections,
    type MissionVolunteerDetail,
} from '@/utils/missionVolunteerDetailRows';
import axios from 'axios';
import { AdjustmentsHorizontalIcon, ChevronDownIcon, ChevronUpIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import ListViewModeToggle from '@/Components/ListViewModeToggle';
import ListSearchHint from '@/Components/ListSearchHint';
import MissionBroadcastModal from '@/Components/Mission/MissionBroadcastModal';
import MissionKanban from '@/Components/Mission/MissionKanban';
import MissionPhaseManageModal from '@/Components/Mission/MissionPhaseManageModal';
import { useDebouncedServerSearch } from '@/hooks/useDebouncedServerSearch';
import { usePersistedViewMode } from '@/hooks/usePersistedViewMode';
import type { ListKanbanViewMode } from '@/utils/persistedViewMode';
import { missionOverdueRowClass } from '@/utils/missionOverdueStyles';
import {
    MISSION_FILTER_FORM_DEFAULTS,
    type MissionRosterFilters,
    missionActiveFiltersCount,
    missionSortOptions,
    missionSortSelectValue,
    missionVolunteersQuery,
} from '@/utils/missionRosterFilters';
import { serverSearchTerm } from '@/utils/listSearch';

type PhaseRow = {
    id: number;
    name: string;
    sort_order: number;
    sla_days: number;
    volunteer_count: number;
    overdue_count: number;
};

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
    daysInPhase: number;
    slaDays: number | null;
    isOverdue: boolean;
    daysOverdue: number | null;
    phaseEnteredAt: string | null;
    phaseEnteredAtLabel: string | null;
    canEditPhase: boolean;
};

type MissionSlaMetrics = {
    daysInPhase: number;
    slaDays: number | null;
    isOverdue: boolean;
    daysOverdue: number | null;
    phaseEnteredAt: string | null;
    phaseEnteredAtLabel: string | null;
};

type DetailVolunteer = MissionVolunteerDetail & { sla?: MissionSlaMetrics };

type DetailNote = { id: number; body: string; authorName: string; createdAt: string | null };

type DetailPhaseHistory = {
    id: number;
    fromPhaseName: string | null;
    toPhaseName: string;
    changedAt: string | null;
    changedBy: string | null;
};

type DetailJson = {
    volunteer: DetailVolunteer;
    stages: { id: number; name: string; sort_order: number; sla_days: number }[];
    notes: DetailNote[];
    phaseHistory: DetailPhaseHistory[];
    canManage: boolean;
    canEditPhase: boolean;
    canAddNote: boolean;
    updatePhaseUrl: string | null;
    storeNoteUrl: string;
    destroyUrl: string | null;
};

type DetailTab = 'ficha' | 'historico' | 'notas';

type TeamMemberRow = {
    id: number;
    name: string;
    email: string | null;
    is_mission_team: boolean;
    mission_phase_ids: number[];
    has_mission_view: boolean;
};

interface Paginated<T> {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    total?: number;
    per_page?: number;
}

type MissionOptions = {
    professions: string[];
    beliefs: string[];
    religions: string[];
    studied_bible: string[];
    wants_bible_study_partner: string[];
};

interface Props {
    volunteers: Paginated<VolunteerRow>;
    phases: PhaseRow[];
    filters: MissionRosterFilters;
    options: MissionOptions;
    overdueTotal: number;
    canManage: boolean;
    operablePhaseIds: number[] | null;
    teamMembers: TeamMemberRow[];
    teamUpdateUrlPattern: string;
    storeStageUrl: string;
    detailUrlPattern: string;
    broadcastStoreUrl: string;
    filteredTotal: number;
}

const MISSION_VIEW_STORAGE_KEY = 'ns-mission-view';
const MISSION_KANBAN_PER_PAGE = '500';

const tri = (
    <>
        <option value="">Qualquer</option>
        <option value="1">Sim</option>
        <option value="0">Não</option>
    </>
);

function formatDateTime(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
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

function teamUpdateUrlFromPattern(pattern: string, userId: number): string {
    return pattern.replace(/\/0(\/|$)/, `/${userId}$1`);
}

const missionAdminToolbarBtnClass =
    'inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800';

const missionAdminToolbarPrimaryBtnClass =
    'inline-flex h-10 items-center justify-center rounded-xl bg-zinc-900 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200';

export default function MissionIndex({
    volunteers,
    phases,
    filters,
    options,
    overdueTotal,
    canManage,
    operablePhaseIds,
    teamMembers,
    teamUpdateUrlPattern,
    storeStageUrl,
    detailUrlPattern,
    broadcastStoreUrl,
    filteredTotal,
}: Props) {
    const [viewMode, setViewMode] = usePersistedViewMode(MISSION_VIEW_STORAGE_KEY);
    const [stageManageOpen, setStageManageOpen] = useState(false);
    const [teamManageOpen, setTeamManageOpen] = useState(false);
    const [broadcastOpen, setBroadcastOpen] = useState(false);
    const [stageEdits, setStageEdits] = useState(() =>
        phases.map((p) => ({ id: p.id, name: p.name, sort_order: p.sort_order, sla_days: p.sla_days })),
    );
    const [newStageName, setNewStageName] = useState('');
    const [newStageSlaDays, setNewStageSlaDays] = useState('7');
    const [stageOrderBusy, setStageOrderBusy] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detail, setDetail] = useState<DetailJson | null>(null);
    const [detailPhaseId, setDetailPhaseId] = useState('');
    const [detailTab, setDetailTab] = useState<DetailTab>('ficha');
    const openedCadastroFromUrl = useRef(false);
    const filtersRef = useRef(filters);
    const lastAppliedSearchRef = useRef(filters.search ?? '');
    const [filtersOpen, setFiltersOpen] = useState(false);

    filtersRef.current = filters;

    const filterForm = useForm<MissionRosterFilters>({
        search: filters.search,
        mission_phase_id: filters.mission_phase_id,
        overdue: filters.overdue,
        sort: filters.sort,
        sort_dir: filters.sort_dir,
        ...MISSION_FILTER_FORM_DEFAULTS,
        has_app_account: filters.has_app_account,
        has_email: filters.has_email,
        has_phone: filters.has_phone,
        has_birth_date: filters.has_birth_date,
        has_belief: filters.has_belief,
        participates_religion: filters.participates_religion,
        baptized: filters.baptized,
        first_time_nova_semente: filters.first_time_nova_semente,
        studied_bible_structured: filters.studied_bible_structured,
        lgpd_consent: filters.lgpd_consent,
        studied_bible: filters.studied_bible,
        wants_bible_study_partner: filters.wants_bible_study_partner,
        belief_which: filters.belief_which,
        religion_which: filters.religion_which,
        profession: filters.profession,
        profile_type: filters.profile_type,
        ministry_preference: filters.ministry_preference,
        engagement_level: filters.engagement_level,
        created_from: filters.created_from,
        created_to: filters.created_to,
        birth_date_from: filters.birth_date_from,
        birth_date_to: filters.birth_date_to,
    });

    useEffect(() => {
        filterForm.setData({
            search: filters.search,
            mission_phase_id: filters.mission_phase_id,
            overdue: filters.overdue,
            sort: filters.sort,
            sort_dir: filters.sort_dir,
            has_app_account: filters.has_app_account,
            has_email: filters.has_email,
            has_phone: filters.has_phone,
            has_birth_date: filters.has_birth_date,
            has_belief: filters.has_belief,
            participates_religion: filters.participates_religion,
            baptized: filters.baptized,
            first_time_nova_semente: filters.first_time_nova_semente,
            studied_bible_structured: filters.studied_bible_structured,
            lgpd_consent: filters.lgpd_consent,
            studied_bible: filters.studied_bible,
            wants_bible_study_partner: filters.wants_bible_study_partner,
            belief_which: filters.belief_which,
            religion_which: filters.religion_which,
            profession: filters.profession,
            profile_type: filters.profile_type,
            ministry_preference: filters.ministry_preference,
            engagement_level: filters.engagement_level,
            created_from: filters.created_from,
            created_to: filters.created_to,
            birth_date_from: filters.birth_date_from,
            birth_date_to: filters.birth_date_to,
        });
    }, [filters]);

    useEffect(() => {
        setStageEdits(phases.map((p) => ({ id: p.id, name: p.name, sort_order: p.sort_order, sla_days: p.sla_days })));
    }, [phases]);

    const sortedStageEdits = useMemo(
        () => [...stageEdits].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
        [stageEdits],
    );

    const currentStageFilter = filters.mission_phase_id ?? '';
    const pipelineTotalCount = useMemo(() => phases.reduce((acc, s) => acc + s.volunteer_count, 0), [phases]);
    const isKanbanView = viewMode === 'kanban';
    const kanbanPerPage = Number(MISSION_KANBAN_PER_PAGE);

    const listQueryOpts = isKanbanView ? ({ kanban: true } as const) : undefined;

    const buildListQuery = useCallback(
        (nextFilters: MissionRosterFilters, search: string, extra: Record<string, string> = {}) =>
            missionVolunteersQuery(nextFilters, search, extra, listQueryOpts),
        [listQueryOpts],
    );

    const reloadList = useCallback(
        (overrides: Partial<MissionRosterFilters> = {}, kanban?: boolean) => {
            const merged = { ...filtersRef.current, ...overrides };
            const search = overrides.search ?? merged.search ?? '';
            const useKanban = kanban ?? isKanbanView;
            router.get(
                route('mission.index'),
                missionVolunteersQuery(merged, search, {}, useKanban ? { kanban: true } : undefined),
                { preserveState: true, replace: true },
            );
        },
        [isKanbanView],
    );

    const {
        value: searchQuery,
        setValue: setSearchQuery,
        isBelowMinimum: searchBelowMinimum,
    } = useDebouncedServerSearch({
        serverValue: filters.search ?? '',
        onApply: useCallback(
            (term) => {
                const applied = term ?? '';
                lastAppliedSearchRef.current = applied;
                reloadList({ search: applied });
            },
            [reloadList],
        ),
    });

    const sortOptions = useMemo(() => missionSortOptions(), []);
    const currentSortValue = missionSortSelectValue(filters.sort, filters.sort_dir);
    const activeFiltersCount = useMemo(() => missionActiveFiltersCount(filters), [filters]);

    const applyFilters: FormEventHandler = (e) => {
        e.preventDefault();
        const resolvedSearch = serverSearchTerm(searchQuery) ?? '';
        lastAppliedSearchRef.current = resolvedSearch;
        router.get(route('mission.index'), buildListQuery({ ...filterForm.data, search: resolvedSearch }, resolvedSearch), {
            preserveState: true,
            replace: true,
        });
    };

    const clearAdvancedFilters = () => {
        const cleared: MissionRosterFilters = {
            ...filterForm.data,
            ...MISSION_FILTER_FORM_DEFAULTS,
            search: '',
            mission_phase_id: filterForm.data.mission_phase_id,
            overdue: false,
            sort: filterForm.data.sort,
            sort_dir: filterForm.data.sort_dir,
        };
        filterForm.setData(cleared);
        lastAppliedSearchRef.current = '';
        setSearchQuery('');
        router.get(route('mission.index'), buildListQuery(cleared, ''), { preserveState: true, replace: true });
    };

    const applySortSelection = (combined: string) => {
        const option = sortOptions.find((o) => o.value === combined) ?? sortOptions[0];
        const resolvedSearch = serverSearchTerm(searchQuery) ?? '';
        lastAppliedSearchRef.current = resolvedSearch;
        router.get(
            route('mission.index'),
            buildListQuery(
                {
                    ...filterForm.data,
                    sort: option.sort,
                    sort_dir: option.sort_dir,
                },
                resolvedSearch,
            ),
            { preserveState: true, replace: true },
        );
    };

    const changeViewMode = useCallback(
        (mode: ListKanbanViewMode) => {
            setViewMode(mode);
            if (mode === 'kanban') {
                reloadList({ mission_phase_id: '' }, true);
            }
        },
        [setViewMode, reloadList],
    );

    const kanbanHydratedRef = useRef(false);
    useEffect(() => {
        if (viewMode !== 'kanban') {
            kanbanHydratedRef.current = false;
            return;
        }
        if (kanbanHydratedRef.current) {
            return;
        }
        const needsReload =
            (filters.mission_phase_id ?? '') !== '' ||
            (typeof volunteers.per_page === 'number' && volunteers.per_page < kanbanPerPage);
        if (!needsReload) {
            kanbanHydratedRef.current = true;
            return;
        }
        kanbanHydratedRef.current = true;
        reloadList({ mission_phase_id: '' }, true);
    }, [viewMode, filters.mission_phase_id, volunteers.per_page, kanbanPerPage, reloadList]);

    const pickStage = (id: number | '') => {
        const resolvedSearch = serverSearchTerm(searchQuery) ?? '';
        lastAppliedSearchRef.current = resolvedSearch;
        router.get(
            route('mission.index'),
            buildListQuery(
                {
                    ...filterForm.data,
                    mission_phase_id: id === '' ? '' : String(id),
                },
                resolvedSearch,
            ),
            { preserveState: true, replace: true },
        );
    };

    const toggleOverdueFilter = () => {
        reloadList({ overdue: !filters.overdue }, isKanbanView);
    };

    const openDetail = useCallback(
        async (id: number, tab: DetailTab = 'ficha') => {
            setDetailOpen(true);
            setDetailLoading(true);
            setDetail(null);
            setDetailTab(tab);
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

    const saveDetailPhase = () => {
        if (!detail?.updatePhaseUrl || !detailPhaseId) return;
        router.patch(detail.updatePhaseUrl, { mission_phase_id: Number(detailPhaseId) }, {
            preserveScroll: true,
            onSuccess: () => void openDetail(detail.volunteer.id, 'ficha'),
        });
    };

    const storeStage: FormEventHandler = (e) => {
        e.preventDefault();
        if (!newStageName.trim()) return;
        const slaDays = Number(newStageSlaDays);
        if (!Number.isInteger(slaDays) || slaDays < 1) return;
        router.post(
            storeStageUrl,
            { name: newStageName.trim(), sla_days: slaDays },
            { preserveScroll: true, onSuccess: () => { setNewStageName(''); setNewStageSlaDays('7'); } },
        );
    };

    const saveStageMeta = (stage: { id: number; name: string; sort_order: number; sla_days: number }) => {
        router.put(route('mission.phases.update', stage.id), stage, { preserveScroll: true });
    };

    const swapStageNeighbors = (fromIndex: number, direction: 'up' | 'down') => {
        if (stageOrderBusy) return;
        const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
        if (toIndex < 0 || toIndex >= sortedStageEdits.length) return;

        const a = sortedStageEdits[fromIndex];
        const b = sortedStageEdits[toIndex];
        const nameA = a.name.trim();
        const nameB = b.name.trim();
        if (!nameA || !nameB) return;

        setStageOrderBusy(true);
        router.put(
            route('mission.phases.update', a.id),
            { name: nameA, sort_order: b.sort_order, sla_days: a.sla_days },
            {
                preserveScroll: true,
                onSuccess: () => {
                    router.put(
                        route('mission.phases.update', b.id),
                        { name: nameB, sort_order: a.sort_order, sla_days: b.sla_days },
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

    const deleteStage = async (stage: { id: number; name: string; volunteer_count: number }) => {
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
            <div className="space-y-6">
            <PageHeader
                title="Missão"
                subtitle="Quadro por fases, fichas, histórico e anotações da equipe Missão."
                actions={
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        {canManage ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setTeamManageOpen(true)}
                                    className={missionAdminToolbarBtnClass}
                                >
                                    Equipe Missão
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBroadcastOpen(true)}
                                    disabled={filteredTotal === 0}
                                    className={missionAdminToolbarPrimaryBtnClass}
                                    title={
                                        filteredTotal === 0
                                            ? 'Nenhum cadastro no filtro atual'
                                            : `Notificar ${filteredTotal} cadastro(s) do filtro atual`
                                    }
                                >
                                    Notificar
                                    {filteredTotal > 0 ? (
                                        <span className="ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-white/20 px-1.5 py-0.5 text-xs font-bold tabular-nums">
                                            {filteredTotal}
                                        </span>
                                    ) : null}
                                </button>
                            </>
                        ) : null}
                        <ListViewModeToggle value={isKanbanView ? 'kanban' : 'list'} onChange={changeViewMode} />
                    </div>
                }
            >
                {isKanbanView && canManage ? (
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => setStageManageOpen(true)}
                            className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400"
                        >
                            Gerir fases
                        </button>
                    </div>
                ) : null}
            </PageHeader>

            <MissionAdminTabs active="cadastros" />

            <div className={`flex flex-col gap-6 ${isKanbanView ? '' : 'lg:flex-row'}`}>
                {!isKanbanView ? (
                <aside className="shrink-0 space-y-4 lg:w-64">
                    <Card className="p-4">
                        <div className="mb-2 flex items-center justify-between gap-2">
                            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Fases</div>
                            {canManage ? (
                                <button
                                    type="button"
                                    onClick={() => setStageManageOpen(true)}
                                    className="shrink-0 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
                                >
                                    Gerir fases
                                </button>
                            ) : null}
                        </div>
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
                                        <span className="min-w-0 flex-1 truncate pr-2">
                                            {s.name}
                                            <span className="mt-0.5 block text-[10px] font-normal opacity-80">SLA {s.sla_days} dias</span>
                                        </span>
                                        <span className="flex flex-col items-end gap-0.5 text-xs tabular-nums">
                                            <span>{s.volunteer_count}</span>
                                            {s.overdue_count > 0 ? (
                                                <span className="rounded bg-red-500/90 px-1 py-0.5 text-[10px] font-semibold text-white">
                                                    {s.overdue_count} atraso
                                                </span>
                                            ) : null}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                        {overdueTotal > 0 && (
                            <button
                                type="button"
                                onClick={toggleOverdueFilter}
                                className={[
                                    'mt-3 w-full rounded-lg px-3 py-2 text-left text-sm font-medium',
                                    filters.overdue
                                        ? 'bg-red-600 text-white'
                                        : 'bg-red-50 text-red-800 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-900',
                                ].join(' ')}
                            >
                                {filters.overdue ? 'Mostrar todos' : `Atrasados (${overdueTotal})`}
                            </button>
                        )}
                    </Card>
                </aside>
                ) : null}

                <div className="min-w-0 flex-1 space-y-4">
                    <div className="relative">
                        <MagnifyingGlassIcon
                            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400"
                            aria-hidden
                        />
                        <TextInput
                            type="search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10"
                            placeholder="Nome, e-mail ou telefone"
                            aria-label="Nome, e-mail ou telefone"
                        />
                        <ListSearchHint show={searchBelowMinimum} className="mt-1 pl-10" />
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <button
                            type="button"
                            onClick={() => setFiltersOpen((o) => !o)}
                            className="flex h-11 min-w-0 flex-1 items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 text-left text-sm font-semibold text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                        >
                            <span className="flex min-w-0 items-center gap-2">
                                <AdjustmentsHorizontalIcon className="h-5 w-5 shrink-0 text-zinc-500" aria-hidden />
                                <span className="truncate">Filtros do cadastro</span>
                                {activeFiltersCount > 0 ? (
                                    <span className="inline-flex shrink-0 items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                                        {activeFiltersCount}
                                    </span>
                                ) : null}
                            </span>
                            {filtersOpen ? (
                                <ChevronUpIcon className="h-5 w-5 shrink-0" />
                            ) : (
                                <ChevronDownIcon className="h-5 w-5 shrink-0" />
                            )}
                        </button>
                        <div className="relative flex h-11 w-full shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:w-56">
                            <span
                                id="mission-sort-label"
                                className="flex shrink-0 items-center border-r border-zinc-200 px-3 text-xs font-semibold text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
                            >
                                Ordenação
                            </span>
                            <select
                                id="mission-sort"
                                value={currentSortValue}
                                onChange={(e) => applySortSelection(e.target.value)}
                                aria-labelledby="mission-sort-label"
                                className="h-full min-w-0 flex-1 appearance-none border-0 bg-transparent py-0 pl-2 pr-8 text-sm font-medium text-zinc-900 focus:border-transparent focus:outline-none focus:ring-0 dark:text-zinc-100"
                            >
                                {sortOptions.map((o) => (
                                    <option key={o.value} value={o.value}>
                                        {o.label}
                                    </option>
                                ))}
                            </select>
                            <ChevronDownIcon
                                className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 dark:text-zinc-400"
                                aria-hidden
                            />
                        </div>
                    </div>
                    {filtersOpen ? (
                        <Card className="p-4">
                            <form onSubmit={applyFilters} className="space-y-4">
                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                    <div className="sm:col-span-2 xl:col-span-3">
                                        <InputLabel value="Conta no app" />
                                        <SelectInput
                                            className="mt-1"
                                            value={filterForm.data.has_app_account}
                                            onChange={(e) => filterForm.setData('has_app_account', e.target.value)}
                                        >
                                            {tri}
                                        </SelectInput>
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
                                        <InputLabel value="LGPD" />
                                        <SelectInput
                                            className="mt-1"
                                            value={filterForm.data.lgpd_consent}
                                            onChange={(e) => filterForm.setData('lgpd_consent', e.target.value)}
                                        >
                                            {tri}
                                        </SelectInput>
                                    </div>
                                    <div>
                                        <InputLabel value="Tem crença" />
                                        <SelectInput
                                            className="mt-1"
                                            value={filterForm.data.has_belief}
                                            onChange={(e) => filterForm.setData('has_belief', e.target.value)}
                                        >
                                            {tri}
                                        </SelectInput>
                                    </div>
                                    <div>
                                        <InputLabel value="Participa de religião" />
                                        <SelectInput
                                            className="mt-1"
                                            value={filterForm.data.participates_religion}
                                            onChange={(e) => filterForm.setData('participates_religion', e.target.value)}
                                        >
                                            {tri}
                                        </SelectInput>
                                    </div>
                                    <div>
                                        <InputLabel value="Batizado" />
                                        <SelectInput
                                            className="mt-1"
                                            value={filterForm.data.baptized}
                                            onChange={(e) => filterForm.setData('baptized', e.target.value)}
                                        >
                                            {tri}
                                        </SelectInput>
                                    </div>
                                    <div>
                                        <InputLabel value="Primeira vez na Nova Semente" />
                                        <SelectInput
                                            className="mt-1"
                                            value={filterForm.data.first_time_nova_semente}
                                            onChange={(e) => filterForm.setData('first_time_nova_semente', e.target.value)}
                                        >
                                            {tri}
                                        </SelectInput>
                                    </div>
                                    <div>
                                        <InputLabel value="Estudo bíblico estruturado" />
                                        <SelectInput
                                            className="mt-1"
                                            value={filterForm.data.studied_bible_structured}
                                            onChange={(e) => filterForm.setData('studied_bible_structured', e.target.value)}
                                        >
                                            {tri}
                                        </SelectInput>
                                    </div>
                                    <div>
                                        <InputLabel value="Profissão" />
                                        <SelectInput
                                            className="mt-1"
                                            value={filterForm.data.profession}
                                            onChange={(e) => filterForm.setData('profession', e.target.value)}
                                        >
                                            <option value="">Qualquer</option>
                                            {options.professions.map((p) => (
                                                <option key={p} value={p}>
                                                    {p}
                                                </option>
                                            ))}
                                        </SelectInput>
                                    </div>
                                    <div>
                                        <InputLabel value="Crença (qual)" />
                                        <SelectInput
                                            className="mt-1"
                                            value={filterForm.data.belief_which}
                                            onChange={(e) => filterForm.setData('belief_which', e.target.value)}
                                        >
                                            <option value="">Qualquer</option>
                                            {options.beliefs.map((b) => (
                                                <option key={b} value={b}>
                                                    {b}
                                                </option>
                                            ))}
                                        </SelectInput>
                                    </div>
                                    <div>
                                        <InputLabel value="Religião (qual)" />
                                        <SelectInput
                                            className="mt-1"
                                            value={filterForm.data.religion_which}
                                            onChange={(e) => filterForm.setData('religion_which', e.target.value)}
                                        >
                                            <option value="">Qualquer</option>
                                            {options.religions.map((r) => (
                                                <option key={r} value={r}>
                                                    {r}
                                                </option>
                                            ))}
                                        </SelectInput>
                                    </div>
                                    <div>
                                        <InputLabel value="Já estudou a Bíblia" />
                                        <SelectInput
                                            className="mt-1"
                                            value={filterForm.data.studied_bible}
                                            onChange={(e) => filterForm.setData('studied_bible', e.target.value)}
                                        >
                                            <option value="">Qualquer</option>
                                            {options.studied_bible.map((s) => (
                                                <option key={s} value={s}>
                                                    {s}
                                                </option>
                                            ))}
                                        </SelectInput>
                                    </div>
                                    <div>
                                        <InputLabel value="Parceiro de estudo bíblico" />
                                        <SelectInput
                                            className="mt-1"
                                            value={filterForm.data.wants_bible_study_partner}
                                            onChange={(e) => filterForm.setData('wants_bible_study_partner', e.target.value)}
                                        >
                                            <option value="">Qualquer</option>
                                            {options.wants_bible_study_partner.map((w) => (
                                                <option key={w} value={w}>
                                                    {w}
                                                </option>
                                            ))}
                                        </SelectInput>
                                    </div>
                                    <div>
                                        <InputLabel value="Perfil" />
                                        <TextInput
                                            className="mt-1"
                                            value={filterForm.data.profile_type}
                                            onChange={(e) => filterForm.setData('profile_type', e.target.value)}
                                            placeholder="Texto do cadastro"
                                        />
                                    </div>
                                    <div>
                                        <InputLabel value="Preferência de ministério" />
                                        <TextInput
                                            className="mt-1"
                                            value={filterForm.data.ministry_preference}
                                            onChange={(e) => filterForm.setData('ministry_preference', e.target.value)}
                                            placeholder="Texto do cadastro"
                                        />
                                    </div>
                                    <div>
                                        <InputLabel value="Nível de engajamento" />
                                        <TextInput
                                            className="mt-1"
                                            value={filterForm.data.engagement_level}
                                            onChange={(e) => filterForm.setData('engagement_level', e.target.value)}
                                            placeholder="Texto do cadastro"
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
                                        <BrDateInput
                                            className="mt-1"
                                            value={filterForm.data.birth_date_from}
                                            onChange={(iso) => filterForm.setData('birth_date_from', iso)}
                                        />
                                    </div>
                                    <div>
                                        <InputLabel value="Nascimento até" />
                                        <BrDateInput
                                            className="mt-1"
                                            value={filterForm.data.birth_date_to}
                                            onChange={(iso) => filterForm.setData('birth_date_to', iso)}
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <PrimaryButton type="submit">Aplicar filtros</PrimaryButton>
                                    <SecondaryButton type="button" onClick={clearAdvancedFilters}>
                                        Limpar filtros
                                    </SecondaryButton>
                                </div>
                            </form>
                        </Card>
                    ) : null}

                    {isKanbanView ? (
                        <Card className="p-4">
                            <MissionKanban
                                phases={phases}
                                volunteers={volunteers.data}
                                operablePhaseIds={operablePhaseIds}
                                onOpenVolunteer={(id) => void openDetail(id)}
                                totalCount={volunteers.total}
                            />
                        </Card>
                    ) : (
                    <Card className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-zinc-200 text-left dark:border-zinc-700">
                                    <th className="p-3">Nome</th>
                                    <th className="p-3">Fase</th>
                                    <th className="p-3">SLA</th>
                                    <th className="p-3">Contato</th>
                                </tr>
                            </thead>
                            <tbody>
                                {volunteers.data.map((v) => (
                                    <tr
                                        key={v.id}
                                        className={`cursor-pointer ${missionOverdueRowClass(v.isOverdue)}`}
                                        onClick={() => void openDetail(v.id)}
                                    >
                                        <td className="p-3">
                                            <div className="flex items-center gap-3">
                                                <UserListAvatar name={v.fullName} photoUrl={v.photoUrl} size="md" />
                                                <div className="min-w-0">
                                                    <div className="font-medium text-zinc-900 dark:text-white">{v.fullName}</div>
                                                    {!v.hasEmail && <NoEmailHint />}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-3">{v.phaseName}</td>
                                        <td className="p-3">
                                            <SlaCell row={v} />
                                        </td>
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
                    )}
                </div>
            </div>

            <Modal show={detailOpen} onClose={closeDetail} maxWidth="2xl" disableBodyScroll>
                <div className="flex max-h-[min(100dvh-1rem,880px)] min-h-0 w-full flex-col overflow-hidden sm:max-h-[min(90dvh,860px)]">
                    {detailLoading ? (
                        <div className="p-6">
                            <p className="text-sm text-zinc-500">Carregando ficha…</p>
                        </div>
                    ) : detail ? (
                        <DetailPanel
                            detail={detail}
                            detailTab={detailTab}
                            setDetailTab={setDetailTab}
                            detailPhaseId={detailPhaseId}
                            setDetailPhaseId={setDetailPhaseId}
                            onSavePhase={saveDetailPhase}
                            onNoteSaved={() => void openDetail(detail.volunteer.id, 'notas')}
                            onClose={closeDetail}
                        />
                    ) : null}
                </div>
            </Modal>

            <MissionPhaseManageModal
                show={stageManageOpen}
                onClose={() => setStageManageOpen(false)}
                phases={phases}
                sortedStageEdits={sortedStageEdits}
                setStageEdits={setStageEdits}
                stageOrderBusy={stageOrderBusy}
                onSwap={swapStageNeighbors}
                onSave={saveStageMeta}
                onDelete={(phase) => void deleteStage(phase)}
                newStageName={newStageName}
                setNewStageName={setNewStageName}
                newStageSlaDays={newStageSlaDays}
                setNewStageSlaDays={setNewStageSlaDays}
                onSubmitNew={storeStage}
            />

            <Modal show={teamManageOpen} onClose={() => setTeamManageOpen(false)} maxWidth="2xl">
                <div className="max-h-[min(90vh,80vh)] overflow-y-auto p-6">
                    <h2 className="text-lg font-semibold">Equipe Missão</h2>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        Marque usuários com permissão de ver Missão como equipe e defina em quais fases podem mover cadastros.
                    </p>
                    <MissionTeamPanel
                        members={teamMembers}
                        phases={phases}
                        teamUpdateUrlPattern={teamUpdateUrlPattern}
                    />
                </div>
            </Modal>

            <MissionBroadcastModal
                show={broadcastOpen}
                onClose={() => setBroadcastOpen(false)}
                storeUrl={broadcastStoreUrl}
                filteredTotal={filteredTotal}
                filters={filters}
            />
            </div>

        </AdminLayout>
    );
}

function NoEmailHint() {
    return <div className="text-xs text-amber-600">Sem e-mail</div>;
}

function SlaCell({ row }: { row: VolunteerRow }) {
    if (row.isOverdue && row.daysOverdue !== null) {
        return (
            <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800 dark:bg-red-950 dark:text-red-200">
                {row.daysOverdue} {row.daysOverdue === 1 ? 'dia' : 'dias'} atrasado
            </span>
        );
    }

    const sla = row.slaDays ?? '—';

    return (
        <span className="text-xs text-zinc-600 dark:text-zinc-400">
            {row.daysInPhase} / {sla} dias
        </span>
    );
}

function MissionTeamPanel({
    members,
    phases,
    teamUpdateUrlPattern,
}: {
    members: TeamMemberRow[];
    phases: PhaseRow[];
    teamUpdateUrlPattern: string;
}) {
    const [edits, setEdits] = useState(() =>
        members.map((m) => ({
            id: m.id,
            is_mission_team: m.is_mission_team,
            mission_phase_ids: [...m.mission_phase_ids],
        })),
    );

    useEffect(() => {
        setEdits(
            members.map((m) => ({
                id: m.id,
                is_mission_team: m.is_mission_team,
                mission_phase_ids: [...m.mission_phase_ids],
            })),
        );
    }, [members]);

    const saveMember = (memberId: number) => {
        const row = edits.find((e) => e.id === memberId);
        if (!row) return;
        router.patch(teamUpdateUrlFromPattern(teamUpdateUrlPattern, memberId), row, { preserveScroll: true });
    };

    if (members.length === 0) {
        return <p className="mt-4 text-sm text-zinc-500">Nenhum usuário com acesso à Missão nesta igreja.</p>;
    }

    return (
        <ul className="mt-4 space-y-4">
            {members.map((member) => {
                const edit = edits.find((e) => e.id === member.id);
                if (!edit) return null;

                return (
                    <li key={member.id} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                                <div className="font-medium text-zinc-900 dark:text-white">{member.name}</div>
                                <div className="text-xs text-zinc-500">{member.email ?? 'Sem e-mail'}</div>
                                {!member.has_mission_view && (
                                    <p className="mt-1 text-xs text-amber-600">Sem permissão «Ver Missão» — conceda antes de ativar a equipe.</p>
                                )}
                            </div>
                            <label className="flex items-center gap-2 text-sm">
                                <Checkbox
                                    checked={edit.is_mission_team}
                                    onChange={(e) =>
                                        setEdits((rows) =>
                                            rows.map((r) =>
                                                r.id === member.id ? { ...r, is_mission_team: e.target.checked } : r,
                                            ),
                                        )
                                    }
                                />
                                Usuário Missão
                            </label>
                        </div>
                        {edit.is_mission_team && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {phases.map((phase) => {
                                    const checked = edit.mission_phase_ids.includes(phase.id);

                                    return (
                                        <label
                                            key={phase.id}
                                            className={[
                                                'inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-xs ring-1',
                                                checked
                                                    ? 'bg-brand-50 ring-brand-300 dark:bg-brand-950/40 dark:ring-brand-700'
                                                    : 'ring-zinc-200 dark:ring-zinc-700',
                                            ].join(' ')}
                                        >
                                            <Checkbox
                                                checked={checked}
                                                onChange={() =>
                                                    setEdits((rows) =>
                                                        rows.map((r) => {
                                                            if (r.id !== member.id) return r;
                                                            const ids = r.mission_phase_ids.includes(phase.id)
                                                                ? r.mission_phase_ids.filter((id) => id !== phase.id)
                                                                : [...r.mission_phase_ids, phase.id];

                                                            return { ...r, mission_phase_ids: ids };
                                                        }),
                                                    )
                                                }
                                            />
                                            {phase.name}
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                        <div className="mt-3">
                            <SecondaryButton type="button" className="text-xs" onClick={() => saveMember(member.id)}>
                                Salvar
                            </SecondaryButton>
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}

function DetailPanel({
    detail,
    detailTab,
    setDetailTab,
    detailPhaseId,
    setDetailPhaseId,
    onSavePhase,
    onNoteSaved,
    onClose,
}: {
    detail: DetailJson;
    detailTab: DetailTab;
    setDetailTab: (tab: DetailTab) => void;
    detailPhaseId: string;
    setDetailPhaseId: (v: string) => void;
    onSavePhase: () => void;
    onNoteSaved: () => void;
    onClose: () => void;
}) {
    const v = detail.volunteer;
    const sections = missionVolunteerDetailSections(v);
    const noteForm = useForm({ body: '' });

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

    const submitNote: FormEventHandler = (e) => {
        e.preventDefault();
        noteForm.post(detail.storeNoteUrl, {
            preserveScroll: true,
            onSuccess: () => {
                noteForm.reset('body');
                onNoteSaved();
            },
        });
    };

    const contactSubtitle = [v.phone, v.email].filter((x) => x && String(x).trim() !== '').join(' · ') || null;

    const tabBtn = (tab: DetailTab, label: string) => (
        <button
            type="button"
            onClick={() => setDetailTab(tab)}
            className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition sm:flex-1 sm:text-sm ${
                detailTab === tab
                    ? 'bg-white text-zinc-900 shadow dark:bg-zinc-950 dark:text-white'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="shrink-0 space-y-4 border-b border-zinc-200 p-6 dark:border-zinc-700">
                <RecordDetailHeader
                    title={v.fullName}
                    subtitle={contactSubtitle}
                    photoUrl={v.photoUrl}
                    badge={v.phaseName?.trim() ? v.phaseName : null}
                    onClose={onClose}
                />

                <div className="flex gap-1 overflow-x-auto overscroll-x-contain rounded-xl bg-zinc-100 p-1 [-webkit-overflow-scrolling:touch] dark:bg-zinc-800">
                    {tabBtn('ficha', 'Ficha')}
                    {tabBtn('historico', 'Histórico de status')}
                    {tabBtn('notas', 'Anotações')}
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-6 pt-4">
                {detailTab === 'ficha' ? (
                    <div className="space-y-4">
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
                        {v.sla && (
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                {v.sla.phaseEnteredAtLabel ? (
                                    <>
                                        Chegou na fase em{' '}
                                        <span className="font-medium text-zinc-800 dark:text-zinc-200">{v.sla.phaseEnteredAtLabel}</span>
                                        {' · '}
                                    </>
                                ) : null}
                                {v.sla.isOverdue && v.sla.daysOverdue !== null ? (
                                    <span className="font-medium text-red-700 dark:text-red-300">
                                        Atrasado há {v.sla.daysOverdue} {v.sla.daysOverdue === 1 ? 'dia' : 'dias'} (SLA {v.sla.slaDays}{' '}
                                        dias)
                                    </span>
                                ) : (
                                    <>
                                        Na fase há {v.sla.daysInPhase} {v.sla.daysInPhase === 1 ? 'dia' : 'dias'}
                                        {v.sla.slaDays !== null ? ` · SLA ${v.sla.slaDays} dias` : ''}
                                    </>
                                )}
                            </p>
                        )}
                        {(detail.canEditPhase || detail.destroyUrl) && (
                            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200/90 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
                                {detail.canEditPhase && detail.updatePhaseUrl ? (
                                    <>
                                        <SelectInput
                                            value={detailPhaseId}
                                            onChange={(e) => setDetailPhaseId(e.target.value)}
                                            className="min-w-[10rem]"
                                        >
                                            {detail.stages.map((s) => (
                                                <option key={s.id} value={String(s.id)}>
                                                    {s.name} (SLA {s.sla_days}d)
                                                </option>
                                            ))}
                                        </SelectInput>
                                        <PrimaryButton type="button" onClick={onSavePhase}>
                                            Salvar fase
                                        </PrimaryButton>
                                    </>
                                ) : (
                                    <p className="text-xs text-zinc-500">
                                        Você pode visualizar esta ficha, mas só altera cadastros na sua fase.
                                    </p>
                                )}
                                {detail.destroyUrl ? (
                                    <SecondaryButton type="button" onClick={() => void destroyVolunteer()}>
                                        Excluir cadastro
                                    </SecondaryButton>
                                ) : null}
                            </div>
                        )}
                    </div>
                ) : detailTab === 'historico' ? (
                    <div className="space-y-3">
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Movimentações de fase no programa Missão (do cadastro até a fase atual).
                        </p>
                        <ul className="space-y-2 text-sm">
                            {detail.phaseHistory.length === 0 ? (
                                <li className="text-zinc-500">Nenhuma movimentação registrada.</li>
                            ) : (
                                detail.phaseHistory.map((h) => (
                                    <li
                                        key={h.id}
                                        className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                                    >
                                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                            {h.fromPhaseName ? `${h.fromPhaseName} → ${h.toPhaseName}` : `Cadastro · ${h.toPhaseName}`}
                                        </div>
                                        <div className="mt-0.5 text-xs text-zinc-500">
                                            {(h.changedBy ?? 'Sistema') + ' · ' + formatDateTime(h.changedAt)}
                                        </div>
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Notas internas da equipe Missão sobre este cadastro.</p>
                        <ul className="max-h-[min(45vh,320px)] space-y-2 overflow-y-auto text-sm">
                            {detail.notes.length === 0 ? (
                                <li className="text-zinc-500">Ainda sem anotações.</li>
                            ) : (
                                detail.notes.map((n) => (
                                    <li
                                        key={n.id}
                                        className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                                    >
                                        <div className="text-xs text-zinc-500">
                                            {n.authorName} · {formatDateTime(n.createdAt)}
                                        </div>
                                        <div className="whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">{n.body}</div>
                                    </li>
                                ))
                            )}
                        </ul>
                        {detail.canAddNote ? (
                            <form onSubmit={submitNote} className="space-y-2 border-t border-zinc-200 pt-4 dark:border-zinc-700">
                                <InputLabel value="Nova anotação" />
                                <Textarea
                                    value={noteForm.data.body}
                                    onChange={(e) => noteForm.setData('body', e.target.value)}
                                    rows={4}
                                    className="w-full"
                                    placeholder="Registre observações, contatos, combinados…"
                                />
                                <InputError message={noteForm.errors.body} />
                                <PrimaryButton type="submit" disabled={noteForm.processing}>
                                    Adicionar nota
                                </PrimaryButton>
                            </form>
                        ) : null}
                    </div>
                )}
            </div>
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
