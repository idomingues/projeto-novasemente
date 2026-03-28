import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { PlusIcon, PencilIcon, TrashIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import AddButton from '@/Components/AddButton';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import PageHeader from '@/Components/PageHeader';
import InputError from '@/Components/InputError';
import { DEPARTMENT_ICON_OPTIONS, getMinistryIconByKey } from '@/lib/ministryIcons';
import { useState, FormEventHandler } from 'react';
import { confirmAction } from '@/utils/confirmDialog';

interface Department {
    id: number;
    name: string;
    icon: string | null;
}

interface ScheduleRole {
    id: number;
    name: string;
}

interface Props {
    departments: Department[];
    scheduleRolesByDepartmentId: Record<number, ScheduleRole[]>;
    canManageEscalasRoles: boolean;
}

export default function Index({ departments, scheduleRolesByDepartmentId, canManageEscalasRoles }: Props) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const [rolesModalDepartmentId, setRolesModalDepartmentId] = useState<number | null>(null);
    const [rolesModalNewRoleName, setRolesModalNewRoleName] = useState('');

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: '',
        icon: '' as string | null,
    });

    const openCreateModal = () => {
        setIsEditing(false);
        setEditingId(null);
        reset();
        clearErrors();
        setIsModalOpen(true);
    };

    const openEditModal = (d: Department) => {
        setIsEditing(true);
        setEditingId(d.id);
        setData({ name: d.name, icon: d.icon ?? '' });
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

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (isEditing && editingId) {
            put(route('departments.update', editingId), { onSuccess: () => closeModal() });
        } else {
            post(route('departments.store'), { onSuccess: () => closeModal() });
        }
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

    return (
        <AdminLayout>
            <Head title="Departamentos" />
            <PageHeader title="Departamentos">
                <AddButton onClick={openCreateModal}>Novo Departamento</AddButton>
            </PageHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {departments.map((d) => {
                    const IconComponent = getMinistryIconByKey(d.icon);
                    const deptRoles = scheduleRolesByDepartmentId[d.id] ?? [];
                    return (
                    <div
                        key={d.id}
                        className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col h-[320px] overflow-hidden"
                    >
                        <div className="shrink-0">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
                                    <IconComponent className="w-6 h-6 text-zinc-700 dark:text-zinc-300" />
                                </div>
                                <h3
                                    className="font-semibold text-lg leading-tight text-zinc-900 dark:text-white truncate min-w-0 flex-1"
                                    title={d.name}
                                >
                                    {d.name}
                                </h3>
                            </div>
                        </div>

                        <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col flex-1 min-h-0">
                            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 tracking-wide shrink-0">
                                Funções na escala
                            </p>
                            <div
                                className="mt-2 flex-1 min-h-0 overflow-y-auto overscroll-contain rounded-lg border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-800/30 px-2 py-2"
                                aria-label="Lista de funções"
                            >
                                {deptRoles.length === 0 ? (
                                    <span className="text-sm text-zinc-500 dark:text-zinc-400">Nenhuma função cadastrada</span>
                                ) : (
                                    <div className="flex flex-wrap gap-2 content-start">
                                        {deptRoles.map((r) => (
                                            <span
                                                key={r.id}
                                                className="text-sm px-3 py-1 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200"
                                            >
                                                {r.name}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="shrink-0 mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-1">
                            <button
                                type="button"
                                onClick={() => handleDelete(d.id)}
                                className="p-2 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                title="Excluir"
                                aria-label="Excluir departamento"
                            >
                                <TrashIcon className="w-5 h-5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => openEditModal(d)}
                                className="p-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                title="Editar"
                                aria-label="Editar departamento"
                            >
                                <PencilIcon className="w-5 h-5" />
                            </button>
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
                    </div>
                    );
                })}

                <button
                    type="button"
                    onClick={openCreateModal}
                    className="rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800/50 p-6 flex flex-col items-center justify-center gap-2 text-zinc-500 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors min-h-[120px]"
                >
                    <PlusIcon className="w-8 h-8" />
                    <span className="font-medium text-sm">Novo Departamento</span>
                </button>
            </div>

            {departments.length === 0 && (
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-12 text-center text-zinc-500 dark:text-zinc-400">
                    Nenhum departamento cadastrado. Clique em &quot;Novo Departamento&quot; para começar.
                </div>
            )}

            <Modal show={isModalOpen} onClose={closeModal}>
                <form onSubmit={submit} className="p-6">
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
                    <div className="mt-6 flex justify-end gap-2">
                        <SecondaryButton type="button" onClick={closeModal}>Cancelar</SecondaryButton>
                        <PrimaryButton type="submit" disabled={processing}>
                            {isEditing ? 'Salvar' : 'Criar'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={rolesModalDepartmentId !== null} onClose={closeRolesModal}>
                {rolesModalDepartmentId !== null && (
                    <div className="p-6">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                            Funções na escala — {
                            departments.find((d) => d.id === rolesModalDepartmentId)?.name ?? 'Departamento'
                            }
                        </h2>

                        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
                            {((scheduleRolesByDepartmentId[rolesModalDepartmentId] ?? []) as ScheduleRole[]).length === 0 ? (
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">Nenhuma função cadastrada para este departamento.</p>
                            ) : (
                                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                    {(scheduleRolesByDepartmentId[rolesModalDepartmentId] ?? []).map((r) => (
                                        <li key={r.id} className="flex items-center justify-between gap-2 py-2 text-sm text-zinc-800 dark:text-zinc-200">
                                            <span className="truncate">{r.name}</span>
                                            <button
                                                type="button"
                                                onClick={async () => {
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
        </AdminLayout>
    );
}
