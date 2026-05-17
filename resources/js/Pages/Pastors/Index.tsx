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
import { useState, useEffect, FormEventHandler, ChangeEventHandler } from 'react';
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
    /** Email da conta da app associada (quando existe). */
    linked_user_email: string | null;
    /** Usuários que podem editar a agenda pastoral deste perfil (além da conta principal). */
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
    /** Foto já guardada ao abrir edição (para pré-visualização quando não há arquivo novo). */
    const [savedPhotoUrl, setSavedPhotoUrl] = useState<string | null>(null);
    const [photoObjectUrl, setPhotoObjectUrl] = useState<string | null>(null);

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
        setSavedPhotoUrl(null);
        reset();
        clearErrors();
        setIsModalOpen(true);
    };

    const openEditModal = (p: PastorRow) => {
        setIsEditing(true);
        setEditingId(p.id);
        setSavedPhotoUrl(p.photo_path);
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
        setSavedPhotoUrl(null);
    };

    useEffect(() => {
        if (!data.photo) {
            setPhotoObjectUrl(null);
            return;
        }
        const url = URL.createObjectURL(data.photo);
        setPhotoObjectUrl(url);
        return () => {
            URL.revokeObjectURL(url);
        };
    }, [data.photo]);

    const photoPreviewSrc = photoObjectUrl ?? savedPhotoUrl ?? null;

    const onPhotoChange: ChangeEventHandler<HTMLInputElement> = (e) => {
        const file = e.target.files?.[0] ?? null;
        setData('photo', file);
    };

    const clearPickedPhotoFile = () => {
        setData('photo', null);
        const el = document.getElementById('pastor_photo') as HTMLInputElement | null;
        if (el) el.value = '';
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
            <PageHeader
                title="Pastores"
                actions={
                    canManage ? (
                        <AddButton variant="icon" onClick={openCreateModal} title="Novo pastor">
                            Novo pastor
                        </AddButton>
                    ) : undefined
                }
                subtitle={
                    <>
                        Equipe pastoral da igreja em contexto (foto e texto). A página pública fica em Mais → Nossos pastores. A{' '}
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">disponibilidade semanal</span> para «Agendar com pastor» define-se no módulo{' '}
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">Agenda pastoral</span> no menu lateral (não neste formulário). Associe a «Conta da app» ao pastor e, se quiser,{' '}
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">delegados da agenda</span> para outros usuários poderem editar as mesmas faixas nesse módulo.
                    </>
                }
            />

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
                                    {p.linked_user_email ? (
                                        <p
                                            className="mt-1 truncate text-xs text-zinc-600 dark:text-zinc-300"
                                            title={p.linked_user_email}
                                        >
                                            <span className="font-medium text-zinc-500 dark:text-zinc-400">Conta: </span>
                                            {p.linked_user_email}
                                        </p>
                                    ) : (
                                        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">Sem conta da app associada.</p>
                                    )}
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
                <Modal show={isModalOpen} onClose={closeModal} maxWidth="lg" disableBodyScroll>
                    <div className="flex max-h-[min(92dvh,calc(100dvh-1rem))] min-h-0 flex-col bg-white dark:bg-zinc-900">
                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-3 pt-10 sm:px-6 sm:pb-4 sm:pt-11">
                            <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white sm:text-xl pr-8">
                                {isEditing ? 'Editar pastor' : 'Novo pastor'}
                            </h2>
                            <form id="pastors-modal-form" onSubmit={submit} className="space-y-4">
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
                            <InputLabel htmlFor="pastor_photo" value="Foto (opcional)" />
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                Aparece neste cartão e na página pública (Mais → Nossos pastores). Formatos: JPG ou PNG, até 4&nbsp;MB.
                            </p>
                            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                                <div className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800">
                                    {photoPreviewSrc ? (
                                        <img src={photoPreviewSrc} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                        <UserCircleIcon className="h-16 w-16 text-zinc-400" aria-hidden />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1 space-y-2">
                                    <input
                                        id="pastor_photo"
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,image/gif"
                                        onChange={onPhotoChange}
                                        className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-200 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-800 hover:file:bg-zinc-300 dark:text-zinc-400 dark:file:bg-zinc-700 dark:file:text-zinc-100 dark:hover:file:bg-zinc-600"
                                    />
                                    {data.photo ? (
                                        <button
                                            type="button"
                                            onClick={clearPickedPhotoFile}
                                            className="text-xs font-medium text-zinc-600 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                                        >
                                            Desfazer arquivo novo (mantém a foto já guardada)
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                            <InputError message={errors.photo} className="mt-1" />
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
                                    Estes usuários podem abrir o módulo <span className="font-medium">Agenda pastoral</span> e
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
                            </form>
                        </div>
                        <div className="shrink-0 border-t border-zinc-100 bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] dark:border-zinc-800 dark:bg-zinc-900 sm:px-6">
                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <SecondaryButton type="button" onClick={closeModal} className="justify-center sm:w-auto">
                                    Cancelar
                                </SecondaryButton>
                                <PrimaryButton
                                    type="submit"
                                    form="pastors-modal-form"
                                    disabled={processing}
                                    className="justify-center sm:w-auto"
                                >
                                    {isEditing ? 'Salvar' : 'Criar'}
                                </PrimaryButton>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </AdminLayout>
    );
}
