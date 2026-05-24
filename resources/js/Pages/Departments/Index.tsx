import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, router } from '@inertiajs/react';
import {
    PlusIcon,
    PencilIcon,
    TrashIcon,
    ClipboardDocumentListIcon,
    Squares2X2Icon,
    ListBulletIcon,
    MagnifyingGlassIcon,
    EyeIcon,
} from '@heroicons/react/24/outline';
import AddButton from '@/Components/AddButton';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import PageHeader from '@/Components/PageHeader';
import InputError from '@/Components/InputError';
import { DEPARTMENT_ICON_OPTIONS, getMinistryIconByKey } from '@/lib/ministryIcons';
import { useState, useEffect, useMemo, useCallback, FormEventHandler } from 'react';
import axios from 'axios';
import VolunteerRecordDetailBody from '@/Components/Volunteers/VolunteerRecordDetailBody';
import type { VolunteerDetailData } from '@/utils/volunteerDetailRows';
import { confirmAction } from '@/utils/confirmDialog';

interface PersonRef {
    id: number;
    name: string;
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

function detailUrlFromPattern(pattern: string, id: number): string {
    return pattern.replace(/\/0(\/|$)/, `/${id}$1`);
}

function PersonPicker({
    label,
    hint,
    options,
    selectedIds,
    onChange,
    filter,
    onFilterChange,
    onViewDetail,
    resolveDetailId,
    error,
}: {
    label: string;
    hint: string;
    options: PersonOption[];
    selectedIds: number[];
    onChange: (ids: number[]) => void;
    filter: string;
    onFilterChange: (v: string) => void;
    onViewDetail?: (id: number) => void;
    resolveDetailId?: (option: PersonOption) => number | null;
    error?: string;
}) {
    const detailIdFor = (option: PersonOption): number | null =>
        resolveDetailId ? resolveDetailId(option) : option.id;

    const canOpenDetail = (option: PersonOption): boolean =>
        onViewDetail != null && detailIdFor(option) != null;
    const { selectedOptions, otherOptions } = useMemo(() => {
        const q = filter.trim().toLowerCase();
        const list = q
            ? options.filter(
                  (o) =>
                      o.name.toLowerCase().includes(q) ||
                      (o.email?.toLowerCase().includes(q) ?? false),
              )
            : options;
        const byName = (a: PersonOption, b: PersonOption) =>
            a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
        const selected = list.filter((o) => selectedIds.includes(o.id)).sort(byName);
        const others = list.filter((o) => !selectedIds.includes(o.id)).sort(byName);
        return { selectedOptions: selected, otherOptions: others };
    }, [options, filter, selectedIds]);

    const toggle = (id: number) => {
        const set = new Set(selectedIds);
        if (set.has(id)) {
            set.delete(id);
        } else {
            set.add(id);
        }
        onChange(Array.from(set));
    };

    return (
        <div className="mt-4">
            <InputLabel value={label} />
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
            <TextInput
                value={filter}
                onChange={(e) => onFilterChange(e.target.value)}
                className="mt-2 block w-full"
                placeholder="Filtrar por nome ou e-mail…"
            />
            <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50/80 p-2 dark:border-zinc-700 dark:bg-zinc-800/40">
                {selectedOptions.length === 0 && otherOptions.length === 0 ? (
                    <p className="px-2 py-3 text-sm text-zinc-500 dark:text-zinc-400">Nenhum resultado.</p>
                ) : (
                    <ul className="space-y-1">
                        {selectedOptions.length > 0 ? (
                            <>
                                <li className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                                    Selecionados
                                </li>
                                {selectedOptions.map((o) => (
                                    <li key={o.id}>
                                        <div className="flex items-start gap-1 rounded-lg bg-emerald-50/80 px-2 py-1.5 hover:bg-emerald-100/80 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40">
                                            <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked
                                                    onChange={() => toggle(o.id)}
                                                    className="mt-0.5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-600"
                                                />
                                                <span className="min-w-0 text-sm">
                                                    <span className="font-medium text-zinc-900 dark:text-white">{o.name}</span>
                                                    {o.email ? (
                                                        <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                                                            {o.email}
                                                        </span>
                                                    ) : null}
                                                </span>
                                            </label>
                                            {canOpenDetail(o) ? (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const detailId = detailIdFor(o);
                                                        if (detailId != null) onViewDetail?.(detailId);
                                                    }}
                                                    className="mt-0.5 shrink-0 rounded-lg p-1 text-zinc-500 hover:bg-white/80 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
                                                    title="Ver ficha do voluntário"
                                                    aria-label={`Ver ficha de ${o.name}`}
                                                >
                                                    <EyeIcon className="h-4 w-4" aria-hidden />
                                                </button>
                                            ) : null}
                                        </div>
                                    </li>
                                ))}
                            </>
                        ) : null}
                        {selectedOptions.length > 0 && otherOptions.length > 0 ? (
                            <li className="my-1 border-t border-zinc-200 dark:border-zinc-600" aria-hidden />
                        ) : null}
                        {otherOptions.length > 0 ? (
                            <>
                                {selectedOptions.length > 0 ? (
                                    <li className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                        Outros
                                    </li>
                                ) : null}
                                {otherOptions.map((o) => (
                                    <li key={o.id}>
                                        <div className="flex items-start gap-1 rounded-lg px-2 py-1.5 hover:bg-white dark:hover:bg-zinc-800">
                                            <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={false}
                                                    onChange={() => toggle(o.id)}
                                                    className="mt-0.5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-600"
                                                />
                                                <span className="min-w-0 text-sm">
                                                    <span className="font-medium text-zinc-900 dark:text-white">{o.name}</span>
                                                    {o.email ? (
                                                        <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                                                            {o.email}
                                                        </span>
                                                    ) : null}
                                                </span>
                                            </label>
                                            {canOpenDetail(o) ? (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const detailId = detailIdFor(o);
                                                        if (detailId != null) onViewDetail?.(detailId);
                                                    }}
                                                    className="mt-0.5 shrink-0 rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-700 dark:hover:text-white"
                                                    title="Ver ficha do voluntário"
                                                    aria-label={`Ver ficha de ${o.name}`}
                                                >
                                                    <EyeIcon className="h-4 w-4" aria-hidden />
                                                </button>
                                            ) : null}
                                        </div>
                                    </li>
                                ))}
                            </>
                        ) : null}
                    </ul>
                )}
            </div>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {selectedIds.length} selecionado{selectedIds.length === 1 ? '' : 's'}
            </p>
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
    const [search, setSearch] = useState(filters.search ?? '');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [leaderPickerFilter, setLeaderPickerFilter] = useState('');
    const [volunteerPickerFilter, setVolunteerPickerFilter] = useState('');
    const [rosterTab, setRosterTab] = useState<'leaders' | 'volunteers'>('leaders');
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailVolunteer, setDetailVolunteer] = useState<VolunteerDetailData | null>(null);

    const [rolesModalDepartmentId, setRolesModalDepartmentId] = useState<number | null>(null);
    const [rolesModalNewRoleName, setRolesModalNewRoleName] = useState('');

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: '',
        icon: '' as string | null,
        leader_user_ids: [] as number[],
        volunteer_ids: [] as number[],
    });

    useEffect(() => {
        if (search === (filters.search ?? '')) return;
        const timeout = setTimeout(() => {
            router.get(
                route('departments.index'),
                { search: search || undefined },
                { preserveState: true, replace: true },
            );
        }, 350);
        return () => clearTimeout(timeout);
    }, [search, filters.search]);

    const openVolunteerDetail = useCallback(
        async (id: number) => {
            if (!volunteerDetailUrlPattern) return;
            setDetailOpen(true);
            setDetailLoading(true);
            setDetailVolunteer(null);
            try {
                const { data } = await axios.get<{ volunteer: VolunteerDetailData }>(
                    detailUrlFromPattern(volunteerDetailUrlPattern, id),
                );
                setDetailVolunteer(data.volunteer);
            } finally {
                setDetailLoading(false);
            }
        },
        [volunteerDetailUrlPattern],
    );

    const closeVolunteerDetail = useCallback(() => {
        setDetailOpen(false);
        setDetailVolunteer(null);
    }, []);

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

    const rosterTabBtn = (active: boolean) =>
        `flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
            active
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
        }`;

    const openCreateModal = () => {
        setIsEditing(false);
        setEditingId(null);
        setRosterTab('leaders');
        setLeaderPickerFilter('');
        setVolunteerPickerFilter('');
        reset();
        clearErrors();
        setIsModalOpen(true);
    };

    const openEditModal = (d: Department) => {
        setIsEditing(true);
        setEditingId(d.id);
        setRosterTab('leaders');
        setLeaderPickerFilter('');
        setVolunteerPickerFilter('');
        setData({
            name: d.name,
            icon: d.icon ?? '',
            leader_user_ids: d.leaders.map((l) => l.id),
            volunteer_ids: d.volunteers.map((v) => v.id),
        });
        clearErrors();
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        reset();
    };

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
                preserveScroll: true,
                onSuccess: () => closeModal(),
            });
        } else {
            post(route('departments.store'), {
                preserveScroll: true,
                onSuccess: () => closeModal(),
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

            <Modal show={isModalOpen} onClose={closeModal} maxWidth={isEditing ? '2xl' : undefined}>
                <form onSubmit={submit} className="p-6 max-h-[85vh] overflow-y-auto">
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
                        <div className="mt-2 grid grid-cols-3 sm:grid-cols-5 gap-2">
                            {DEPARTMENT_ICON_OPTIONS.map(({ key, label, Icon }) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setData('icon', data.icon === key ? '' : key)}
                                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-colors ${
                                        data.icon === key
                                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                            : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 text-zinc-600 dark:text-zinc-400'
                                    }`}
                                    title={label}
                                >
                                    <Icon className="w-6 h-6" />
                                    <span className="text-xs mt-1 truncate w-full text-center">{label}</span>
                                </button>
                            ))}
                        </div>
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
                                    label="Líderes do departamento"
                                    hint="Usuários que lideram este departamento."
                                    options={leaderOptions}
                                    selectedIds={data.leader_user_ids}
                                    onChange={(ids) => setData('leader_user_ids', ids)}
                                    filter={leaderPickerFilter}
                                    onFilterChange={setLeaderPickerFilter}
                                    onViewDetail={volunteerDetailUrlPattern ? openVolunteerDetail : undefined}
                                    resolveDetailId={(o) => o.volunteer_id ?? null}
                                    error={errors.leader_user_ids}
                                />
                            ) : (
                                <PersonPicker
                                    label="Voluntários do departamento"
                                    hint="Voluntários vinculados a este departamento."
                                    options={volunteerOptions}
                                    selectedIds={data.volunteer_ids}
                                    onChange={(ids) => setData('volunteer_ids', ids)}
                                    filter={volunteerPickerFilter}
                                    onFilterChange={setVolunteerPickerFilter}
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

            <Modal show={detailOpen} onClose={closeVolunteerDetail} maxWidth="2xl">
                <div className="max-h-[min(90vh,80vh)] overflow-y-auto p-6">
                    {detailLoading && <p className="text-sm text-zinc-500">Carregando ficha…</p>}
                    {!detailLoading && detailVolunteer && (
                        <VolunteerRecordDetailBody
                            volunteer={detailVolunteer}
                            badge={volunteerDetailBadge(detailVolunteer)}
                            onClose={closeVolunteerDetail}
                        />
                    )}
                </div>
            </Modal>
        </AdminLayout>
    );
}
