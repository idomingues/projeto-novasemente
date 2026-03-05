import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { ArrowLeftIcon, PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import PageHeader from '@/Components/PageHeader';
import Card from '@/Components/Card';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputError from '@/Components/InputError';
import { useState, FormEventHandler } from 'react';

interface ServiceItem {
    id: number;
    day_of_week: number;
    day_name: string;
    name: string;
    start_time: string;
    end_time: string | null;
    sort_order: number;
}

interface Props {
    church: { id: number; name: string };
    services: ServiceItem[];
}

const DAYS = [
    { value: 0, label: 'Domingo' },
    { value: 1, label: 'Segunda' },
    { value: 2, label: 'Terça' },
    { value: 3, label: 'Quarta' },
    { value: 4, label: 'Quinta' },
    { value: 5, label: 'Sexta' },
    { value: 6, label: 'Sábado' },
];

export default function ChurchServicesIndex({ church, services }: Props) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        day_of_week: 6,
        name: '',
        start_time: '09:00',
        end_time: '',
        sort_order: 0,
    });

    const openCreate = () => {
        setEditingId(null);
        setData({ day_of_week: 6, name: '', start_time: '09:00', end_time: '', sort_order: 0 });
        clearErrors();
        setIsModalOpen(true);
    };

    const openEdit = (s: ServiceItem) => {
        setEditingId(s.id);
        setData({
            day_of_week: s.day_of_week,
            name: s.name,
            start_time: s.start_time,
            end_time: s.end_time ?? '',
            sort_order: s.sort_order,
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
        const payload = { ...data, end_time: data.end_time || null };
        if (editingId) {
            put(route('churches.services.update', [church.id, editingId]), { data: payload, onSuccess: () => closeModal() });
        } else {
            post(route('churches.services.store', church.id), { data: payload, onSuccess: () => closeModal() });
        }
    };

    const handleDelete = (id: number) => {
        if (confirm('Remover este horário?')) {
            router.delete(route('churches.services.destroy', [church.id, id]));
        }
    };

    return (
        <AdminLayout>
            <Head title={`Horários de culto – ${church.name}`} />
            <PageHeader title={`Horários de culto: ${church.name}`}>
                <div className="flex items-center gap-2">
                    <Link
                        href={route('churches.index')}
                        className="inline-flex items-center gap-1 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                    >
                        <ArrowLeftIcon className="w-4 h-4" />
                        Voltar
                    </Link>
                    <PrimaryButton type="button" onClick={openCreate} className="gap-2">
                        <PlusIcon className="w-5 h-5" />
                        Adicionar horário
                    </PrimaryButton>
                </div>
            </PageHeader>

            <Card className="!p-0 overflow-hidden">
                {services.length === 0 ? (
                    <div className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">
                        Nenhum horário cadastrado. Estes horários aparecem no app mobile em &quot;Cultos e horários&quot;.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">Dia</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">Nome</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">Horário</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {services.map((s) => (
                                    <tr key={s.id}>
                                        <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{s.day_name}</td>
                                        <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">{s.name}</td>
                                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                                            {s.start_time}{s.end_time ? ` – ${s.end_time}` : ''}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button type="button" onClick={() => openEdit(s)} className="p-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 rounded-lg" title="Editar">
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button type="button" onClick={() => handleDelete(s.id)} className="p-2 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg" title="Excluir">
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Modal show={isModalOpen} onClose={closeModal}>
                <form onSubmit={submit} className="p-6">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                        {editingId ? 'Editar horário' : 'Novo horário de culto'}
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <InputLabel htmlFor="day_of_week" value="Dia da semana" />
                            <select
                                id="day_of_week"
                                value={data.day_of_week}
                                onChange={(e) => setData('day_of_week', Number(e.target.value))}
                                className="mt-1 block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
                            >
                                {DAYS.map((d) => (
                                    <option key={d.value} value={d.value}>{d.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <InputLabel htmlFor="name" value="Nome (ex: Culto de Celebração)" />
                            <TextInput id="name" value={data.name} onChange={(e) => setData('name', e.target.value)} className="mt-1 block w-full" required />
                            <InputError message={errors.name} className="mt-1" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <InputLabel htmlFor="start_time" value="Início" />
                                <TextInput id="start_time" type="time" value={data.start_time} onChange={(e) => setData('start_time', e.target.value)} className="mt-1 block w-full" required />
                                <InputError message={errors.start_time} className="mt-1" />
                            </div>
                            <div>
                                <InputLabel htmlFor="end_time" value="Fim (opcional)" />
                                <TextInput id="end_time" type="time" value={data.end_time} onChange={(e) => setData('end_time', e.target.value)} className="mt-1 block w-full" />
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                        <SecondaryButton type="button" onClick={closeModal}>Cancelar</SecondaryButton>
                        <PrimaryButton type="submit" disabled={processing}>{editingId ? 'Salvar' : 'Adicionar'}</PrimaryButton>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}
