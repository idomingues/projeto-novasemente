import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import PageHeader from '@/Components/PageHeader';
import InputError from '@/Components/InputError';
import { DEPARTMENT_ICON_OPTIONS, getMinistryIconByKey } from '@/lib/ministryIcons';
import { useState, FormEventHandler } from 'react';

interface Department {
    id: number;
    name: string;
    icon: string | null;
}

interface Props {
    departments: Department[];
}

export default function Index({ departments }: Props) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

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

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (isEditing && editingId) {
            put(route('departments.update', editingId), { onSuccess: () => closeModal() });
        } else {
            post(route('departments.store'), { onSuccess: () => closeModal() });
        }
    };

    const handleDelete = (id: number) => {
        if (confirm('Tem certeza que deseja excluir este departamento?')) {
            router.delete(route('departments.destroy', id));
        }
    };

    return (
        <AdminLayout>
            <Head title="Departamentos" />
            <PageHeader title="Departamentos">
                <PrimaryButton type="button" onClick={openCreateModal} className="gap-2">
                    <PlusIcon className="w-5 h-5" />
                    Novo Departamento
                </PrimaryButton>
            </PageHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {departments.map((d) => {
                    const IconComponent = getMinistryIconByKey(d.icon);
                    return (
                    <div
                        key={d.id}
                        className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col"
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                    <IconComponent className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
                                </div>
                                <h3 className="font-semibold text-zinc-900 dark:text-white truncate">{d.name}</h3>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                    type="button"
                                    onClick={() => openEditModal(d)}
                                    className="p-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                    title="Editar"
                                >
                                    <PencilIcon className="w-5 h-5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(d.id)}
                                    className="p-2 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                    title="Excluir"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
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
        </AdminLayout>
    );
}
