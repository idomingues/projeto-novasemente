import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { PlusIcon, PencilIcon, TrashIcon, ArchiveBoxIcon, MagnifyingGlassIcon, ClockIcon } from '@heroicons/react/24/outline';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import PageHeader from '@/Components/PageHeader';
import InputError from '@/Components/InputError';
import { useState, FormEventHandler } from 'react';
import axios from 'axios';

interface InventoryItem {
    id: number;
    barcode: string;
    serial_number: string | null;
    name: string;
    description: string | null;
    location: string | null;
    category: string | null;
    brand: string | null;
    item_type: string | null;
    classification: string | null;
    acquisition_date: string | null;
    acquisition_value: string | null;
    current_value: string | null;
    status: string;
    movements_count: number;
}

interface Movement {
    id: number;
    type: string;
    type_label: string;
    from_location: string | null;
    to_location: string | null;
    notes: string | null;
    user_name: string | null;
    created_at: string;
}

interface Props {
    items: InventoryItem[];
    filters: { search?: string };
}

export default function Index({ items, filters }: Props) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);
    const [history, setHistory] = useState<Movement[]>([]);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        barcode: '',
        serial_number: '',
        name: '',
        description: '',
        location: '',
        category: '',
        brand: '',
        item_type: '',
        classification: '',
        acquisition_date: '',
        acquisition_value: '',
        current_value: '',
        status: 'active',
    });

    const openCreateModal = () => {
        setIsEditing(false);
        setEditingId(null);
        reset();
        clearErrors();
        setIsModalOpen(true);
    };

    const openEditModal = (item: InventoryItem) => {
        setIsEditing(true);
        setEditingId(item.id);
        setData({
            barcode: item.barcode,
            serial_number: item.serial_number ?? '',
            name: item.name,
            description: item.description ?? '',
            location: item.location ?? '',
            category: item.category ?? '',
            brand: item.brand ?? '',
            item_type: item.item_type ?? '',
            classification: item.classification ?? '',
            acquisition_date: item.acquisition_date ? item.acquisition_date.split('T')[0] : '',
            acquisition_value: item.acquisition_value ?? '',
            current_value: item.current_value ?? '',
            status: item.status || 'active',
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
            put(route('inventory.update', editingId), { onSuccess: () => closeModal() });
        } else {
            post(route('inventory.store'), { onSuccess: () => closeModal() });
        }
    };

    const handleDelete = (id: number) => {
        if (confirm('Tem certeza que deseja excluir este item? O histórico também será removido.')) {
            router.delete(route('inventory.destroy', id));
        }
    };

    const openHistory = (item: InventoryItem) => {
        setHistoryItem(item);
        setHistoryModalOpen(true);
        setHistory([]);
        axios.get(route('inventory.history', item.id)).then((res) => {
            setHistory(res.data.movements ?? []);
        });
    };

    const formatDate = (s: string) => {
        return new Date(s).toLocaleString('pt-BR', {
            dateStyle: 'short',
            timeStyle: 'short',
        });
    };

    return (
        <AdminLayout>
            <Head title="Inventário" />
            <PageHeader title="Inventário">
                <PrimaryButton type="button" onClick={openCreateModal} className="gap-2">
                    <PlusIcon className="w-5 h-5" />
                    Novo Item
                </PrimaryButton>
            </PageHeader>

            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                Gerencie os objetos da igreja com código de barras. Use a busca para encontrar por código ou nome e visualize o histórico de cada item.
            </p>

            <form
                method="get"
                action={route('inventory.index')}
                className="mb-6"
            >
                <div className="relative max-w-md flex gap-2">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                    <input
                        type="search"
                        name="search"
                        defaultValue={filters.search ?? ''}
                        placeholder="Buscar por código de barras ou nome..."
                        className="flex-1 pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-zinc-500 focus:border-transparent"
                    />
                    <PrimaryButton type="submit">Buscar</PrimaryButton>
                </div>
            </form>

            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700">
                            <tr>
                                <th className="px-5 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Código / Série</th>
                                <th className="px-5 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Nome</th>
                                <th className="px-5 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider hidden lg:table-cell">Categoria / Marca</th>
                                <th className="px-5 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Localização</th>
                                <th className="px-5 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Histórico</th>
                                <th className="px-5 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider w-24">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {items.map((item) => (
                                <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                                    <td className="px-5 py-3">
                                        <span className="font-mono text-sm text-zinc-900 dark:text-white">{item.barcode}</span>
                                        {item.serial_number && (
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400">{item.serial_number}</p>
                                        )}
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className="font-medium text-zinc-900 dark:text-white">{item.name}</span>
                                        {item.description && (
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-xs">{item.description}</p>
                                        )}
                                    </td>
                                    <td className="px-5 py-3 text-sm text-zinc-600 dark:text-zinc-300 hidden lg:table-cell">
                                        {[item.category, item.brand].filter(Boolean).join(' • ') || '—'}
                                    </td>
                                    <td className="px-5 py-3 text-sm text-zinc-600 dark:text-zinc-300">{item.location ?? '—'}</td>
                                    <td className="px-5 py-3">
                                        <button
                                            type="button"
                                            onClick={() => openHistory(item)}
                                            className="inline-flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                                        >
                                            <ClockIcon className="w-4 h-4" />
                                            {item.movements_count} {item.movements_count === 1 ? 'movimento' : 'movimentos'}
                                        </button>
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => openEditModal(item)}
                                                className="p-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                                title="Editar"
                                            >
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(item.id)}
                                                className="p-2 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                                title="Excluir"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {items.length === 0 && (
                    <div className="p-12 text-center text-zinc-500 dark:text-zinc-400">
                        {filters.search ? 'Nenhum item encontrado para esta busca.' : 'Nenhum item cadastrado. Clique em \"Novo Item\" para começar.'}
                    </div>
                )}
            </div>

            <Modal show={isModalOpen} onClose={closeModal}>
                <form onSubmit={submit} className="p-6">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-6">
                        {isEditing ? 'Editar item' : 'Novo item'}
                    </h2>
                    <div>
                        <InputLabel htmlFor="barcode" value="Código de barras" />
                        <TextInput
                            id="barcode"
                            value={data.barcode}
                            onChange={(e) => setData('barcode', e.target.value)}
                            className="mt-1 block w-full font-mono"
                            placeholder="Ex: 7891234567890"
                        />
                        <InputError message={errors.barcode} className="mt-1" />
                    </div>
                    <div className="mt-4">
                        <InputLabel htmlFor="serial_number" value="Número de série (opcional)" />
                        <TextInput
                            id="serial_number"
                            value={data.serial_number}
                            onChange={(e) => setData('serial_number', e.target.value)}
                            className="mt-1 block w-full font-mono"
                            placeholder="Ex: 0A239QBW505407"
                        />
                        <InputError message={errors.serial_number} className="mt-1" />
                    </div>
                    <div className="mt-4">
                        <InputLabel htmlFor="name" value="Nome" />
                        <TextInput
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            className="mt-1 block w-full"
                            placeholder="Ex: Projetor Epson"
                        />
                        <InputError message={errors.name} className="mt-1" />
                    </div>
                    <div className="mt-4">
                        <InputLabel htmlFor="description" value="Descrição (opcional)" />
                        <textarea
                            id="description"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            rows={2}
                            className="mt-1 block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 focus:border-transparent"
                            placeholder="Detalhes do item"
                        />
                        <InputError message={errors.description} className="mt-1" />
                    </div>
                    <div className="mt-4">
                        <InputLabel htmlFor="location" value="Localização atual (opcional)" />
                        <TextInput
                            id="location"
                            value={data.location}
                            onChange={(e) => setData('location', e.target.value)}
                            className="mt-1 block w-full"
                            placeholder="Ex: Sala de reuniões 1"
                        />
                        <InputError message={errors.location} className="mt-1" />
                    </div>
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <InputLabel htmlFor="category" value="Categoria (opcional)" />
                            <TextInput
                                id="category"
                                value={data.category}
                                onChange={(e) => setData('category', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder="Ex: Eletrônicos"
                            />
                            <InputError message={errors.category} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="brand" value="Marca (opcional)" />
                            <TextInput
                                id="brand"
                                value={data.brand}
                                onChange={(e) => setData('brand', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder="Ex: Yamaha"
                            />
                            <InputError message={errors.brand} className="mt-1" />
                        </div>
                    </div>
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <InputLabel htmlFor="item_type" value="Tipo (opcional)" />
                            <TextInput
                                id="item_type"
                                value={data.item_type}
                                onChange={(e) => setData('item_type', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder="Ex: Mesa de som"
                            />
                            <InputError message={errors.item_type} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="classification" value="Classificação (opcional)" />
                            <TextInput
                                id="classification"
                                value={data.classification}
                                onChange={(e) => setData('classification', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder="Ex: Básico, Franquia"
                            />
                            <InputError message={errors.classification} className="mt-1" />
                        </div>
                    </div>
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <InputLabel htmlFor="acquisition_date" value="Data de aquisição" />
                            <TextInput
                                id="acquisition_date"
                                type="date"
                                value={data.acquisition_date}
                                onChange={(e) => setData('acquisition_date', e.target.value)}
                                className="mt-1 block w-full"
                            />
                            <InputError message={errors.acquisition_date} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="acquisition_value" value="Valor de compra (R$)" />
                            <TextInput
                                id="acquisition_value"
                                type="number"
                                step="0.01"
                                min="0"
                                value={data.acquisition_value}
                                onChange={(e) => setData('acquisition_value', e.target.value)}
                                className="mt-1 block w-full"
                            />
                            <InputError message={errors.acquisition_value} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="current_value" value="Valor atual (R$)" />
                            <TextInput
                                id="current_value"
                                type="number"
                                step="0.01"
                                min="0"
                                value={data.current_value}
                                onChange={(e) => setData('current_value', e.target.value)}
                                className="mt-1 block w-full"
                            />
                            <InputError message={errors.current_value} className="mt-1" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <InputLabel htmlFor="status" value="Status" />
                        <select
                            id="status"
                            value={data.status}
                            onChange={(e) => setData('status', e.target.value)}
                            className="mt-1 block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100 text-sm"
                        >
                            <option value="active">Ativo</option>
                            <option value="inactive">Inativo</option>
                            <option value="maintenance">Em manutenção</option>
                            <option value="disposed">Baixado</option>
                        </select>
                        <InputError message={errors.status} className="mt-1" />
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                        <SecondaryButton type="button" onClick={closeModal}>Cancelar</SecondaryButton>
                        <PrimaryButton type="submit" disabled={processing}>
                            {isEditing ? 'Salvar' : 'Cadastrar'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={historyModalOpen} onClose={() => setHistoryModalOpen(false)}>
                <div className="p-6">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">Histórico do item</h2>
                    {historyItem && (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                            {historyItem.name} — <span className="font-mono">{historyItem.barcode}</span>
                        </p>
                    )}
                    <div className="max-h-80 overflow-y-auto space-y-3">
                        {history.length === 0 && (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">Carregando...</p>
                        )}
                        {history.map((m) => (
                            <div
                                key={m.id}
                                className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-3 text-sm"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-medium text-zinc-900 dark:text-white">{m.type_label}</span>
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">{formatDate(m.created_at)}</span>
                                </div>
                                {(m.from_location || m.to_location) && (
                                    <p className="mt-1 text-zinc-600 dark:text-zinc-300">
                                        {m.from_location && <>De: {m.from_location}</>}
                                        {m.from_location && m.to_location && ' → '}
                                        {m.to_location && <>Para: {m.to_location}</>}
                                    </p>
                                )}
                                {m.notes && (
                                    <p className="mt-1 text-zinc-500 dark:text-zinc-400">{m.notes}</p>
                                )}
                                {m.user_name && (
                                    <p className="mt-1 text-xs text-zinc-400">Por: {m.user_name}</p>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 flex justify-end">
                        <SecondaryButton type="button" onClick={() => setHistoryModalOpen(false)}>Fechar</SecondaryButton>
                    </div>
                </div>
            </Modal>
        </AdminLayout>
    );
}
