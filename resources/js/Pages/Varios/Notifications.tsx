import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, router, Link } from '@inertiajs/react';
import { notificationLinkHref } from '@/utils/notificationLinkHref';
import { BellAlertIcon, PaperAirplaneIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import FlashMessages from '@/Components/FlashMessages';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import Textarea from '@/Components/Textarea';
import PrimaryButton from '@/Components/PrimaryButton';
import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import MarkInboxNotificationReadButton from '@/Components/MarkInboxNotificationReadButton';
import { confirmAction } from '@/utils/confirmDialog';
import SearchableSelect, { type SearchableOption } from '@/Components/SearchableSelect';
import { FormEventHandler, useMemo, useState } from 'react';
import { inertiaListModalSave } from '@/utils/inertiaListModalSave';

type NotificationAudience = 'all' | 'user';

interface NotificationItem {
    id: string;
    title: string;
    body: string;
    created_at: string;
    author: { name: string } | null;
    href?: string;
    kind?: string;
    inbox_notification_id?: number;
    inbox_unread?: boolean;
}

interface Props {
    notifications: NotificationItem[];
    canManage: boolean;
    mode?: 'view' | 'manage';
    recipientOptions?: SearchableOption[];
}

function formatTimeAgo(iso: string): string {
    const date = new Date(iso);
    const now = new Date();
    const sec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (sec < 60) return 'Agora';
    if (sec < 3600) return `${Math.floor(sec / 60)} min`;
    if (sec < 86400) return `${Math.floor(sec / 3600)} h`;
    if (sec < 2592000) return `${Math.floor(sec / 86400)} dias`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function VariosNotifications({
    notifications,
    canManage,
    mode = 'view',
    recipientOptions = [],
}: Props) {
    const [createOpen, setCreateOpen] = useState(false);
    const { data, setData, post, processing, errors, reset, transform } = useForm({
        audience: 'all' as NotificationAudience,
        user_id: '' as number | '',
        title: '',
        body: '',
    });

    transform((form) => ({
        ...form,
        user_id: form.audience === 'user' ? form.user_id : null,
    }));

    const canCreate = canManage && mode === 'manage';
    const isSingleUser = data.audience === 'user';
    const selectedRecipient = recipientOptions.find((o) => o.id === data.user_id);

    const closeCreateModal = () => {
        setCreateOpen(false);
        reset();
    };

    const appNotificationIds = useMemo(() => {
        const map = new Map<string, number>();
        for (const n of notifications) {
            if (n.kind !== 'app') continue;
            const raw = (n.id || '').startsWith('app-') ? n.id.slice(4) : '';
            const id = Number(raw);
            if (Number.isFinite(id) && id > 0) {
                map.set(n.id, id);
            }
        }
        return map;
    }, [notifications]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('notifications.store'), {
            ...inertiaListModalSave,
            onSuccess: () => {
                reset();
            },
        });
    };

    const onDelete = async (n: NotificationItem) => {
        const appId = appNotificationIds.get(n.id);
        if (!appId) return;

        const ok = await confirmAction({
            title: 'Excluir notificação?',
            text: 'Esta ação não pode ser desfeita.',
            icon: 'warning',
            danger: true,
            confirmButtonText: 'Excluir',
            cancelButtonText: 'Cancelar',
        });
        if (!ok) return;

        router.delete(route('notifications.destroy', { notification: appId }), {
            preserveScroll: true,
        });
    };

    return (
        <AdminLayout>
            <Head title="Notificações" />
            <FlashMessages />
            <div className="space-y-6 sm:space-y-8">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Notificações</h1>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            Veja avisos da igreja e da sua conta.
                        </p>
                    </div>

                    {canCreate && (
                        <button
                            type="button"
                            onClick={() => setCreateOpen(true)}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900 text-white shadow-sm ring-1 ring-inset ring-white/10 transition hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-100"
                            aria-label="Enviar notificação"
                            title="Enviar notificação"
                        >
                            <PlusIcon className="h-6 w-6" strokeWidth={2.2} aria-hidden />
                        </button>
                    )}
                </div>

                <section>
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                        Notificações enviadas
                    </h2>
                    {notifications.length === 0 ? (
                        <div className="rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 p-12 text-center">
                            <BellAlertIcon className="w-14 h-14 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
                            <p className="text-zinc-600 dark:text-zinc-400 font-medium">Nenhuma notificação ainda</p>
                            <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-1">
                                {canManage ? 'Envie a primeira notificação usando o formulário acima.' : 'As notificações enviadas aparecerão aqui.'}
                            </p>
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {notifications.map((n) => {
                                const canDelete = canCreate && n.kind === 'app' && appNotificationIds.has(n.id);
                                const card = (
                                    <div className="flex gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/30">
                                            <BellAlertIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-3">
                                                <p className="font-semibold text-zinc-900 dark:text-white">
                                                    {n.title}
                                                </p>
                                                {canDelete && (
                                                    <button
                                                        type="button"
                                                        onClick={() => void onDelete(n)}
                                                        className="shrink-0 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                        Excluir
                                                    </button>
                                                )}
                                            </div>
                                            <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                                                {n.body}
                                            </p>
                                            <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                                                {formatTimeAgo(n.created_at)}
                                                {n.author?.name && ` · ${n.author.name}`}
                                                {n.kind === 'inbox' && ' · Pessoal'}
                                            </p>
                                        </div>
                                    </div>
                                );
                                const wrapClass =
                                    'rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors block';
                                if (n.kind === 'inbox' && n.href) {
                                    const inboxId = n.inbox_notification_id;
                                    const showMark = n.inbox_unread && typeof inboxId === 'number';
                                    return (
                                        <li key={n.id}>
                                            <div className="flex overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700">
                                                <Link
                                                    href={notificationLinkHref(n.href)}
                                                    className="min-w-0 flex-1 p-4 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                                                >
                                                    {card}
                                                </Link>
                                                {showMark ? (
                                                    <MarkInboxNotificationReadButton notificationId={inboxId} />
                                                ) : null}
                                            </div>
                                        </li>
                                    );
                                }
                                return (
                                    <li key={n.id} className={wrapClass}>
                                        {card}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>
            </div>

            <Modal show={createOpen} onClose={closeCreateModal} maxWidth="2xl">
                <div className="p-6 sm:p-8">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1 flex items-center gap-2">
                        <PaperAirplaneIcon className="w-5 h-5 text-primary-500" />
                        Enviar notificação
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                        {isSingleUser
                            ? 'Envie um aviso pessoal para um usuário do app.'
                            : 'Envie um aviso para todos os usuários do app.'}
                    </p>

                    <form onSubmit={submit} className="space-y-4">
                        <fieldset className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-800/40 p-4 space-y-3">
                            <legend className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 px-1">
                                Destinatários
                            </legend>
                            <label className="flex items-start gap-3 text-sm text-zinc-700 dark:text-zinc-200 cursor-pointer rounded-xl p-2 -m-1 hover:bg-white/60 dark:hover:bg-zinc-900/40 transition-colors">
                                <input
                                    type="radio"
                                    name="notif_audience"
                                    className="mt-0.5 h-4 w-4 shrink-0 border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:focus:ring-white"
                                    checked={data.audience === 'all'}
                                    onChange={() => {
                                        setData((prev) => ({
                                            ...prev,
                                            audience: 'all',
                                            user_id: '',
                                        }));
                                    }}
                                />
                                <span className="leading-snug">
                                    <span className="font-medium text-zinc-900 dark:text-white">Todos os usuários</span>
                                    <span className="block text-zinc-500 dark:text-zinc-400 mt-0.5">
                                        Aparece na lista geral de notificações do app.
                                    </span>
                                </span>
                            </label>
                            <label className="flex items-start gap-3 text-sm text-zinc-700 dark:text-zinc-200 cursor-pointer rounded-xl p-2 -m-1 hover:bg-white/60 dark:hover:bg-zinc-900/40 transition-colors">
                                <input
                                    type="radio"
                                    name="notif_audience"
                                    className="mt-0.5 h-4 w-4 shrink-0 border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:focus:ring-white"
                                    checked={data.audience === 'user'}
                                    onChange={() => setData('audience', 'user')}
                                />
                                <span className="leading-snug">
                                    <span className="font-medium text-zinc-900 dark:text-white">Um usuário</span>
                                    <span className="block text-zinc-500 dark:text-zinc-400 mt-0.5">
                                        Notificação pessoal na caixa de entrada do usuário.
                                    </span>
                                </span>
                            </label>
                        </fieldset>

                        {isSingleUser && (
                            <SearchableSelect
                                id="notif_user"
                                label="Usuário"
                                value={data.user_id}
                                onChange={(value) => setData('user_id', value === '' ? '' : Number(value))}
                                options={recipientOptions}
                                placeholder="Buscar por nome ou e-mail..."
                                error={errors.user_id}
                            />
                        )}

                        <div>
                            <InputLabel htmlFor="notif_title" value="Título" />
                            <TextInput
                                id="notif_title"
                                value={data.title}
                                onChange={(e) => setData('title', e.target.value)}
                                placeholder="Ex: Novo evento no sábado"
                                className="mt-1 block w-full"
                                maxLength={255}
                                autoFocus={!isSingleUser}
                            />
                            <InputError message={errors.title} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="notif_body" value="Mensagem" />
                            <Textarea
                                id="notif_body"
                                value={data.body}
                                onChange={(e) => setData('body', e.target.value)}
                                placeholder={
                                    isSingleUser
                                        ? 'Escreva a mensagem que este usuário verá...'
                                        : 'Escreva a mensagem que todos verão...'
                                }
                                rows={5}
                                className="mt-1 block w-full"
                                maxLength={5000}
                                autoFocus={isSingleUser}
                            />
                            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                                {data.body.length}/5000
                            </p>
                            <InputError message={errors.body} className="mt-1" />
                        </div>

                        <div className="pt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <SecondaryButton type="button" onClick={closeCreateModal} disabled={processing}>
                                Cancelar
                            </SecondaryButton>
                            <PrimaryButton
                                type="submit"
                                disabled={
                                    processing || (isSingleUser && (data.user_id === '' || recipientOptions.length === 0))
                                }
                            >
                                {processing
                                    ? 'A enviar...'
                                    : isSingleUser
                                      ? selectedRecipient
                                          ? `Enviar para ${selectedRecipient.name.split(' (')[0]}`
                                          : 'Enviar para usuário'
                                      : 'Enviar para todos'}
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </Modal>
        </AdminLayout>
    );
}
