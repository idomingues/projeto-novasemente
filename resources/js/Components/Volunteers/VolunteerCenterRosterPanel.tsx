import Modal from '@/Components/Modal';
import ListSortOptionPicker from '@/Components/ListSortOptionPicker';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import VolunteerRosterFiltersForm from '@/Components/Volunteers/VolunteerRosterFiltersForm';
import VolunteerRosterTable from '@/Components/Volunteers/VolunteerRosterTable';
import SortedMultiCheckboxList from '@/Components/SortedMultiCheckboxList';
import { centerVolunteersQuery, type CenterGroupBy, type CenterVinculo } from '@/utils/centerVolunteersQuery';
import { serverSearchTerm } from '@/utils/listSearch';
import { inertiaListModalSave } from '@/utils/inertiaListModalSave';
import {
    formatVolunteerResultsSummary,
    rosterSortOptions,
    rosterSortSelectValue,
    type VolunteerRosterBoardFilters,
    type VolunteerRosterListRow,
} from '@/utils/volunteerRosterList';
import { AdjustmentsHorizontalIcon, ArrowsUpDownIcon, Squares2X2Icon } from '@heroicons/react/24/outline';
import { Link, router, useForm } from '@inertiajs/react';
import { FormEventHandler, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

interface Paginated<T> {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    total?: number;
    from?: number | null;
    to?: number | null;
}

type Ministry = { id: number; name: string };

export type VolunteerCenterRosterListHeader = {
    title: string;
    subtitle: string;
    icon: ReactNode;
    actions?: ReactNode;
};

type Props = {
    groupBy: CenterGroupBy;
    selectedMinistryId: number | null;
    selectedPhaseKey: string | null;
    centerVinculo?: CenterVinculo;
    vinculadosCount?: number | null;
    encaminhadosCount?: number | null;
    onCenterVinculoChange?: (vinculo: CenterVinculo) => void;
    volunteers: Paginated<VolunteerRosterListRow>;
    boardFilters: VolunteerRosterBoardFilters;
    ministries: Ministry[];
    encaminharMinistryIds: number[] | null;
    canVolunteerManage: boolean;
    canPipelineMutate: boolean;
    onOpenVolunteer: (id: number) => void;
    listHeader: VolunteerCenterRosterListHeader;
};

const headerIconBtnClass =
    'relative inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800';

const headerIconBtnActiveClass =
    'border-emerald-500 bg-emerald-50 text-emerald-800 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-200';

const attendanceOptions = [
    { value: 'less_than_3_months', label: 'Menos de 3 meses' },
    { value: 'months_3_6', label: '3–6 meses' },
    { value: 'months_6_12', label: '6–12 meses' },
    { value: 'years_1_3', label: '1–3 anos' },
    { value: 'more_than_3_years', label: '+ 3 anos' },
];

export default function VolunteerCenterRosterPanel({
    groupBy,
    selectedMinistryId,
    selectedPhaseKey,
    centerVinculo = 'vinculados',
    vinculadosCount = null,
    encaminhadosCount = null,
    onCenterVinculoChange,
    volunteers,
    boardFilters,
    ministries,
    encaminharMinistryIds,
    canVolunteerManage,
    canPipelineMutate,
    onOpenVolunteer,
    listHeader,
}: Props) {
    const filterForm = useForm<VolunteerRosterBoardFilters>({ ...boardFilters });
    const filtersRef = useRef(boardFilters);
    filtersRef.current = boardFilters;
    const lastAppliedSearchRef = useRef(boardFilters.search ?? '');

    const [filtersModalOpen, setFiltersModalOpen] = useState(false);
    const [sortModalOpen, setSortModalOpen] = useState(false);
    const [invitingVolunteerId, setInvitingVolunteerId] = useState<number | null>(null);
    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteVolunteer, setInviteVolunteer] = useState<VolunteerRosterListRow | null>(null);
    const [inviteMinistryIds, setInviteMinistryIds] = useState<number[]>([]);

    const filtersKey = useMemo(() => JSON.stringify(boardFilters), [boardFilters]);
    useEffect(() => {
        filterForm.setData({ ...boardFilters });
        const serverSearch = boardFilters.search ?? '';
        if (serverSearch === lastAppliedSearchRef.current) {
            setSearchQuery(serverSearch);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filtersKey]);

    const buildQuery = useCallback(
        (nextFilters: VolunteerRosterBoardFilters, search: string) =>
            centerVolunteersQuery(
                groupBy,
                selectedMinistryId,
                selectedPhaseKey,
                nextFilters,
                search,
                centerVinculo,
            ),
        [groupBy, selectedMinistryId, selectedPhaseKey, centerVinculo],
    );

    const showVinculoTabs =
        groupBy === 'departamento' && selectedMinistryId != null && selectedMinistryId > 0 && onCenterVinculoChange != null;

    const vinculoTabClass = (active: boolean) =>
        `cursor-pointer rounded-md px-2.5 py-1 text-[10px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 ${
            active
                ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-inset ring-emerald-700/30 dark:bg-emerald-600 dark:text-white'
                : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'
        }`;

    const reload = useCallback(
        (nextFilters: VolunteerRosterBoardFilters, search: string) => {
            router.get(route('ministry-lead.volunteers.central'), buildQuery(nextFilters, search), {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        },
        [buildQuery],
    );

    const [searchQuery, setSearchQuery] = useState(boardFilters.search ?? '');

    const sortOptions = useMemo(() => rosterSortOptions(canVolunteerManage), [canVolunteerManage]);
    const resultsSummary = useMemo(() => formatVolunteerResultsSummary(volunteers), [volunteers]);
    const currentSortValue = rosterSortSelectValue(boardFilters.sort, boardFilters.sort_dir);
    const sortIsCustom = currentSortValue !== rosterSortSelectValue('name', 'asc');
    const currentSortLabel =
        sortOptions.find((o) => o.value === currentSortValue)?.label ?? 'Nome (A–Z)';

    const activeFiltersCount = useMemo(() => {
        const entries = Object.entries(boardFilters) as [string, unknown][];
        return entries.filter(([k, v]) => {
            if (k === 'pipeline_stage_id' || k === 'search' || k === 'arquivados' || k === 'sort' || k === 'sort_dir') {
                return false;
            }
            if (typeof v === 'boolean') {
                return v;
            }
            return v !== '' && v !== null && v !== undefined;
        }).length;
    }, [boardFilters]);

    const applyFilters: FormEventHandler = (e) => {
        e.preventDefault();
        const resolvedSearch = serverSearchTerm(searchQuery) ?? '';
        lastAppliedSearchRef.current = resolvedSearch;
        setFiltersModalOpen(false);
        reload(filterForm.data, resolvedSearch);
    };

    const clearFilters = () => {
        lastAppliedSearchRef.current = '';
        setSearchQuery('');
        setFiltersModalOpen(false);
        reload({ ...filterForm.data, search: '', pipeline_stage_id: '' }, '');
    };

    const selectSort = (combinedValue: string) => {
        const option = sortOptions.find((o) => o.value === combinedValue) ?? sortOptions[0];
        const resolvedSearch = serverSearchTerm(searchQuery) ?? '';
        lastAppliedSearchRef.current = resolvedSearch;
        setSortModalOpen(false);
        reload(
            {
                ...filterForm.data,
                sort: option.sort,
                sort_dir: option.sort_dir,
            },
            resolvedSearch,
        );
    };

    const encaminharMinistries = useMemo(() => {
        if (encaminharMinistryIds == null) {
            return ministries;
        }
        const allowed = new Set(encaminharMinistryIds);
        return ministries.filter((m) => allowed.has(m.id));
    }, [ministries, encaminharMinistryIds]);

    const inviteBlockedMinistryIds = useMemo(
        () => new Set(inviteVolunteer?.forwardedMinistryIds ?? []),
        [inviteVolunteer?.forwardedMinistryIds],
    );

    const encaminharOptions = useMemo(
        () =>
            encaminharMinistries.map((m) => ({
                id: m.id,
                name: m.name,
                disabled: inviteBlockedMinistryIds.has(m.id),
                trailing: inviteBlockedMinistryIds.has(m.id) ? 'Já encaminhado' : null,
            })),
        [encaminharMinistries, inviteBlockedMinistryIds],
    );

    const openEncaminhar = (v: VolunteerRosterListRow) => {
        setInviteVolunteer(v);
        const blocked = new Set(v.forwardedMinistryIds ?? []);
        setInviteMinistryIds([]);
        setInviteOpen(true);
    };

    const submitEncaminhar: FormEventHandler = (e) => {
        e.preventDefault();
        if (!inviteVolunteer || inviteMinistryIds.length === 0) return;
        router.post(
            route('ministry-lead.volunteers.ministry-invite.store', inviteVolunteer.id),
            { ministry_ids: inviteMinistryIds, channels: [] },
            {
                ...inertiaListModalSave,
                onSuccess: () => {
                    setInviteMinistryIds([]);
                },
            },
        );
    };

    return (
        <>
            <div className="shrink-0 border-b border-zinc-200 px-2.5 py-2 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                        {listHeader.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                        <h2 className="truncate text-sm font-semibold text-zinc-900 dark:text-white">{listHeader.title}</h2>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{listHeader.subtitle}</p>
                    </div>
                    {listHeader.actions ? <div className="flex shrink-0 items-center">{listHeader.actions}</div> : null}
                    <div className="flex shrink-0 items-center gap-1">
                        {groupBy === 'fase' ? (
                            <Link
                                href={route('ministry-lead.volunteers.index')}
                                className={headerIconBtnClass}
                                title="Ver Kanban"
                                aria-label="Ver Kanban"
                            >
                                <Squares2X2Icon className="h-4 w-4" aria-hidden />
                            </Link>
                        ) : null}
                        <button
                            type="button"
                            onClick={() => setFiltersModalOpen(true)}
                            title="Filtros do cadastro"
                            aria-label={
                                activeFiltersCount > 0
                                    ? `Filtros do cadastro (${activeFiltersCount} ativos)`
                                    : 'Filtros do cadastro'
                            }
                            className={`${headerIconBtnClass} ${activeFiltersCount > 0 ? headerIconBtnActiveClass : ''}`}
                        >
                            <AdjustmentsHorizontalIcon className="h-4 w-4" aria-hidden />
                            {activeFiltersCount > 0 ? (
                                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[9px] font-bold text-white">
                                    {activeFiltersCount}
                                </span>
                            ) : null}
                        </button>
                        <button
                            type="button"
                            onClick={() => setSortModalOpen(true)}
                            title={`Ordenação: ${currentSortLabel}`}
                            aria-label={`Ordenação: ${currentSortLabel}`}
                            className={`${headerIconBtnClass} ${sortIsCustom ? headerIconBtnActiveClass : ''}`}
                        >
                            <ArrowsUpDownIcon className="h-4 w-4" aria-hidden />
                        </button>
                    </div>
                </div>
            </div>

            {showVinculoTabs ? (
                <div
                    className="mt-2 flex shrink-0 gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 dark:border-zinc-700 dark:bg-zinc-800/60"
                    role="tablist"
                    aria-label="Tipo de vínculo com o departamento"
                >
                    <button
                        type="button"
                        role="tab"
                        aria-selected={centerVinculo === 'vinculados'}
                        onClick={() => onCenterVinculoChange?.('vinculados')}
                        className={vinculoTabClass(centerVinculo === 'vinculados')}
                    >
                        Vinculados{vinculadosCount != null ? ` (${vinculadosCount})` : ''}
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={centerVinculo === 'encaminhados'}
                        onClick={() => onCenterVinculoChange?.('encaminhados')}
                        className={vinculoTabClass(centerVinculo === 'encaminhados')}
                    >
                        Encaminhados{encaminhadosCount != null ? ` (${encaminhadosCount})` : ''}
                    </button>
                </div>
            ) : null}

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    const resolved = serverSearchTerm(searchQuery) ?? '';
                    lastAppliedSearchRef.current = resolved;
                    reload(filtersRef.current, resolved);
                }}
                className="relative mt-2"
            >
                <div className="flex gap-2">
                    <TextInput
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar voluntário por nome, e-mail ou telefone…"
                        className="!h-8 !min-h-8 !rounded-lg !px-2.5 !py-1 !text-sm"
                        autoComplete="off"
                    />
                    <SecondaryButton type="submit" className="!h-8 !px-3 !py-1 !text-xs">
                        Buscar
                    </SecondaryButton>
                    {serverSearchTerm(searchQuery) ? (
                        <SecondaryButton
                            type="button"
                            className="!h-8 !px-3 !py-1 !text-xs"
                            onClick={() => {
                                setSearchQuery('');
                                lastAppliedSearchRef.current = '';
                                reload(filtersRef.current, '');
                            }}
                        >
                            Limpar
                        </SecondaryButton>
                    ) : null}
                </div>
            </form>

            <div className="mt-1 min-h-0 flex-1 overflow-auto">
                <VolunteerRosterTable
                    volunteers={volunteers.data}
                    canVolunteerManage={canVolunteerManage}
                    canPipelineMutate={canPipelineMutate}
                    invitingVolunteerId={invitingVolunteerId}
                    onInvitingChange={setInvitingVolunteerId}
                    onOpenVolunteer={onOpenVolunteer}
                    onEncaminhar={openEncaminhar}
                    compact
                />
            </div>

            {volunteers.links.length > 1 ? (
                <nav className="mt-2 flex flex-wrap gap-1 border-t border-zinc-200 pt-2 dark:border-zinc-800">
                    {volunteers.links.map((link, i) =>
                        link.url ? (
                            <button
                                key={`${link.label}-${i}`}
                                type="button"
                                disabled={link.active}
                                onClick={() => router.get(link.url!, {}, { preserveScroll: true })}
                                className={`cursor-pointer rounded px-2 py-0.5 text-[10px] ${
                                    link.active
                                        ? 'bg-zinc-900 font-semibold text-white dark:bg-white dark:text-zinc-900'
                                        : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                                }`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ) : null,
                    )}
                </nav>
            ) : null}

            <Modal show={filtersModalOpen} onClose={() => setFiltersModalOpen(false)} maxWidth="2xl">
                <div className="max-h-[min(85dvh,720px)] overflow-y-auto p-4">
                    <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">Filtros do cadastro</h2>
                    <VolunteerRosterFiltersForm
                        filterForm={filterForm}
                        ministries={ministries}
                        attendanceOptions={attendanceOptions}
                        onSubmit={applyFilters}
                        onClear={clearFilters}
                    />
                </div>
            </Modal>

            <Modal show={sortModalOpen} onClose={() => setSortModalOpen(false)} maxWidth="md">
                <div className="px-5 pb-6 pt-14 sm:px-6 sm:pt-16">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Ordenação</h2>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Toque em uma opção para ordenar a lista.</p>
                    <ListSortOptionPicker
                        options={sortOptions}
                        value={currentSortValue}
                        onChange={selectSort}
                    />
                </div>
            </Modal>

            <Modal show={inviteOpen} onClose={() => setInviteOpen(false)} maxWidth="lg">
                <form onSubmit={submitEncaminhar} className="space-y-4 p-4">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Encaminhar voluntário</h2>
                    <p className="text-sm text-zinc-600 dark:text-zinc-300">
                        {inviteVolunteer?.name ?? 'Voluntário'} — escolha os departamentos.
                    </p>
                    <SortedMultiCheckboxList
                        options={encaminharOptions}
                        selectedIds={inviteMinistryIds}
                        onChange={setInviteMinistryIds}
                    />
                    <div className="flex justify-end gap-2">
                        <SecondaryButton type="button" onClick={() => setInviteOpen(false)}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton type="submit" disabled={inviteMinistryIds.length === 0}>
                            Encaminhar
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </>
    );
}
