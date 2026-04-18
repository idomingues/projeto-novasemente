import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, useForm, router, usePage } from '@inertiajs/react';
import { ClockIcon, PencilIcon, TrashIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import AddButton from '@/Components/AddButton';
import PageHeader from '@/Components/PageHeader';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import Textarea from '@/Components/Textarea';
import InputError from '@/Components/InputError';
import { useState, FormEventHandler, ChangeEventHandler } from 'react';
import { confirmAction } from '@/utils/confirmDialog';
import ImageDownloadButton from '@/Components/ImageDownloadButton';
import SelectInput from '@/Components/SelectInput';

interface PastorRow {
    id: number;
    name: string;
    bio: string | null;
    photo_path: string | null;
    sort_order: number;
    user_id: number | null;
    /** Utilizadores que podem editar a agenda pastoral deste perfil (além da conta principal). */
    agenda_delegate_user_ids: number[];
    scheduleSummary: string | null;
}

interface LinkableUser {
    id: number;
    label: string;
}

interface Props {
    pastors: PastorRow[];
    canManage: boolean;
    linkableUsers: LinkableUser[];
}

function flashText(v: unknown): string | null {
    return typeof v === 'string' && v.length > 0 ? v : null;
}

export default function PastorsIndex({ pastors, canManage, linkableUsers }: Props) {
    const page = usePage();
    const rawFlash = (page.props as { flash?: { success?: unknown; error?: unknown } }).flash;
    const flashSuccess = flashText(rawFlash?.success);
    const flashError = flashText(rawFlash?.error);
    const appUrl = (page.props as { appUrl?: string }).appUrl ?? '';
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: '',
        bio: '',
        sort_order: 0,
        user_id: '' as string | number,
        agenda_delegate_user_ids: [] as number[],
        photo: null as File | null,
    });

    const openCreateModal = () => {
        setIsEditing(false);
        setEditingId(null);
        reset();
        clearErrors();
        setIsModalOpen(true);
    };

    const openEditModal = (p: PastorRow) => {
        setIsEditing(true);
        setEditingId(p.id);
        setData({
            name: p.name,
            bio: p.bio ?? '',
            sort_order: p.sort_order,
            user_id: p.user_id ?? '',
            agenda_delegate_user_ids: Array.isArray(p.agenda_delegate_user_ids) ? [...p.agenda_delegate_user_ids] : [],
            photo: null,
        });
        clearErrors();
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        reset();
        setEditingId(null);
    };

    const onPhotoChange: ChangeEventHandler<HTMLInputElement> = (e) => {
        const file = e.target.files?.[0] ?? null;
        setData('photo', file);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (isEditing && editingId) {
            if (data.photo) {
                router.post(
                    route('pastors.update', editingId),
                    {
                        _method: 'PUT',
                        name: data.name,
                        bio: data.bio,
                        sort_order: data.sort_order,
                        user_id: data.user_id === '' ? '' : data.user_id,
                        agenda_delegate_user_ids: data.agenda_delegate_user_ids,
                        photo: data.photo,
                    },
                    {
                        forceFormData: true,
                        preserveScroll: true,
                        onSuccess: () => closeModal(),
                    },
                );
            } else {
                put(route('pastors.update', editingId), {
                    preserveScroll: true,
                    onSuccess: () => closeModal(),
                });
            }
        } else {
            post(route('pastors.store'), {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => closeModal(),
            });
        }
    };

    const handleDelete = async (id: number) => {
        const ok = await confirmAction({
            title: 'Remover pastor?',
            text: 'A foto e o texto serão eliminados.',
            confirmButtonText: 'Remover',
            danger: true,
            icon: 'warning',
        });
        if (ok) {
            router.delete(route('pastors.destroy', id));
        }
    };

    return (
        <AdminLayout>
            <Head title="Pastores" />
            <PageHeader title="Pastores">
                {canManage && <AddButton onClick={openCreateModal}>Novo pastor</AddButton>}
            </PageHeader>

            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 max-w-2xl">
                Equipe pastoral da igreja em contexto (foto e texto). A página pública fica em Mais → Nossos pastores. A{' '}
                <span className="font-medium">disponibilidade semanal</span> para «Agendar com pastor» define-se no módulo{' '}
                <span className="font-medium">Agenda pastoral</span> no menu lateral (não neste formulário). Associe a «Conta da
                app» ao pastor e, se quiser, <span className="font-medium">delegados da agenda</span> para outros utilizadores
                poderem editar as mesmas faixas nesse módulo.
            </p>

            {flashSuccess ? (
                <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100">
                    {flashSuccess}
                </div>
            ) : null}
            {flashError ? (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100">
                    {flashError}
                </div>
            ) : null}

            {pastors.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-8 text-center text-zinc-600 dark:text-zinc-400">
                    Nenhum pastor cadastrado.
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {pastors.map((p) => (
                        <div
                            key={p.id}
                            className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-sm flex flex-col"
                        >
                            <div className="flex gap-4">
                                <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0 flex items-center justify-center">
                                    {p.photo_path ? (
                                        <img src={p.photo_path} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <UserCircleIcon className="w-12 h-12 text-zinc-400" />
                                    )}
                                    {p.photo_path ? (
                                        <ImageDownloadButton
                                            src={p.photo_path}
                                            appUrl={appUrl}
                                            filenameBase={`pastor-${p.id}`}
                                            className="absolute bottom-1 right-1 z-10"
                                            size="sm"
                                        />
                                    ) : null}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h2 className="font-semibold text-zinc-900 dark:text-white truncate">{p.name}</h2>
                                    <p className="text-xs text-zinc-500 mt-0.5">Ordem: {p.sort_order}</p>
                                    {p.scheduleSummary ? (
                                        <p className="text-xs text-primary-700 dark:text-primary-300 mt-1 font-medium">
                                            Horários: {p.scheduleSummary}
                                        </p>
                                    ) : (
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Sem faixas na agenda pastoral.</p>
                                    )}
                                    {canManage ? (
                                        <Link
                                            href={route('pastoral-agenda.index', { pastor: p.id })}
                                            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-white dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                                        >
                                            <ClockIcon className="h-3.5 w-3.5" aria-hidden />
                                            Agenda pastoral
                                        </Link>
                                    ) : null}
                                    {p.bio && (
                                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 line-clamp-4 whitespace-pre-wrap">
                                            {p.bio}
                                        </p>
                                    )}
                                </div>
                            </div>
                            {canManage && (
                                <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                                    <button
                                        type="button"
                                        onClick={() => openEditModal(p)}
                                        className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-lg"
                                        title="Editar"
                                    >
                                        <PencilIcon className="w-5 h-5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void handleDelete(p.id)}
                                        className="p-2 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg"
                                        title="Remover"
                                    >
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {canManage && (
                <Modal show={isModalOpen} onClose={closeModal} maxWidth="lg">
                    <form onSubmit={submit} className="p-6 space-y-4">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                            {isEditing ? 'Editar pastor' : 'Novo pastor'}
                        </h2>
                        <div>
                            <InputLabel htmlFor="pastor_name" value="Nome" />
                            <TextInput
                                id="pastor_name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                className="mt-1 block w-full"
                                required
                            />
                            <InputError message={errors.name} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="pastor_bio" value="Texto / biografia" />
                            <Textarea
                                id="pastor_bio"
                                value={data.bio}
                                onChange={(e) => setData('bio', e.target.value)}
                                rows={6}
                                className="mt-1 block w-full"
                            />
                            <InputError message={errors.bio} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="pastor_order" value="Ordem de exibição" />
                            <TextInput
                                id="pastor_order"
                                type="number"
                                min={0}
                                max={9999}
                                value={String(data.sort_order)}
                                onChange={(e) => setData('sort_order', parseInt(e.target.value, 10) || 0)}
                                className="mt-1 block w-full"
                            />
                            <InputError message={errors.sort_order} className="mt-1" />
                        </div>
                        {canManage && linkableUsers.length > 0 ? (
                            <div>
                                <InputLabel htmlFor="pastor_user" value="Conta da app (opcional)" />
                                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                    O pastor acede ao módulo <span className="font-medium">Agenda pastoral</span> no menu lateral do
                                    painel para publicar faixas semanais.
                                </p>
                                <SelectInput
                                    id="pastor_user"
                                    className="mt-1"
                                    value={data.user_id === '' ? '' : String(data.user_id)}
                                    onChange={(e) => {
                                        const v = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                                        const cleared =
                                            typeof v === 'number'
                                                ? data.agenda_delegate_user_ids.filter((id) => id !== v)
                                                : data.agenda_delegate_user_ids;
                                        setData({
                                            ...data,
                                            user_id: v,
                                            agenda_delegate_user_ids: cleared,
                                        });
                                    }}
                                >
                                    <option value="">Nenhuma</option>
                                    {linkableUsers.map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.label}
                                        </option>
                                    ))}
                                </SelectInput>
                                <InputError message={errors.user_id} className="mt-1" />
                            </div>
                        ) : null}
                        {canManage && linkableUsers.length > 0 ? (
                            <div>
                                <InputLabel value="Delegados da agenda (opcional)" />
                                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                    Estes utilizadores podem abrir o módulo <span className="font-medium">Agenda pastoral</span> e
                                    editar as faixas deste perfil.
                                </p>
                                <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-900/50 p-2 space-y-1.5">
                                    {linkableUsers
                                        .filter((u) => u.id !== (typeof data.user_id === 'number' ? data.user_id : -1))
                                        .map((u) => {
                                            const checked = data.agenda_delegate_user_ids.includes(u.id);
                                            return (
                                                <label
                                                    key={u.id}
                                                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-800 dark:text-zinc-200 cursor-pointer hover:bg-white/80 dark:hover:bg-zinc-800/80"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-zinc-300 text-primary-600 focus:ring-primary-500 dark:border-zinc-600 dark:bg-zinc-900"
                                                        checked={checked}
                                                        onChange={() => {
                                                            const next = checked
                                                                ? data.agenda_delegate_user_ids.filter((id) => id !== u.id)
                                                                : [...data.agenda_delegate_user_ids, u.id];
                                                            setData('agenda_delegate_user_ids', next);
                                                        }}
                                                    />
                                                    <span className="min-w-0 truncate">{u.label}</span>
                                                </label>
                                            );
                                        })}
                                </div>
                                <InputError message={(errors as { agenda_delegate_user_ids?: string }).agenda_delegate_user_ids} className="mt-1" />
                            </div>
                        ) : null}
                        <div>
                            <InputLabel
                                htmlFor="pastor_photo"
                                value={isEditing ? 'Nova foto (opcional)' : 'Foto (opcional)'}
                            />
                            <input
                                id="pastor_photo"
                                type="file"
                                accept="image/*"
                                onChange={onPhotoChange}
                                className="mt-1 block w-full text-sm text-zinc-600 dark:text-zinc-400"
                            />
                            <InputError message={errors.photo} className="mt-1" />
                        </div>
                        {isEditing && editingId ? (
                            <div className="rounded-xl border border-dashed border-primary-300/60 bg-primary-50/50 px-3 py-2.5 text-xs text-primary-900 dark:border-primary-800 dark:bg-primary-950/30 dark:text-primary-100">
                                As faixas de disponibilidade semanal editam-se no módulo{' '}
                                <Link
                                    href={route('pastoral-agenda.index', { pastor: editingId })}
                                    className="font-semibold underline underline-offset-2"
                                >
                                    Agenda pastoral
                                </Link>
                                .
                            </div>
                        ) : null}
                        <div className="flex justify-end gap-2 pt-2">
                            <SecondaryButton type="button" onClick={closeModal}>
                                Cancelar
                            </SecondaryButton>
                            <PrimaryButton type="submit" disabled={processing}>
                                {isEditing ? 'Salvar' : 'Criar'}
                            </PrimaryButton>
                        </div>
                    </form>
                </Modal>
            )}
        </AdminLayout>
    );
}
