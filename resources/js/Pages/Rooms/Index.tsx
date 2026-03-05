import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { PlusIcon, PencilIcon, TrashIcon, BuildingOffice2Icon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import PageHeader from '@/Components/PageHeader';
import InputError from '@/Components/InputError';
import { useState, FormEventHandler } from 'react';

interface Room {
    id: number;
    name: string;
    floor: string;
    location: string | null;
    capacity: number | null;
}

interface FloorData {
    label: string;
    rooms: Room[];
}

interface Props {
    rooms: Room[];
    byFloor: Record<string, FloorData>;
    floors: Record<string, string>;
}

export default function Index({ rooms, byFloor, floors }: Props) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [expandedFloors, setExpandedFloors] = useState<Record<string, boolean>>(() => {
        const keys = Object.keys(floors);
        return Object.fromEntries(keys.map((k) => [k, true]));
    });

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: '',
        floor: 'terreo',
        location: '',
        capacity: '' as string | number,
    });

    const openCreateModal = (floor?: string) => {
        setIsEditing(false);
        setEditingId(null);
        reset();
        setData({ ...data, name: '', floor: floor ?? 'terreo', location: '', capacity: '' });
        clearErrors();
        setIsModalOpen(true);
    };

    const openEditModal = (r: Room) => {
        setIsEditing(true);
        setEditingId(r.id);
        setData({
            name: r.name,
            floor: r.floor,
            location: r.location ?? '',
            capacity: r.capacity ?? '',
        });
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
            put(route('rooms.update', editingId), { onSuccess: () => closeModal() });
        } else {
            post(route('rooms.store'), { onSuccess: () => closeModal() });
        }
    };

    const handleDelete = (id: number) => {
        if (confirm('Tem certeza que deseja excluir esta sala?')) {
            router.delete(route('rooms.destroy', id));
        }
    };

    const toggleFloor = (floorKey: string) => {
        setExpandedFloors((prev) => ({ ...prev, [floorKey]: !prev[floorKey] }));
    };

    const floorOrder = ['terreo', 'mezanino', 'primeiro', 'segundo', 'terceiro'];

    return (
        <AdminLayout>
            <Head title="Salas" />
            <PageHeader title="Salas">
                <PrimaryButton type="button" onClick={() => openCreateModal()} className="gap-2">
                    <PlusIcon className="w-5 h-5" />
                    Nova Sala
                </PrimaryButton>
            </PageHeader>

            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                Gerencie as salas por andar. Use cada seção para organizar e visualizar as salas do Térreo ao Terceiro andar.
            </p>

            <div className="space-y-4">
                {floorOrder.map((floorKey) => {
                    const floorData = byFloor[floorKey];
                    if (!floorData) return null;
                    const isExpanded = expandedFloors[floorKey] !== false;
                    const label = floorData.label;
                    const floorRooms = floorData.rooms;

                    return (
                        <div
                            key={floorKey}
                            className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden"
                        >
                            <button
                                type="button"
                                onClick={() => toggleFloor(floorKey)}
                                className="w-full flex items-center justify-between gap-2 px-5 py-4 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    {isExpanded ? (
                                        <ChevronDownIcon className="w-5 h-5 text-zinc-500" />
                                    ) : (
                                        <ChevronRightIcon className="w-5 h-5 text-zinc-500" />
                                    )}
                                    <span className="font-semibold text-zinc-900 dark:text-white">{label}</span>
                                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                                        ({floorRooms.length} {floorRooms.length === 1 ? 'sala' : 'salas'})
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openCreateModal(floorKey);
                                    }}
                                    className="p-2 rounded-lg text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                    title={`Nova sala no ${label}`}
                                >
                                    <PlusIcon className="w-5 h-5" />
                                </button>
                            </button>
                            {isExpanded && (
                                <div className="border-t border-zinc-200 dark:border-zinc-700 p-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                        {floorRooms.map((r) => (
                                            <div
                                                key={r.id}
                                                className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-4 flex flex-col"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                                                            <BuildingOffice2Icon className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h3 className="font-medium text-zinc-900 dark:text-white truncate">{r.name}</h3>
                                                            {r.location && (
                                                                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{r.location}</p>
                                                            )}
                                                            {r.capacity != null && (
                                                                <p className="text-xs text-zinc-500 dark:text-zinc-400">Capacidade: {r.capacity}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => openEditModal(r)}
                                                            className="p-1.5 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                                            title="Editar"
                                                        >
                                                            <PencilIcon className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(r.id)}
                                                            className="p-1.5 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                                            title="Excluir"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => openCreateModal(floorKey)}
                                            className="rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-600 bg-transparent p-4 flex items-center justify-center gap-2 text-zinc-500 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 min-h-[88px]"
                                        >
                                            <PlusIcon className="w-5 h-5" />
                                            <span className="text-sm">Nova sala</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {rooms.length === 0 && (
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-12 text-center text-zinc-500 dark:text-zinc-400">
                    Nenhuma sala cadastrada. Clique em &quot;Nova Sala&quot; ou no botão + de um andar para começar.
                </div>
            )}

            <Modal show={isModalOpen} onClose={closeModal}>
                <form onSubmit={submit} className="p-6">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-6">
                        {isEditing ? 'Editar sala' : 'Nova sala'}
                    </h2>
                    <div>
                        <InputLabel htmlFor="name" value="Nome" />
                        <TextInput
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            className="mt-1 block w-full"
                            placeholder="Ex: Sala de reuniões 1"
                        />
                        <InputError message={errors.name} className="mt-1" />
                    </div>
                    <div className="mt-4">
                        <InputLabel htmlFor="floor" value="Andar" />
                        <select
                            id="floor"
                            value={data.floor}
                            onChange={(e) => setData('floor', e.target.value)}
                            className="mt-1 block w-full min-h-[2.75rem] h-11 py-2.5 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm shadow-sm focus:ring-2 focus:ring-zinc-500 focus:border-transparent"
                        >
                            {Object.entries(floors).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                        <InputError message={errors.floor} className="mt-1" />
                    </div>
                    <div className="mt-4">
                        <InputLabel htmlFor="location" value="Localização / referência (opcional)" />
                        <TextInput
                            id="location"
                            value={data.location}
                            onChange={(e) => setData('location', e.target.value)}
                            className="mt-1 block w-full"
                            placeholder="Ex: Corredor esquerdo"
                        />
                        <InputError message={errors.location} className="mt-1" />
                    </div>
                    <div className="mt-4">
                        <InputLabel htmlFor="capacity" value="Capacidade (opcional)" />
                        <TextInput
                            id="capacity"
                            type="number"
                            min={0}
                            value={data.capacity === '' ? '' : data.capacity}
                            onChange={(e) => setData('capacity', e.target.value === '' ? '' : Number(e.target.value))}
                            className="mt-1 block w-full"
                            placeholder="Ex: 20"
                        />
                        <InputError message={errors.capacity} className="mt-1" />
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
