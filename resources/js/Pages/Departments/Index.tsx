import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import {
    PlusIcon,
    PencilIcon,
    TrashIcon,
    ClipboardDocumentListIcon,
    Squares2X2Icon,
    ListBulletIcon,
    MagnifyingGlassIcon,
    EyeIcon,
    ChevronDownIcon,
    ChevronUpIcon,
} from '@heroicons/react/24/outline';
import AddButton from '@/Components/AddButton';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import Textarea from '@/Components/Textarea';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import SelectInput from '@/Components/SelectInput';
import PageHeader from '@/Components/PageHeader';
import InputError from '@/Components/InputError';
import { DEPARTMENT_ICON_OPTIONS, getMinistryIconByKey } from '@/lib/ministryIcons';
import { useState, useEffect, useMemo, useCallback, FormEventHandler } from 'react';
import type { MouseEvent } from 'react';
import ListSearchHint from '@/Components/ListSearchHint';
import { useDebouncedServerSearch } from '@/hooks/useDebouncedServerSearch';
import axios from 'axios';
import type { VolunteerDetailData } from '@/utils/volunteerDetailRows';
import { confirmAction } from '@/utils/confirmDialog';
import { inertiaListModalSave } from '@/utils/inertiaListModalSave';
import SortedMultiCheckboxList from '@/Components/SortedMultiCheckboxList';
import { textMatchesSearchFields } from '@/utils/searchText';
import RecordDetailHeader from '@/Components/RecordDetail/RecordDetailHeader';
import RecordDetailSections from '@/Components/RecordDetail/RecordDetailSections';
import VolunteerPasswordChangeForm from '@/Components/Volunteers/VolunteerPasswordChangeForm';
import VolunteerDeleteConfirmBlock from '@/Components/Volunteers/VolunteerDeleteConfirmBlock';
import MinistryLeaderStatusSection, { type MinistryLeaderStatusSectionData } from '@/Components/Volunteers/MinistryLeaderStatusSection';
import { volunteerDetailSections } from '@/utils/volunteerDetailRows';

interface PersonRef {
    id: number;
    name: string;
    /** ISO 8601 — quando foi vinculado ao departamento (pivot) */
    addedAt?: string | null;
}

function formatMemberAddedAt(iso: string | null | undefined): string | null {
    if (!iso) {
        return null;
    }
    try {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) {
            return null;
        }
        return d.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return null;
    }
}

interface PersonOption extends PersonRef {
    email?: string | null;
    volunteer_id?: number | null;
}

interface Department {
    id: number;
    name: string;
    icon: string | null;
    leaders: PersonRef[];
    volunteers: PersonRef[];
}

interface ScheduleRole {
    id: number;
    name: string;
}

interface Props {
    departments: Department[];
    scheduleRolesByDepartmentId: Record<number, ScheduleRole[]>;
    leaderOptions: PersonOption[];
    volunteerOptions: PersonOption[];
    canManageEscalasRoles: boolean;
    canManage: boolean;
    filters: { search?: string };
    volunteerDetailUrlPattern: string | null;
}

type DetailJson = {
    volunteer: VolunteerDetailData;
    pipeline?: { stageId: number | null; stageName: string | null; adminWorkflowStageId: number | null };
    stages: Array<{ id: number; name: string; sort_order: number }>;
    statusHistoryByMinistry?: MinistryLeaderStatusSectionData[];
    notes: Array<{ id: number; body: string; authorName: string; createdAt: string }>;
    ministryOptions?: Array<{ id: number; name: string; attached: boolean; canEdit: boolean }>;
    updateStageUrl: string;
    storeNoteUrl: string;
    syncMinistriesUrl: string | null;
    destroyVolunteerUrl: string | null;
    archiveVolunteerUrl: string | null;
    unarchiveVolunteerUrl: string | null;
    updatePasswordUrl: string | null;
};

function detailUrlFromPattern(pattern: string, id: number): string {
    return pattern.replace(/\/0(\/|$)/, `/${id}$1`);
}

function personAddedAtMap(people: PersonRef[]): Record<number, string> {
    const map: Record<number, string> = {};
    for (const p of people) {
        if (p.addedAt) {
            map[p.id] = p.addedAt;
        }
    }
    return map;
}

function PersonPicker({
    options,
    selectedIds,
    onChange,
    memberRole,
    onViewDetail,
    resolveDetailId,
    addedAtById = {},
    error,
}: {
    options: PersonOption[];
    selectedIds: number[];
    onChange: (ids: number[]) => void;
    /** Rótulo para confirmação ao desmarcar (ex.: líder, voluntário) */
    memberRole: 'líder' | 'voluntário';
    onViewDetail?: (id: number) => void;
    resolveDetailId?: (option: PersonOption) => number | null;
    /** Data/hora de inclusão por id (pivot ou seleção nesta sessão) */
    addedAtById?: Record<number, string>;
    error?: string;
}) {
    const [availableFilter, setAvailableFilter] = useState('');
    const [selectedFilter, setSelectedFilter] = useState('');
    const [sessionAddedAtById, setSessionAddedAtById] = useState<Record<number, string>>({});
    const detailIdFor = (option: PersonOption): number | null =>
        resolveDetailId ? resolveDetailId(option) : option.id;

    const canOpenDetail = (option: PersonOption): boolean =>
        onViewDetail != null && detailIdFor(option) != null;

    const mergedAddedAtById = useMemo(
        () => ({ ...addedAtById, ...sessionAddedAtById }),
        [addedAtById, sessionAddedAtById],
    );

    const selectedListOptions = useMemo(() => {
        const selectedSet = new Set(selectedIds);
        const q = selectedFilter.trim();
        return options
            .filter((o) => selectedSet.has(o.id))
            .filter((o) => !q || textMatchesSearchFields(q, o.name, o.email))
            .map((o) => {
                const addedLabel = formatMemberAddedAt(mergedAddedAtById[o.id]);
                return {
                    id: o.id,
                    name: o.name,
                    subline: o.email ?? null,
                    metaSubline: addedLabel,
                };
            });
    }, [options, selectedIds, selectedFilter, mergedAddedAtById]);

    const filteredOtherListOptions = useMemo(() => {
        const q = availableFilter.trim();
        const selectedSet = new Set(selectedIds);
        const base = options.filter((o) => !selectedSet.has(o.id));
        const filtered = q ? base.filter((o) => textMatchesSearchFields(q, o.name, o.email)) : base;
        return filtered.map((o) => ({
            id: o.id,
            name: o.name,
            subline: o.email ?? null,
        }));
    }, [options, availableFilter, selectedIds]);

    const optionById = useMemo(() => new Map(options.map((o) => [o.id, o])), [options]);

    const confirmMemberChange = useCallback(
        async (action: 'add' | 'remove', ids: number[]): Promise<boolean> => {
            if (ids.length === 0) {
                return true;
            }

            const plural = memberRole === 'líder' ? 'líderes' : 'voluntários';
            const isAdd = action === 'add';

            if (ids.length === 1) {
                const person = optionById.get(ids[0]);
                const name = person?.name?.trim() || 'esta pessoa';
                return confirmAction({
                    title: isAdd ? `Adicionar ${memberRole}?` : `Remover ${memberRole}?`,
                    text: isAdd
                        ? `Deseja adicionar ${name} como ${memberRole} deste departamento? A alteração só será aplicada ao salvar.`
                        : `Deseja remover ${name} como ${memberRole} deste departamento? A alteração só será aplicada ao salvar.`,
                    confirmButtonText: isAdd ? 'Adicionar' : 'Remover',
                    cancelButtonText: 'Cancelar',
                    danger: !isAdd,
                    icon: isAdd ? 'question' : 'warning',
                });
            }

            return confirmAction({
                title: isAdd ? `Adicionar ${plural}?` : `Remover ${plural}?`,
                text: `Deseja ${isAdd ? 'adicionar' : 'remover'} ${ids.length} pessoas como ${plural} deste departamento? A alteração só será aplicada ao salvar.`,
                confirmButtonText: isAdd ? 'Adicionar' : 'Remover',
                cancelButtonText: 'Cancelar',
                danger: !isAdd,
                icon: isAdd ? 'question' : 'warning',
            });
        },
        [memberRole, optionById],
    );

    const handleSelectionChange = useCallback(
        async (nextIds: number[]) => {
            const nextSet = new Set(nextIds);
            const removed = selectedIds.filter((id) => !nextSet.has(id));
            const added = nextIds.filter((id) => !selectedIds.includes(id));

            if (removed.length === 0 && added.length === 0) {
                onChange(nextIds);
                return;
            }

            if (removed.length > 0) {
                const okRemove = await confirmMemberChange('remove', removed);
                if (!okRemove) {
                    return;
                }
            }

            if (added.length > 0) {
                const okAdd = await confirmMemberChange('add', added);
                if (!okAdd) {
                    return;
                }
                const now = new Date().toISOString();
                setSessionAddedAtById((prev) => {
                    const next = { ...prev };
                    for (const id of added) {
                        if (!mergedAddedAtById[id]) {
                            next[id] = now;
                        }
                    }
                    return next;
                });
            }

            if (removed.length > 0) {
                setSessionAddedAtById((prev) => {
                    const next = { ...prev };
                    for (const id of removed) {
                        delete next[id];
                    }
                    return next;
                });
            }

            onChange(nextIds);
        },
        [confirmMemberChange, mergedAddedAtById, onChange, selectedIds],
    );

    const paneMaxHeight = 'max-h-[min(52vh,460px)]';

    const renderTrailingAction = (row: { id: number; name: string }) => {
        const o = optionById.get(row.id);
        if (o == null || !canOpenDetail(o)) {
            return null;
        }
        const openDetail = (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const detailId = detailIdFor(o);
            if (detailId != null) onViewDetail?.(detailId);
        };

        return (
            <button
                type="button"
                onClick={openDetail}
                className="mt-0.5 shrink-0 cursor-pointer rounded-lg p-1 text-zinc-500 hover:bg-white/80 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
                title="Ver ficha do voluntário"
                aria-label={`Ver ficha de ${o.name}`}
            >
                <EyeIcon className="h-4 w-4" aria-hidden />
            </button>
        );
    };

    return (
        <div className="mt-3">
            <div className="mx-auto grid min-h-0 w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex min-h-0 min-w-0 flex-col">
                    <p className="shrink-0 px-1 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                        Disponíveis
                        <span className="ml-1.5 font-normal text-zinc-500 dark:text-zinc-400">
                            ({filteredOtherListOptions.length})
                        </span>
                    </p>
                    <TextInput
                        value={availableFilter}
                        onChange={(e) => setAvailableFilter(e.target.value)}
                        className="mt-1.5 block w-full"
                        placeholder="Buscar disponíveis…"
                        aria-label="Buscar disponíveis por nome ou e-mail"
                    />
                    <SortedMultiCheckboxList
                        className="mt-1.5 min-h-0 flex-1"
                        options={filteredOtherListOptions}
                        selectedIds={selectedIds}
                        onChange={handleSelectionChange}
                        maxHeightClass={paneMaxHeight}
                        hideSectionLabels
                        emptyMessage={
                            availableFilter.trim()
                                ? 'Nenhum resultado para esta busca.'
                                : 'Todos já foram selecionados.'
                        }
                        showSelectedCount={false}
                        renderTrailingAction={renderTrailingAction}
                    />
                </div>

                <div className="flex min-h-0 min-w-0 flex-col sm:border-l sm:border-zinc-200 sm:pl-4 dark:sm:border-zinc-700">
                    <p className="shrink-0 px-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                        Selecionados
                        <span className="ml-1.5 font-normal text-zinc-500 dark:text-zinc-400">
                            ({selectedListOptions.length}
                            {selectedFilter.trim() && selectedListOptions.length !== selectedIds.length
                                ? ` de ${selectedIds.length}`
                                : ''}
                            )
                        </span>
                    </p>
                    <TextInput
                        value={selectedFilter}
                        onChange={(e) => setSelectedFilter(e.target.value)}
                        className="mt-1.5 block w-full"
                        placeholder="Buscar selecionados…"
                        aria-label="Buscar selecionados por nome ou e-mail"
                    />
                    <SortedMultiCheckboxList
                        className="mt-1.5 min-h-0 flex-1"
                        options={selectedListOptions}
                        selectedIds={selectedIds}
                        onChange={handleSelectionChange}
                        maxHeightClass={paneMaxHeight}
                        hideSectionLabels
                        emptyMessage={
                            selectedFilter.trim()
                                ? 'Nenhum selecionado corresponde a esta busca.'
                                : 'Nenhum selecionado.'
                        }
                        showSelectedCount={false}
                        renderTrailingAction={renderTrailingAction}
                    />
                </div>
            </div>
            {error ? <InputError message={error} className="mt-1" /> : null}
        </div>
    );
}

function namesPreview(people: PersonRef[], max = 2): string {
    if (people.length === 0) return '—';
    const shown = people
        .slice(0, max)
        .map((p) => p.name)
        .join(', ');
    if (people.length > max) {
        return `${shown} +${people.length - max}`;
    }
    return shown;
}

export default function Index({
    departments,
    scheduleRolesByDepartmentId,
    leaderOptions,
    volunteerOptions,
    canManageEscalasRoles,
    canManage,
    filters,
    volunteerDetailUrlPattern,
}: Props) {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [leaderAddedAtById, setLeaderAddedAtById] = useState<Record<number, string>>({});
    const [volunteerAddedAtById, setVolunteerAddedAtById] = useState<Record<number, string>>({});
    const {
        value: search,
        setValue: setSearch,
        isBelowMinimum: searchBelowMinimum,
    } = useDebouncedServerSearch({
        serverValue: filters.search ?? '',
        onApply: useCallback(
            (term) => {
                router.get(route('departments.index'), { search: term }, { preserveState: true, replace: true });
            },
            [],
        ),
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [rosterTab, setRosterTab] = useState<'leaders' | 'volunteers'>('leaders');
    const [iconPickerOpen, setIconPickerOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailTab, setDetailTab] = useState<'ficha' | 'notas' | 'departamentos' | 'historico'>('ficha');
    const [detailPayload, setDetailPayload] = useState<DetailJson | null>(null);
    const [selectedVolunteerId, setSelectedVolunteerId] = useState<number | null>(null);
    const page = usePage();
    const csrf = (page.props as { csrf_token?: string }).csrf_token ?? '';

    const noteForm = useForm({ body: '' });
    const stageMoveForm = useForm({ stage_id: '' as string | number });
    const ministriesForm = useForm<{ ministry_ids: number[] }>({ ministry_ids: [] });

    const [rolesModalDepartmentId, setRolesModalDepartmentId] = useState<number | null>(null);
    const [rolesModalNewRoleName, setRolesModalNewRoleName] = useState('');

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: '',
        icon: '' as string | null,
        leader_user_ids: [] as number[],
        volunteer_ids: [] as number[],
    });

    const openVolunteerDetail = useCallback(
        async (id: number) => {
            setSelectedVolunteerId(id);
            setDetailOpen(true);
            setDetailLoading(true);
            setDetailTab('ficha');
            setDetailPayload(null);
            noteForm.reset('body');
            try {
                const url = route('ministry-lead.volunteers.pipeline.detail', id);
                const r = await fetch(url, {
                    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': csrf },
                    credentials: 'same-origin',
                });
                const j = (await r.json()) as DetailJson;
                setDetailPayload(j);
                const explicitSid = j.pipeline?.adminWorkflowStageId;
                const pipelineSid =
                    j.pipeline?.stageId != null && j.stages?.some((s) => s.id === j.pipeline?.stageId)
                        ? j.pipeline.stageId
                        : null;
                const sid = explicitSid ?? pipelineSid;
                stageMoveForm.setData('stage_id', sid != null ? String(sid) : '');
                const attachedIds = (j.ministryOptions ?? []).filter((o) => o.attached).map((o) => o.id);
                ministriesForm.setData('ministry_ids', attachedIds);
            } catch {
                setDetailPayload(null);
            } finally {
                setDetailLoading(false);
            }
        },
        [csrf],
    );

    const closeVolunteerDetail = useCallback(() => {
        setDetailOpen(false);
        setDetailPayload(null);
        setSelectedVolunteerId(null);
    }, []);

    const submitNote: FormEventHandler = (e) => {
        e.preventDefault();
        if (!detailPayload) return;
        noteForm.post(detailPayload.storeNoteUrl, {
            preserveScroll: true,
            onSuccess: () => {
                noteForm.reset('body');
                if (selectedVolunteerId) void openVolunteerDetail(selectedVolunteerId);
                setDetailTab('notas');
            },
        });
    };

    const submitStageMove: FormEventHandler = (e) => {
        e.preventDefault();
        if (!detailPayload) return;
        stageMoveForm.patch(detailPayload.updateStageUrl, {
            preserveScroll: true,
            onSuccess: () => {
                if (selectedVolunteerId) void openVolunteerDetail(selectedVolunteerId);
            },
        });
    };

    const submitMinistries: FormEventHandler = (e) => {
        e.preventDefault();
        if (!detailPayload?.syncMinistriesUrl) return;
        ministriesForm.patch(detailPayload.syncMinistriesUrl, {
            preserveScroll: true,
            onSuccess: () => {
                if (selectedVolunteerId) void openVolunteerDetail(selectedVolunteerId);
                setDetailTab('departamentos');
            },
        });
    };

    const volunteerMinistryCheckboxOptions = useMemo(
        () =>
            (detailPayload?.ministryOptions ?? []).map((o) => ({
                id: o.id,
                name: o.name,
                disabled: !o.canEdit,
                trailing: !o.canEdit && ministriesForm.data.ministry_ids.includes(o.id) ? 'Só consulta' : null,
            })),
        [detailPayload?.ministryOptions, ministriesForm.data.ministry_ids],
    );

    const volunteerDetailBadge = (v: VolunteerDetailData): string | null => {
        const parts: string[] = [];
        if (v.active === false) {
            parts.push('Escalas: inativo');
        } else if (v.active === true) {
            parts.push('Escalas: ativo');
        }
        if (v.has_app_account) {
            parts.push(v.user?.status === 'inactive' ? 'Conta: inativa' : 'Conta: ativa');
        }
        return parts.length > 0 ? parts.join(' · ') : null;
    };

    const formatDateTime = (iso: string): string => {
        try {
            return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        } catch {
            return iso;
        }
    };

    const rosterTabBtn = (active: boolean) =>
        `flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
            active
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
        }`;

    const selectedIconOption = useMemo(
        () => DEPARTMENT_ICON_OPTIONS.find((o) => o.key === data.icon),
        [data.icon],
    );
    const SelectedIconPreview = selectedIconOption?.Icon;

    const openCreateModal = () => {
        setIsEditing(false);
        setEditingId(null);
        setRosterTab('leaders');
        setIconPickerOpen(false);
        setLeaderAddedAtById({});
        setVolunteerAddedAtById({});
        reset();
        clearErrors();
        setIsModalOpen(true);
    };

    const openEditModal = (d: Department) => {
        setIsEditing(true);
        setEditingId(d.id);
        setRosterTab('leaders');
        setIconPickerOpen(false);
        setLeaderAddedAtById(personAddedAtMap(d.leaders));
        setVolunteerAddedAtById(personAddedAtMap(d.volunteers));
        setData({
            name: d.name,
            icon: d.icon ?? '',
            leader_user_ids: d.leaders.map((l) => l.id),
            volunteer_ids: d.volunteers.map((v) => v.id),
        });
        clearErrors();
        setIsModalOpen(true);
    };

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        const modal = params.get('modal');
        const idParam = params.get('id');
        if (modal !== 'edit' || !idParam) return;
        const id = Number(idParam);
        if (Number.isNaN(id) || id <= 0) return;
        const dept = departments.find((d) => d.id === id);
        if (!dept) return;

        setIsEditing(true);
        setEditingId(dept.id);
        setRosterTab('leaders');
        setIconPickerOpen(false);
        setLeaderAddedAtById(personAddedAtMap(dept.leaders));
        setVolunteerAddedAtById(personAddedAtMap(dept.volunteers));
        setData({
            name: dept.name,
            icon: dept.icon ?? '',
            leader_user_ids: dept.leaders.map((l) => l.id),
            volunteer_ids: dept.volunteers.map((v) => v.id),
        });
        clearErrors();
        setIsModalOpen(true);

        params.delete('modal');
        params.delete('id');
        const q = params.toString();
        window.history.replaceState({}, '', `${window.location.pathname}${q ? `?${q}` : ''}`);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [departments]);

    const closeModal = () => {
        setIsModalOpen(false);
        setIconPickerOpen(false);
        reset();
    };

    useEffect(() => {
        if (errors.icon) {
            setIconPickerOpen(true);
        }
    }, [errors.icon]);

    const openRolesModal = (departmentId: number) => {
        setRolesModalDepartmentId(departmentId);
        setRolesModalNewRoleName('');
    };

    const closeRolesModal = () => {
        setRolesModalDepartmentId(null);
        setRolesModalNewRoleName('');
    };

    const submitDepartment = () => {
        if (isEditing && editingId) {
            put(route('departments.update', editingId), {
                ...inertiaListModalSave,
                onSuccess: () => clearErrors(),
            });
        } else {
            post(route('departments.store'), {
                ...inertiaListModalSave,
            });
        }
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        submitDepartment();
    };

    const handleDelete = async (id: number) => {
        const ok = await confirmAction({
            title: 'Excluir departamento?',
            text: 'Esta ação não pode ser desfeita.',
            confirmButtonText: 'Excluir',
            danger: true,
            icon: 'warning',
        });
        if (ok) {
            router.delete(route('departments.destroy', id));
        }
    };

    const renderActions = (d: Department) => (
        <div className="flex shrink-0 justify-end gap-1">
            {canManage && (
                <button
                    type="button"
                    onClick={() => handleDelete(d.id)}
                    className="p-2 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    title="Excluir"
                    aria-label="Excluir departamento"
                >
                    <TrashIcon className="w-5 h-5" />
                </button>
            )}
            {canManage && (
                <button
                    type="button"
                    onClick={() => openEditModal(d)}
                    className="p-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    title="Editar"
                    aria-label="Editar departamento"
                >
                    <PencilIcon className="w-5 h-5" />
                </button>
            )}
            {canManageEscalasRoles && (
                <button
                    type="button"
                    onClick={() => openRolesModal(d.id)}
                    className="p-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    title="Gerir funções"
                    aria-label="Gerir funções"
                >
                    <ClipboardDocumentListIcon className="w-5 h-5" />
                </button>
            )}
        </div>
    );

    const renderDepartmentCard = (d: Department) => {
        const IconComponent = getMinistryIconByKey(d.icon);
        const deptRoles = scheduleRolesByDepartmentId[d.id] ?? [];

        return (
            <div
                key={d.id}
                className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col min-h-[280px] overflow-hidden"
            >
                <div className="shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
                            <IconComponent className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
                        </div>
                        <h3
                            className="text-sm font-semibold leading-snug text-zinc-900 dark:text-white line-clamp-2 min-w-0 flex-1"
                            title={d.name}
                        >
                            {d.name}
                        </h3>
                    </div>
                </div>

                <div className="mt-3 space-y-3 flex-1 min-h-0 text-xs text-zinc-600 dark:text-zinc-400">
                    <div>
                        <p className="font-semibold text-zinc-700 dark:text-zinc-300">Líderes</p>
                        <p className="mt-0.5 line-clamp-2">{namesPreview(d.leaders)}</p>
                    </div>
                    <div>
                        <p className="font-semibold text-zinc-700 dark:text-zinc-300">Voluntários</p>
                        <p className="mt-0.5">
                            {d.volunteers.length === 0 ? '—' : `${d.volunteers.length} vinculado(s)`}
                        </p>
                    </div>
                    <div className="flex flex-col flex-1 min-h-0 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                        <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 tracking-wide shrink-0">
                            Funções na escala
                        </p>
                        <div className="mt-1.5 flex-1 min-h-0 max-h-24 overflow-y-auto rounded-lg border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-800/30 px-2 py-1.5">
                            {deptRoles.length === 0 ? (
                                <span className="text-xs">Nenhuma função</span>
                            ) : (
                                <div className="flex flex-wrap gap-1.5 content-start">
                                    {deptRoles.map((r) => (
                                        <span
                                            key={r.id}
                                            className="text-xs px-2 py-0.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                                        >
                                            {r.name}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="shrink-0 mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    {renderActions(d)}
                </div>
            </div>
        );
    };

    const renderDepartmentListRow = (d: Department) => {
        const IconComponent = getMinistryIconByKey(d.icon);
        const deptRoles = scheduleRolesByDepartmentId[d.id] ?? [];

        return (
            <div
                key={d.id}
                className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:flex-row sm:items-center sm:gap-4"
            >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                        <IconComponent className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate" title={d.name}>
                            {d.name}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            {deptRoles.length} função(ões) · {d.leaders.length} líder(es) · {d.volunteers.length}{' '}
                            voluntário(s)
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 truncate">
                            Líderes: {namesPreview(d.leaders, 3)}
                        </p>
                    </div>
                </div>
                {renderActions(d)}
            </div>
        );
    };

    return (
        <AdminLayout>
            <Head title="Departamentos" />
            <PageHeader
                title="Departamentos"
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex rounded-xl border border-zinc-200 bg-white p-0.5 dark:border-zinc-700 dark:bg-zinc-900">
                            <button
                                type="button"
                                onClick={() => setViewMode('grid')}
                                className={`rounded-lg p-2 ${viewMode === 'grid' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'text-zinc-500'}`}
                                title="Grade"
                                aria-label="Vista em grade"
                            >
                                <Squares2X2Icon className="h-5 w-5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('list')}
                                className={`rounded-lg p-2 ${viewMode === 'list' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'text-zinc-500'}`}
                                title="Lista"
                                aria-label="Vista em lista"
                            >
                                <ListBulletIcon className="h-5 w-5" />
                            </button>
                        </div>
                        {canManage ? (
                            <AddButton variant="icon" onClick={openCreateModal} title="Novo departamento">
                                Novo Departamento
                            </AddButton>
                        ) : null}
                    </div>
                }
            >
                <div className="relative w-full max-w-md">
                    <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
                    <TextInput
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10"
                        placeholder="Buscar departamento…"
                    />
                    <ListSearchHint show={searchBelowMinimum} className="mt-1 pl-10" />
                </div>
            </PageHeader>

            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {departments.map((d) => renderDepartmentCard(d))}
                    {canManage && (
                        <button
                            type="button"
                            onClick={openCreateModal}
                            className="rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800/50 p-6 flex flex-col items-center justify-center gap-2 text-zinc-500 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors min-h-[120px]"
                        >
                            <PlusIcon className="w-8 h-8" />
                            <span className="font-medium text-sm">Novo Departamento</span>
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {departments.map((d) => renderDepartmentListRow(d))}
                </div>
            )}

            {departments.length === 0 && (
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-12 text-center text-zinc-500 dark:text-zinc-400">
                    {search.trim()
                        ? 'Nenhum departamento encontrado para esta busca.'
                        : 'Nenhum departamento cadastrado. Clique em "Novo Departamento" para começar.'}
                </div>
            )}

            <Modal show={isModalOpen} onClose={closeModal} maxWidth={isEditing ? '4xl' : undefined}>
                <form onSubmit={submit} className="max-h-[min(92dvh,920px)] overflow-y-auto p-6">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-6">
                        {isEditing ? 'Editar departamento' : 'Novo departamento'}
                    </h2>
                    <div>
                        <InputLabel htmlFor="name" value="Nome" />
                        <TextInput
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            className="mt-1 block w-full"
                            placeholder="Ex: Louvor, Portaria"
                        />
                        <InputError message={errors.name} className="mt-1" />
                    </div>
                    <div className="mt-4">
                        <InputLabel value="Ícone" />
                        <button
                            type="button"
                            onClick={() => setIconPickerOpen((open) => !open)}
                            aria-expanded={iconPickerOpen}
                            className="mt-2 flex w-full cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2.5 text-left transition-colors hover:border-zinc-300 hover:bg-zinc-100/80 dark:border-zinc-700 dark:bg-zinc-800/40 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/70"
                        >
                            {selectedIconOption ? (
                                <>
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white dark:border-zinc-600 dark:bg-zinc-900">
                                        {SelectedIconPreview ? (
                                            <SelectedIconPreview
                                                className="h-6 w-6 text-indigo-600 dark:text-indigo-400"
                                                aria-hidden
                                            />
                                        ) : null}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-semibold text-zinc-900 dark:text-white">
                                            {selectedIconOption.label}
                                        </span>
                                        <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                                            {iconPickerOpen ? 'Toque para fechar' : 'Toque para alterar o ícone'}
                                        </span>
                                    </span>
                                </>
                            ) : (
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-semibold text-zinc-900 dark:text-white">
                                        Escolher ícone
                                    </span>
                                    <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                                        {iconPickerOpen ? 'Toque para fechar' : 'Opcional — toque para ver as opções'}
                                    </span>
                                </span>
                            )}
                            {iconPickerOpen ? (
                                <ChevronUpIcon className="h-5 w-5 shrink-0 text-zinc-500" aria-hidden />
                            ) : (
                                <ChevronDownIcon className="h-5 w-5 shrink-0 text-zinc-500" aria-hidden />
                            )}
                        </button>
                        {iconPickerOpen ? (
                            <div className="mt-2 grid grid-cols-4 gap-1.5 sm:grid-cols-6 sm:gap-2">
                                {DEPARTMENT_ICON_OPTIONS.map(({ key, label, Icon }) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => {
                                            const next = data.icon === key ? '' : key;
                                            setData('icon', next);
                                            if (next) {
                                                setIconPickerOpen(false);
                                            }
                                        }}
                                        className={`flex min-h-[4.75rem] cursor-pointer flex-col items-center justify-center rounded-lg border px-1.5 py-2 transition-colors sm:min-h-[5.25rem] ${
                                            data.icon === key
                                                ? 'border-indigo-500 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                                                : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600'
                                        }`}
                                        title={label}
                                    >
                                        <Icon className="h-6 w-6 shrink-0" aria-hidden />
                                        <span className="mt-1 line-clamp-2 w-full break-words px-0.5 text-center text-xs font-bold leading-snug sm:text-sm">
                                            {label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        ) : null}
                        <InputError message={errors.icon} className="mt-1" />
                    </div>

                    {isEditing && canManage ? (
                        <div className="mt-6 border-t border-zinc-200 pt-5 dark:border-zinc-700">
                            <p className="text-sm font-semibold text-zinc-900 dark:text-white">Equipe do departamento</p>
                            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                                Associe líderes e voluntários em separado (opcional).
                            </p>
                            <div className="mt-3 inline-flex w-full rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800/80">
                                <button
                                    type="button"
                                    className={rosterTabBtn(rosterTab === 'leaders')}
                                    onClick={() => setRosterTab('leaders')}
                                >
                                    Líderes
                                    {data.leader_user_ids.length > 0 ? (
                                        <span className="ml-1.5 text-xs font-normal text-zinc-500 dark:text-zinc-400">
                                            ({data.leader_user_ids.length})
                                        </span>
                                    ) : null}
                                </button>
                                <button
                                    type="button"
                                    className={rosterTabBtn(rosterTab === 'volunteers')}
                                    onClick={() => setRosterTab('volunteers')}
                                >
                                    Voluntários
                                    {data.volunteer_ids.length > 0 ? (
                                        <span className="ml-1.5 text-xs font-normal text-zinc-500 dark:text-zinc-400">
                                            ({data.volunteer_ids.length})
                                        </span>
                                    ) : null}
                                </button>
                            </div>
                            {rosterTab === 'leaders' ? (
                                <PersonPicker
                                    key={`leaders-${editingId ?? 'new'}`}
                                    memberRole="líder"
                                    options={leaderOptions}
                                    selectedIds={data.leader_user_ids}
                                    onChange={(ids) => setData('leader_user_ids', ids)}
                                    addedAtById={leaderAddedAtById}
                                    onViewDetail={volunteerDetailUrlPattern ? openVolunteerDetail : undefined}
                                    resolveDetailId={(o) => o.volunteer_id ?? null}
                                    error={errors.leader_user_ids}
                                />
                            ) : (
                                <PersonPicker
                                    key={`volunteers-${editingId ?? 'new'}`}
                                    memberRole="voluntário"
                                    options={volunteerOptions}
                                    selectedIds={data.volunteer_ids}
                                    onChange={(ids) => setData('volunteer_ids', ids)}
                                    addedAtById={volunteerAddedAtById}
                                    onViewDetail={volunteerDetailUrlPattern ? openVolunteerDetail : undefined}
                                    error={errors.volunteer_ids}
                                />
                            )}
                        </div>
                    ) : null}

                    <div className="mt-6 flex justify-end gap-2">
                        <SecondaryButton type="button" onClick={closeModal}>
                            Cancelar
                        </SecondaryButton>
                        {canManage ? (
                            <PrimaryButton type="button" onClick={submitDepartment} disabled={processing}>
                                {isEditing ? 'Salvar' : 'Criar'}
                            </PrimaryButton>
                        ) : null}
                    </div>
                </form>
            </Modal>

            <Modal show={rolesModalDepartmentId !== null} onClose={closeRolesModal}>
                {rolesModalDepartmentId !== null && (
                    <div className="p-6">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                            Funções na escala —{' '}
                            {departments.find((d) => d.id === rolesModalDepartmentId)?.name ?? 'Departamento'}
                        </h2>

                        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
                            {((scheduleRolesByDepartmentId[rolesModalDepartmentId] ?? []) as ScheduleRole[]).length ===
                            0 ? (
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                    Nenhuma função cadastrada para este departamento.
                                </p>
                            ) : (
                                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                    {(scheduleRolesByDepartmentId[rolesModalDepartmentId] ?? []).map((r) => (
                                        <li
                                            key={r.id}
                                            className="flex items-center justify-between gap-2 py-2 text-sm text-zinc-800 dark:text-zinc-200"
                                        >
                                            <span className="truncate">{r.name}</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    void (async () => {
                                                        const ok = await confirmAction({
                                                            title: 'Remover função?',
                                                            text: 'Esta função deixará de estar disponível para escalas deste departamento.',
                                                            confirmButtonText: 'Remover',
                                                            danger: true,
                                                            icon: 'warning',
                                                        });
                                                        if (ok) {
                                                            router.delete(route('escalas.roles.destroy', r.id), {
                                                                preserveScroll: true,
                                                                preserveState: true,
                                                            });
                                                        }
                                                    })();
                                                }}
                                                className="p-1.5 shrink-0 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                                title="Remover"
                                                aria-label="Remover função"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                const name = rolesModalNewRoleName.trim();
                                if (!name) return;
                                router.post(
                                    route('escalas.roles.store'),
                                    { ministry_id: rolesModalDepartmentId, name },
                                    {
                                        preserveScroll: true,
                                        preserveState: true,
                                        onSuccess: () => {
                                            setRolesModalNewRoleName('');
                                        },
                                    },
                                );
                            }}
                            className="mt-4 flex flex-col sm:flex-row sm:items-end gap-3"
                        >
                            <div className="flex-1 min-w-0">
                                <InputLabel value="Nova função" />
                                <TextInput
                                    value={rolesModalNewRoleName}
                                    onChange={(e) => setRolesModalNewRoleName(e.target.value)}
                                    className="mt-1 block w-full"
                                    placeholder="Ex.: Projeção, Recepção..."
                                />
                            </div>
                            <PrimaryButton type="submit" className="shrink-0">
                                Adicionar
                            </PrimaryButton>
                        </form>

                        <div className="mt-6 flex justify-end">
                            <SecondaryButton type="button" onClick={closeRolesModal}>
                                Fechar
                            </SecondaryButton>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal show={detailOpen} onClose={closeVolunteerDetail} maxWidth="2xl" disableBodyScroll>
                <div className="flex max-h-[min(100dvh-1rem,880px)] min-h-0 w-full flex-col overflow-hidden sm:max-h-[min(90dvh,860px)]">
                    {detailLoading ? (
                        <div className="p-6">
                            <p className="text-sm text-zinc-500">Carregando…</p>
                        </div>
                    ) : detailPayload?.volunteer ? (
                        <>
                            <div className="shrink-0 space-y-4 border-b border-zinc-200 p-4 dark:border-zinc-700">
                                <RecordDetailHeader
                                    title={
                                        (detailPayload.volunteer.name as string | null)?.trim() ||
                                        (detailPayload.volunteer as VolunteerDetailData).user?.name?.trim() ||
                                        'Voluntário'
                                    }
                                    subtitle="Voluntário e conta no app (mesma pessoa)."
                                    photoUrl={
                                        (detailPayload.volunteer as VolunteerDetailData).photo_url ??
                                        (detailPayload.volunteer.user as { photo_url?: string | null } | null)?.photo_url ??
                                        null
                                    }
                                    badge={volunteerDetailBadge(detailPayload.volunteer)}
                                    onClose={closeVolunteerDetail}
                                />

                                <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-900/40">
                                    {canManage ? (
                                        <form
                                            onSubmit={submitStageMove}
                                            className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
                                        >
                                            <div className="min-w-0 flex-1 sm:max-w-xs">
                                                <InputLabel value="Fase principal" />
                                                <SelectInput
                                                    className="mt-1 w-full min-w-0"
                                                    value={stageMoveForm.data.stage_id}
                                                    onChange={(e) => stageMoveForm.setData('stage_id', e.target.value)}
                                                >
                                                    <option value="">—</option>
                                                    {(detailPayload.stages ?? []).map((s) => (
                                                        <option key={s.id} value={String(s.id)}>
                                                            {s.name}
                                                        </option>
                                                    ))}
                                                </SelectInput>
                                            </div>
                                            <PrimaryButton type="submit" disabled={stageMoveForm.processing}>
                                                Salvar fase principal
                                            </PrimaryButton>
                                            <InputError message={stageMoveForm.errors.stage_id} />
                                        </form>
                                    ) : null}
                                </div>

                                <div className="flex gap-1 overflow-x-auto overscroll-x-contain rounded-xl bg-zinc-100 p-1 [-webkit-overflow-scrolling:touch] dark:bg-zinc-800">
                                    <button
                                        type="button"
                                        onClick={() => setDetailTab('ficha')}
                                        className={`shrink-0 cursor-pointer rounded-lg px-3 py-2 text-xs font-medium transition sm:flex-1 sm:px-3 sm:text-sm ${
                                            detailTab === 'ficha'
                                                ? 'bg-white text-zinc-900 shadow dark:bg-zinc-950 dark:text-white'
                                                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                                        }`}
                                    >
                                        Ficha
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDetailTab('departamentos')}
                                        className={`shrink-0 cursor-pointer rounded-lg px-3 py-2 text-xs font-medium transition sm:flex-1 sm:px-3 sm:text-sm ${
                                            detailTab === 'departamentos'
                                                ? 'bg-white text-zinc-900 shadow dark:bg-zinc-950 dark:text-white'
                                                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                                        }`}
                                    >
                                        Departamentos
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDetailTab('historico')}
                                        className={`shrink-0 cursor-pointer rounded-lg px-3 py-2 text-xs font-medium transition sm:flex-1 sm:px-3 sm:text-sm ${
                                            detailTab === 'historico'
                                                ? 'bg-white text-zinc-900 shadow dark:bg-zinc-950 dark:text-white'
                                                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                                        }`}
                                    >
                                        Histórico e status
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDetailTab('notas')}
                                        className={`shrink-0 cursor-pointer rounded-lg px-3 py-2 text-xs font-medium transition sm:flex-1 sm:px-3 sm:text-sm ${
                                            detailTab === 'notas'
                                                ? 'bg-white text-zinc-900 shadow dark:bg-zinc-950 dark:text-white'
                                                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                                        }`}
                                    >
                                        Anotações
                                    </button>
                                </div>
                            </div>

                            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4">
                                {detailTab === 'ficha' ? (
                                    <div className="space-y-4">
                                        <RecordDetailSections
                                            sections={volunteerDetailSections(detailPayload.volunteer as VolunteerDetailData)}
                                        />

                                        {detailPayload.updatePasswordUrl ? (
                                            <VolunteerPasswordChangeForm
                                                key={(detailPayload.volunteer as VolunteerDetailData).id}
                                                submitUrl={detailPayload.updatePasswordUrl}
                                            />
                                        ) : null}

                                        {detailPayload.destroyVolunteerUrl ? (
                                            <VolunteerDeleteConfirmBlock
                                                className="mt-6"
                                                destroyUrl={detailPayload.destroyVolunteerUrl}
                                                volunteerName={detailPayload.volunteer.name ?? 'Voluntário'}
                                                volunteerEmail={(detailPayload.volunteer as VolunteerDetailData).email}
                                                linkedUser={detailPayload.volunteer.user as { id?: number; email?: string | null } | null}
                                                onSuccess={() => closeVolunteerDetail()}
                                            />
                                        ) : null}
                                    </div>
                                ) : detailTab === 'historico' ? (
                                    <div className="space-y-4">
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                            Altere o status do líder em cada departamento e consulte o histórico.
                                        </p>
                                        {(detailPayload.statusHistoryByMinistry ?? []).length === 0 ? (
                                            <p className="text-sm text-zinc-500">
                                                Nenhum departamento vinculado ou encaminhamento registrado ainda.
                                            </p>
                                        ) : (
                                            (detailPayload.statusHistoryByMinistry ?? []).map((section) => (
                                                <MinistryLeaderStatusSection
                                                    key={section.ministryId}
                                                    section={section}
                                                    onSaved={() => {
                                                        if (selectedVolunteerId) void openVolunteerDetail(selectedVolunteerId);
                                                        setDetailTab('historico');
                                                    }}
                                                />
                                            ))
                                        )}
                                    </div>
                                ) : detailTab === 'departamentos' ? (
                                    <form onSubmit={submitMinistries} className="space-y-4">
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                            Marque os departamentos em que o voluntário está.
                                        </p>
                                        {(detailPayload.ministryOptions ?? []).length === 0 ? (
                                            <p className="text-sm text-zinc-500">Nenhum departamento cadastrado nesta igreja.</p>
                                        ) : (
                                            <SortedMultiCheckboxList
                                                options={volunteerMinistryCheckboxOptions}
                                                selectedIds={ministriesForm.data.ministry_ids}
                                                onChange={(ids) => ministriesForm.setData('ministry_ids', ids)}
                                                maxHeightClass="max-h-[min(50vh,360px)]"
                                                emptyMessage="Nenhum departamento cadastrado nesta igreja."
                                            />
                                        )}
                                        <InputError message={ministriesForm.errors.ministry_ids} />
                                        {detailPayload.syncMinistriesUrl && canManage ? (
                                            <PrimaryButton type="submit" disabled={ministriesForm.processing}>
                                                Salvar departamentos
                                            </PrimaryButton>
                                        ) : null}
                                    </form>
                                ) : (
                                    <div className="space-y-4">
                                        <ul className="max-h-[min(45vh,320px)] space-y-2 overflow-y-auto text-sm">
                                            {(detailPayload.notes ?? []).length === 0 ? (
                                                <li className="text-zinc-500">Ainda sem notas.</li>
                                            ) : (
                                                detailPayload.notes.map((n) => (
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
                                        {canManage ? (
                                            <form onSubmit={submitNote} className="space-y-2 border-t border-zinc-200 pt-4 dark:border-zinc-700">
                                                <InputLabel value="Nova anotação" />
                                                <Textarea
                                                    value={noteForm.data.body}
                                                    onChange={(e) => noteForm.setData('body', e.target.value)}
                                                    rows={4}
                                                    className="w-full"
                                                    placeholder="Escreva uma nota visível à equipe…"
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
                        </>
                    ) : (
                        <div className="p-6">
                            <p className="text-sm text-red-600">Não foi possível carregar a ficha.</p>
                        </div>
                    )}
                </div>
            </Modal>
        </AdminLayout>
    );
}
