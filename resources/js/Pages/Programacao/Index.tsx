import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { PencilIcon, TrashIcon, ClockIcon } from '@heroicons/react/24/outline';
import AddButton from '@/Components/AddButton';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import Textarea from '@/Components/Textarea';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import ListCardActionRow from '@/Components/ListCard/ListCardActionRow';
import ListCardIconActionButton from '@/Components/ListCard/ListCardIconActionButton';
import PageHeader from '@/Components/PageHeader';
import InputError from '@/Components/InputError';
import { useCallback, useEffect, useRef, useState, FormEventHandler } from 'react';
import { confirmAction } from '@/utils/confirmDialog';
import { useListModalSubmit } from '@/hooks/useListModalSubmit';

interface ProgramItem {
    id: number;
    day_of_week: number;
    day_name: string;
    when_label: string;
    title: string | null;
    body: string | null;
    lines: string[];
    time_mode: 'fixed' | 'sunset';
    start_time: string | null;
    end_time: string | null;
    display_time: string | null;
    home_message: string | null;
    image_url: string | null;
    show_on_home: boolean;
    is_active: boolean;
    sort_order: number;
}

interface Props {
    items: ProgramItem[];
    dayOptions: Record<string, string>;
    timeModes: Record<string, string>;
    canManage?: boolean;
}

type FormState = {
    day_of_week: number;
    when_label: string;
    title: string;
    body: string;
    lines: string;
    time_mode: 'fixed' | 'sunset';
    start_time: string;
    end_time: string;
    display_time: string;
    home_message: string;
    image_url: string;
    show_on_home: boolean;
    is_active: boolean;
    sort_order: string | number;
};

const emptyForm = (): FormState => ({
    day_of_week: 6,
    when_label: '',
    title: '',
    body: '',
    lines: '',
    time_mode: 'fixed',
    start_time: '',
    end_time: '',
    display_time: '',
    home_message: '',
    image_url: '',
    show_on_home: true,
    is_active: true,
    sort_order: '',
});

export default function Index({ items, dayOptions, timeModes, canManage = false }: Props) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);
    const syncFormAfterReloadRef = useRef(false);

    const { data, setData, errors, reset, clearErrors, setError } = useForm<FormState>(emptyForm());

    const { saving, save } = useListModalSubmit({
        reloadOnly: ['items'],
        setError,
        clearErrors,
    });

    const showSaveMessage = useCallback((message: string) => {
        setSaveMessage(message);
        window.setTimeout(() => setSaveMessage(null), 5000);
    }, []);

    const syncEditModalUrl = useCallback((id: number | null) => {
        if (typeof window === 'undefined') {
            return;
        }
        const params = new URLSearchParams(window.location.search);
        if (id != null && id > 0) {
            params.set('modal', 'edit');
            params.set('id', String(id));
        } else {
            params.delete('modal');
            params.delete('id');
        }
        const q = params.toString();
        const next = `${window.location.pathname}${q ? `?${q}` : ''}`;
        const current = `${window.location.pathname}${window.location.search}`;
        if (next !== current) {
            window.history.replaceState({}, '', next);
        }
    }, []);

    const applyItemToForm = useCallback(
        (item: ProgramItem) => {
            setData({
                day_of_week: item.day_of_week,
                when_label: item.when_label,
                title: item.title ?? '',
                body: item.body ?? '',
                lines: (item.lines ?? []).join('\n'),
                time_mode: item.time_mode,
                start_time: item.start_time ?? '',
                end_time: item.end_time ?? '',
                display_time: item.display_time ?? '',
                home_message: item.home_message ?? '',
                image_url: item.image_url ?? '',
                show_on_home: item.show_on_home,
                is_active: item.is_active,
                sort_order: item.sort_order,
            });
        },
        [setData],
    );

    const openCreateModal = () => {
        setIsEditing(false);
        setEditingId(null);
        setSaveMessage(null);
        syncEditModalUrl(null);
        reset();
        setData(emptyForm());
        clearErrors();
        setIsModalOpen(true);
    };

    const openEditModal = (item: ProgramItem) => {
        setIsEditing(true);
        setEditingId(item.id);
        setSaveMessage(null);
        syncEditModalUrl(item.id);
        applyItemToForm(item);
        clearErrors();
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSaveMessage(null);
        syncEditModalUrl(null);
        reset();
        setEditingId(null);
        setIsEditing(false);
    };

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        const params = new URLSearchParams(window.location.search);
        if (params.get('modal') !== 'edit') {
            return;
        }
        const id = Number(params.get('id'));
        if (Number.isNaN(id) || id <= 0) {
            return;
        }
        const item = items.find((row) => row.id === id);
        if (!item) {
            return;
        }
        if (!isModalOpen || editingId !== id) {
            openEditModal(item);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items]);

    useEffect(() => {
        if (!syncFormAfterReloadRef.current || editingId == null || !isModalOpen) {
            return;
        }
        const item = items.find((row) => row.id === editingId);
        if (!item) {
            return;
        }
        applyItemToForm(item);
        syncFormAfterReloadRef.current = false;
    }, [items, editingId, isModalOpen, applyItemToForm]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        void (async () => {
            const payload = {
                day_of_week: Number(data.day_of_week),
                when_label: data.when_label,
                title: data.title || null,
                body: data.body || null,
                lines: data.lines,
                time_mode: data.time_mode,
                start_time: data.start_time || null,
                end_time: data.end_time || null,
                display_time: data.display_time || null,
                home_message: data.home_message || null,
                image_url: data.image_url || null,
                show_on_home: data.show_on_home,
                is_active: data.is_active,
                sort_order: data.sort_order === '' ? 0 : Number(data.sort_order),
            };
            const outcome = await save(
                isEditing,
                editingId,
                payload,
                route('programacao.store'),
                (id) => route('programacao.update', id),
            );
            if (!outcome.ok) {
                return;
            }
            if (isEditing) {
                showSaveMessage('Programação atualizada.');
                return;
            }
            showSaveMessage('Programação criada.');
            const newId = outcome.createdId;
            if (newId) {
                syncFormAfterReloadRef.current = true;
                setIsEditing(true);
                setEditingId(newId);
                syncEditModalUrl(newId);
            } else {
                reset();
                setData(emptyForm());
            }
        })();
    };

    const handleDelete = async (id: number) => {
        const ok = await confirmAction({
            title: 'Excluir item?',
            text: 'Esta ação não pode ser desfeita.',
            confirmButtonText: 'Excluir',
            danger: true,
            icon: 'warning',
        });
        if (ok) {
            router.delete(route('programacao.destroy', id));
        }
    };

    return (
        <AdminLayout>
            <Head title="Programação" />
            <PageHeader
                title="Programação"
                subtitle="Itens fixos da agenda semanal (cultos, classes e pôr do sol). Aparecem em Horários e nos cards da home."
                actions={
                    canManage ? (
                        <AddButton variant="label" onClick={openCreateModal} title="Novo item">
                            Novo item
                        </AddButton>
                    ) : undefined
                }
            />

            <div className="space-y-3">
                {items.map((item) => (
                    <div
                        key={item.id}
                        className={`rounded-2xl border bg-white p-4 shadow-sm dark:bg-zinc-900 ${
                            item.is_active
                                ? 'border-zinc-200 dark:border-zinc-700'
                                : 'border-dashed border-zinc-300 opacity-70 dark:border-zinc-600'
                        }`}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200">
                                    <ClockIcon className="h-5 w-5" aria-hidden />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold uppercase tracking-wide text-brand-600 dark:text-brand-400">
                                        {item.when_label}
                                        {item.time_mode === 'sunset' ? ' · Pôr do sol' : ''}
                                    </p>
                                    <h3 className="mt-0.5 font-semibold uppercase text-zinc-900 dark:text-white">
                                        {item.title || (item.lines[0] ?? 'Sem título')}
                                    </h3>
                                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                        {item.day_name}
                                        {item.display_time ? ` · ${item.display_time}` : item.start_time ? ` · ${item.start_time}` : ''}
                                        {item.show_on_home ? ' · Home' : ''}
                                        {!item.is_active ? ' · Inativo' : ''}
                                    </p>
                                    {item.body ? (
                                        <p className="mt-2 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">{item.body}</p>
                                    ) : null}
                                </div>
                            </div>
                            {canManage ? (
                                <ListCardActionRow className="shrink-0 gap-1 sm:w-auto">
                                    <ListCardIconActionButton
                                        label="Editar"
                                        icon={<PencilIcon className="h-5 w-5" />}
                                        onClick={() => openEditModal(item)}
                                    />
                                    <ListCardIconActionButton
                                        label="Excluir"
                                        icon={<TrashIcon className="h-5 w-5" />}
                                        tone="danger"
                                        onClick={() => handleDelete(item.id)}
                                    />
                                </ListCardActionRow>
                            ) : null}
                        </div>
                    </div>
                ))}

                {items.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-12 text-center text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400">
                        {canManage
                            ? 'Nenhum item cadastrado. Toque em Novo item para adicionar a programação semanal.'
                            : 'Nenhum item de programação cadastrado.'}
                    </div>
                ) : null}
            </div>

            <Modal show={isModalOpen} onClose={closeModal} maxWidth="lg">
                <form onSubmit={submit} className="p-6">
                    <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">
                        {isEditing ? 'Editar programação' : 'Nova programação'}
                    </h2>
                    {saveMessage ? (
                        <p className="mb-4 text-sm font-medium text-emerald-700 dark:text-emerald-300" role="status">
                            {saveMessage}
                        </p>
                    ) : null}

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <InputLabel htmlFor="day_of_week" value="Dia da semana" />
                            <select
                                id="day_of_week"
                                value={data.day_of_week}
                                onChange={(e) => setData('day_of_week', Number(e.target.value))}
                                className="mt-1 block h-11 w-full cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm focus:border-transparent focus:ring-2 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                            >
                                {Object.entries(dayOptions).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                            <InputError message={errors.day_of_week} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="time_mode" value="Tipo de horário" />
                            <select
                                id="time_mode"
                                value={data.time_mode}
                                onChange={(e) => setData('time_mode', e.target.value as 'fixed' | 'sunset')}
                                className="mt-1 block h-11 w-full cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm focus:border-transparent focus:ring-2 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                            >
                                {Object.entries(timeModes).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                            <InputError message={errors.time_mode} className="mt-1" />
                        </div>
                    </div>

                    <div className="mt-4">
                        <InputLabel htmlFor="when_label" value="Rótulo (ex.: SÁB 9H30)" />
                        <TextInput
                            id="when_label"
                            value={data.when_label}
                            onChange={(e) => setData('when_label', e.target.value)}
                            className="mt-1 block w-full"
                            placeholder="SÁB 9H30"
                        />
                        <InputError message={errors.when_label} className="mt-1" />
                    </div>

                    <div className="mt-4">
                        <InputLabel htmlFor="title" value="Título (opcional)" />
                        <TextInput
                            id="title"
                            value={data.title}
                            onChange={(e) => setData('title', e.target.value)}
                            className="mt-1 block w-full"
                            placeholder="CULTO"
                        />
                        <InputError message={errors.title} className="mt-1" />
                    </div>

                    <div className="mt-4">
                        <InputLabel htmlFor="body" value="Descrição (opcional)" />
                        <Textarea
                            id="body"
                            value={data.body}
                            onChange={(e) => setData('body', e.target.value)}
                            className="mt-1 block w-full"
                            rows={3}
                        />
                        <InputError message={errors.body} className="mt-1" />
                    </div>

                    <div className="mt-4">
                        <InputLabel htmlFor="lines" value="Linhas extras (uma por linha, opcional)" />
                        <Textarea
                            id="lines"
                            value={data.lines}
                            onChange={(e) => setData('lines', e.target.value)}
                            className="mt-1 block w-full"
                            rows={3}
                            placeholder={'SEMENTINHA 0 a 16 anos\nNOVA ESSÊNCIA a partir dos 17 anos'}
                        />
                        <InputError message={errors.lines} className="mt-1" />
                    </div>

                    {data.time_mode === 'fixed' ? (
                        <div className="mt-4 grid gap-4 sm:grid-cols-3">
                            <div>
                                <InputLabel htmlFor="start_time" value="Início" />
                                <TextInput
                                    id="start_time"
                                    type="time"
                                    value={data.start_time}
                                    onChange={(e) => setData('start_time', e.target.value)}
                                    className="mt-1 block w-full"
                                />
                                <InputError message={errors.start_time} className="mt-1" />
                            </div>
                            <div>
                                <InputLabel htmlFor="end_time" value="Fim (opcional)" />
                                <TextInput
                                    id="end_time"
                                    type="time"
                                    value={data.end_time}
                                    onChange={(e) => setData('end_time', e.target.value)}
                                    className="mt-1 block w-full"
                                />
                                <InputError message={errors.end_time} className="mt-1" />
                            </div>
                            <div>
                                <InputLabel htmlFor="display_time" value="Texto do horário" />
                                <TextInput
                                    id="display_time"
                                    value={data.display_time}
                                    onChange={(e) => setData('display_time', e.target.value)}
                                    className="mt-1 block w-full"
                                    placeholder="09:30"
                                />
                                <InputError message={errors.display_time} className="mt-1" />
                            </div>
                        </div>
                    ) : (
                        <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                            O horário será calculado automaticamente pelo pôr do sol do dia selecionado.
                        </p>
                    )}

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div>
                            <InputLabel htmlFor="home_message" value="Mensagem do card (home)" />
                            <TextInput
                                id="home_message"
                                value={data.home_message}
                                onChange={(e) => setData('home_message', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder="Prepare seu coração para o sábado."
                            />
                            <InputError message={errors.home_message} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="sort_order" value="Ordem" />
                            <TextInput
                                id="sort_order"
                                type="number"
                                min={0}
                                value={data.sort_order === '' ? '' : data.sort_order}
                                onChange={(e) =>
                                    setData('sort_order', e.target.value === '' ? '' : Number(e.target.value))
                                }
                                className="mt-1 block w-full"
                            />
                            <InputError message={errors.sort_order} className="mt-1" />
                        </div>
                    </div>

                    <div className="mt-4">
                        <InputLabel htmlFor="image_url" value="Imagem do card (opcional)" />
                        <TextInput
                            id="image_url"
                            value={data.image_url}
                            onChange={(e) => setData('image_url', e.target.value)}
                            className="mt-1 block w-full"
                            placeholder="/images/sabbath-sunset-bg.jpg"
                        />
                        <InputError message={errors.image_url} className="mt-1" />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-4">
                        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                            <input
                                type="checkbox"
                                checked={data.show_on_home}
                                onChange={(e) => setData('show_on_home', e.target.checked)}
                                className="cursor-pointer rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            Mostrar na home
                        </label>
                        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                            <input
                                type="checkbox"
                                checked={data.is_active}
                                onChange={(e) => setData('is_active', e.target.checked)}
                                className="cursor-pointer rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            Ativo
                        </label>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <PrimaryButton type="submit" disabled={saving}>
                            {saving ? 'Salvando…' : 'Salvar'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}
