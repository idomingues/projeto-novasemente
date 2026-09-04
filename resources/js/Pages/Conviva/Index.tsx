import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { PencilIcon, TrashIcon, BookOpenIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import AddButton from '@/Components/AddButton';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import ListCardActionRow from '@/Components/ListCard/ListCardActionRow';
import ListCardIconActionButton from '@/Components/ListCard/ListCardIconActionButton';
import PageHeader from '@/Components/PageHeader';
import InputError from '@/Components/InputError';
import { useCallback, useEffect, useRef, useState, FormEventHandler } from 'react';
import { confirmAction } from '@/utils/confirmDialog';
import { useListModalSubmit } from '@/hooks/useListModalSubmit';

type ConvivaClassRow = {
    id: number;
    room_name: string;
    teacher_name: string;
    is_active: boolean;
    sort_order: number;
};

type PresenceCheckin = {
    id: number;
    user_id: number;
    user_name: string;
    user_email: string | null;
    photo_url: string | null;
    class_id: number;
    room_name: string;
    teacher_name: string;
    checked_in_at: string | null;
};

type PresenceByClass = {
    class_id: number;
    room_name: string;
    teacher_name: string;
    count: number;
    checkins: PresenceCheckin[];
};

interface Props {
    tab: 'turmas' | 'presencas';
    classes: ConvivaClassRow[];
    canManage?: boolean;
    presence: {
        date: string;
        class_id: number | null;
        total: number;
        by_class: PresenceByClass[];
        checkins: PresenceCheckin[];
    };
}

function formatDateBr(iso: string): string {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return iso;
    return `${m[3]}/${m[2]}/${m[1]}`;
}

export default function Index({ tab, classes, canManage = false, presence }: Props) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);
    const syncFormAfterReloadRef = useRef(false);

    const { data, setData, errors, reset, clearErrors, setError } = useForm({
        room_name: '',
        teacher_name: '',
        is_active: true as boolean,
        sort_order: 0 as number,
    });

    const { saving, save } = useListModalSubmit({
        reloadOnly: ['classes', 'presence'],
        setError,
        clearErrors,
    });

    const showSaveMessage = useCallback((message: string) => {
        setSaveMessage(message);
        window.setTimeout(() => setSaveMessage(null), 5000);
    }, []);

    const syncEditModalUrl = useCallback(
        (id: number | null) => {
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
            if (!params.get('tab')) {
                params.set('tab', tab);
            }
            const q = params.toString();
            const next = `${window.location.pathname}${q ? `?${q}` : ''}`;
            const current = `${window.location.pathname}${window.location.search}`;
            if (next !== current) {
                window.history.replaceState({}, '', next);
            }
        },
        [tab],
    );

    const applyClassToForm = useCallback(
        (row: ConvivaClassRow) => {
            setData({
                room_name: row.room_name,
                teacher_name: row.teacher_name,
                is_active: row.is_active,
                sort_order: row.sort_order,
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
        setData({ room_name: '', teacher_name: '', is_active: true, sort_order: 0 });
        clearErrors();
        setIsModalOpen(true);
    };

    const openEditModal = (row: ConvivaClassRow) => {
        setIsEditing(true);
        setEditingId(row.id);
        setSaveMessage(null);
        syncEditModalUrl(row.id);
        applyClassToForm(row);
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
        const row = classes.find((c) => c.id === id);
        if (!row) {
            return;
        }
        if (!isModalOpen || editingId !== id) {
            openEditModal(row);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [classes]);

    useEffect(() => {
        if (!syncFormAfterReloadRef.current || editingId == null || !isModalOpen) {
            return;
        }
        const row = classes.find((c) => c.id === editingId);
        if (!row) {
            return;
        }
        applyClassToForm(row);
        syncFormAfterReloadRef.current = false;
    }, [classes, editingId, isModalOpen, applyClassToForm]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        void (async () => {
            const payload = {
                room_name: data.room_name,
                teacher_name: data.teacher_name,
                is_active: data.is_active,
                sort_order: Number(data.sort_order) || 0,
            };
            const outcome = await save(
                isEditing,
                editingId,
                payload,
                route('conviva.store'),
                (id) => route('conviva.update', id),
            );
            if (!outcome.ok) {
                return;
            }
            if (isEditing) {
                showSaveMessage('Turma atualizada.');
                return;
            }
            showSaveMessage('Turma criada.');
            const newId = outcome.createdId;
            if (newId) {
                syncFormAfterReloadRef.current = true;
                setIsEditing(true);
                setEditingId(newId);
                syncEditModalUrl(newId);
            } else {
                reset();
                setData({ room_name: '', teacher_name: '', is_active: true, sort_order: 0 });
            }
        })();
    };

    const handleDelete = async (id: number) => {
        const ok = await confirmAction({
            title: 'Excluir turma CONVIVA?',
            text: 'Só é possível excluir turmas sem check-ins. Esta ação não pode ser desfeita.',
            confirmButtonText: 'Excluir',
            danger: true,
            icon: 'warning',
        });
        if (ok) {
            router.delete(route('conviva.destroy', id));
        }
    };

    const goTab = (next: 'turmas' | 'presencas') => {
        router.get(
            route('conviva.index'),
            {
                tab: next,
                ...(next === 'presencas'
                    ? { date: presence.date, class_id: presence.class_id || undefined }
                    : {}),
            },
            { preserveState: false, preserveScroll: true },
        );
    };

    const applyPresenceFilters = (date: string, classId: string) => {
        router.get(
            route('conviva.index'),
            {
                tab: 'presencas',
                date,
                ...(classId ? { class_id: classId } : {}),
            },
            { preserveState: false, preserveScroll: true },
        );
    };

    const tabBtn =
        'cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40';
    const tabActive =
        'bg-teal-50 text-teal-900 ring-1 ring-teal-200 dark:bg-teal-950/40 dark:text-teal-100 dark:ring-teal-800';
    const tabIdle = 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800';

    return (
        <AdminLayout>
            <Head title="CONVIVA" />
            <PageHeader
                title="CONVIVA"
                subtitle="Turmas de estudo bíblico no culto — cadastre sala e professor juntos e acompanhe a presença semanal."
                actions={
                    canManage && tab === 'turmas' ? (
                        <AddButton variant="label" onClick={openCreateModal} title="Nova turma">
                            Nova turma
                        </AddButton>
                    ) : undefined
                }
            />

            <div className="mb-5 flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => goTab('turmas')}
                    className={`${tabBtn} ${tab === 'turmas' ? tabActive : tabIdle}`}
                >
                    Turmas
                </button>
                <button
                    type="button"
                    onClick={() => goTab('presencas')}
                    className={`${tabBtn} ${tab === 'presencas' ? tabActive : tabIdle}`}
                >
                    Presenças
                </button>
            </div>

            {tab === 'turmas' && (
                <div className="space-y-4">
                    {classes.length === 0 ? (
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-12 text-center text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400">
                            {canManage
                                ? 'Nenhuma turma cadastrada. Toque em Nova turma para criar a primeira.'
                                : 'Nenhuma turma cadastrada.'}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {classes.map((row) => (
                                <div
                                    key={row.id}
                                    className="flex flex-col rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-200/80 dark:bg-teal-950/40 dark:text-teal-300 dark:ring-teal-800/60">
                                                <BookOpenIcon className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="truncate font-medium text-zinc-900 dark:text-white">
                                                    {row.room_name}
                                                </h3>
                                                <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                                                    {row.teacher_name}
                                                </p>
                                                {!row.is_active && (
                                                    <span className="mt-1 inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                                        Inativa
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {canManage && (
                                            <ListCardActionRow className="shrink-0 gap-1">
                                                <ListCardIconActionButton
                                                    label="Editar"
                                                    icon={<PencilIcon className="h-5 w-5" />}
                                                    onClick={() => openEditModal(row)}
                                                />
                                                <ListCardIconActionButton
                                                    label="Excluir"
                                                    icon={<TrashIcon className="h-5 w-5" />}
                                                    tone="danger"
                                                    onClick={() => handleDelete(row.id)}
                                                />
                                            </ListCardActionRow>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {tab === 'presencas' && (
                <div className="space-y-4">
                    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                            <div className="min-w-0 flex-1">
                                <InputLabel htmlFor="presence-date" value="Sábado" />
                                <TextInput
                                    id="presence-date"
                                    type="date"
                                    defaultValue={presence.date}
                                    className="mt-1 block w-full"
                                    onChange={(e) =>
                                        applyPresenceFilters(
                                            e.target.value,
                                            presence.class_id ? String(presence.class_id) : '',
                                        )
                                    }
                                />
                            </div>
                            <div className="min-w-0 flex-1">
                                <InputLabel htmlFor="presence-class" value="Turma" />
                                <select
                                    id="presence-class"
                                    defaultValue={presence.class_id ? String(presence.class_id) : ''}
                                    onChange={(e) => applyPresenceFilters(presence.date, e.target.value)}
                                    className="mt-1 block h-11 w-full cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm focus:border-transparent focus:ring-2 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                                >
                                    <option value="">Todas as turmas</option>
                                    {classes.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.room_name} · {c.teacher_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                            {formatDateBr(presence.date)} —{' '}
                            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                {presence.total} {presence.total === 1 ? 'check-in' : 'check-ins'}
                            </span>
                        </p>
                    </div>

                    {presence.total === 0 ? (
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-12 text-center text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400">
                            Nenhum check-in neste sábado.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {presence.by_class.map((group) => (
                                <div
                                    key={group.class_id}
                                    className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
                                >
                                    <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
                                        <div className="min-w-0">
                                            <h3 className="font-semibold text-zinc-900 dark:text-white">
                                                {group.room_name}
                                            </h3>
                                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                                {group.teacher_name}
                                            </p>
                                        </div>
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 ring-1 ring-teal-200 dark:bg-teal-950/40 dark:text-teal-200 dark:ring-teal-800">
                                            <UserGroupIcon className="h-4 w-4" />
                                            {group.count}
                                        </span>
                                    </div>
                                    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                        {group.checkins.map((c) => (
                                            <li key={c.id} className="flex items-center gap-3 px-5 py-3">
                                                {c.photo_url ? (
                                                    <img
                                                        src={c.photo_url}
                                                        alt=""
                                                        className="h-9 w-9 rounded-full object-cover ring-1 ring-zinc-200 dark:ring-zinc-700"
                                                    />
                                                ) : (
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                                        {c.user_name.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                                                        {c.user_name}
                                                    </p>
                                                    {c.user_email ? (
                                                        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                                                            {c.user_email}
                                                        </p>
                                                    ) : null}
                                                </div>
                                                {c.checked_in_at ? (
                                                    <span className="text-xs tabular-nums text-zinc-400">
                                                        {c.checked_in_at}
                                                    </span>
                                                ) : null}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <Modal show={isModalOpen} onClose={closeModal}>
                <form onSubmit={submit} className="p-6">
                    <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">
                        {isEditing ? 'Editar turma CONVIVA' : 'Nova turma CONVIVA'}
                    </h2>
                    {saveMessage ? (
                        <p className="mb-4 text-sm font-medium text-emerald-700 dark:text-emerald-300" role="status">
                            {saveMessage}
                        </p>
                    ) : null}
                    <div>
                        <InputLabel htmlFor="room_name" value="Sala" />
                        <TextInput
                            id="room_name"
                            value={data.room_name}
                            onChange={(e) => setData('room_name', e.target.value)}
                            className="mt-1 block w-full"
                            placeholder="Ex: Sala 1"
                        />
                        <InputError message={errors.room_name} className="mt-1" />
                    </div>
                    <div className="mt-4">
                        <InputLabel htmlFor="teacher_name" value="Professor" />
                        <TextInput
                            id="teacher_name"
                            value={data.teacher_name}
                            onChange={(e) => setData('teacher_name', e.target.value)}
                            className="mt-1 block w-full"
                            placeholder="Ex: Maria Silva"
                        />
                        <InputError message={errors.teacher_name} className="mt-1" />
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                        <input
                            id="is_active"
                            type="checkbox"
                            checked={data.is_active}
                            onChange={(e) => setData('is_active', e.target.checked)}
                            className="h-4 w-4 cursor-pointer rounded border-zinc-300 text-teal-600 focus:ring-teal-500"
                        />
                        <InputLabel htmlFor="is_active" value="Turma ativa" className="!mb-0 cursor-pointer" />
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                        <SecondaryButton type="button" onClick={closeModal}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton type="submit" disabled={saving}>
                            {saving ? 'Salvando…' : isEditing ? 'Salvar' : 'Criar'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}
