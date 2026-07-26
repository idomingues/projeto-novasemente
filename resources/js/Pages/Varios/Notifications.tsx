import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, router, Link } from '@inertiajs/react';
import { notificationLinkHref } from '@/utils/notificationLinkHref';
import { BellAlertIcon, ExclamationTriangleIcon, PaperAirplaneIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import FlashMessages from '@/Components/FlashMessages';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import Textarea from '@/Components/Textarea';
import PrimaryButton from '@/Components/PrimaryButton';
import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import MarkInboxNotificationReadButton from '@/Components/MarkInboxNotificationReadButton';
import DismissNotificationButton from '@/Components/DismissNotificationButton';
import NotificationIntentBadge, {
    notificationIntentIconWrapClass,
    notificationIntentSurfaceClass,
} from '@/Components/NotificationIntentBadge';
import { confirmAction } from '@/utils/confirmDialog';
import SearchableSelect, { type SearchableOption } from '@/Components/SearchableSelect';
import { FormEventHandler, useEffect, useMemo, useState } from 'react';
import { inertiaListModalSave } from '@/utils/inertiaListModalSave';
import { formatNotificationWhen } from '@/utils/formatNotificationWhen';

type NotificationAudience = 'all' | 'user';

interface NotificationItem {
    id: string;
    title: string;
    body: string;
    created_at: string;
    author: { name: string } | null;
    href?: string;
    kind?: string;
    intent?: string;
    inbox_notification_id?: number;
    inbox_unread?: boolean;
    app_notification_id?: number;
    can_remove?: boolean;
    inbox_group_count?: number;
}

interface Props {
    notifications: NotificationItem[];
    canManage: boolean;
    mode?: 'view' | 'manage';
    recipientOptions?: SearchableOption[];
}

function dismissTarget(n: NotificationItem): { kind: 'inbox' | 'app'; id: number } | null {
    if (n.can_remove === false) return null;
    if (n.kind === 'inbox' && typeof n.inbox_notification_id === 'number') {
        return { kind: 'inbox', id: n.inbox_notification_id };
    }
    if (n.kind === 'app') {
        const fromProp = n.app_notification_id;
        if (typeof fromProp === 'number' && fromProp > 0) {
            return { kind: 'app', id: fromProp };
        }
        const raw = (n.id || '').startsWith('app-') ? Number(n.id.slice(4)) : NaN;
        if (Number.isFinite(raw) && raw > 0) {
            return { kind: 'app', id: raw };
        }
    }
    return null;
}

type ViewFolder = 'unread' | 'all';

const viewFolders: { key: ViewFolder; label: string }[] = [
    { key: 'unread', label: 'Não lidas' },
    { key: 'all', label: 'Todas' },
];

/** Só caixa pessoal com read_at nulo — avisos da igreja não entram neste contador. */
function isUnread(n: NotificationItem): boolean {
    return n.kind === 'inbox' && Boolean(n.inbox_unread);
}

/** Uma linha por título (a mais recente), com contagem do grupo. */
function groupUnreadByTitle(items: NotificationItem[]): NotificationItem[] {
    const sorted = [...items].filter(isUnread).sort((a, b) => {
        const ta = new Date(a.created_at).getTime();
        const tb = new Date(b.created_at).getTime();
        return tb - ta;
    });
    const map = new Map<string, NotificationItem>();
    for (const n of sorted) {
        const existing = map.get(n.title);
        if (existing) {
            existing.inbox_group_count = (existing.inbox_group_count ?? 1) + 1;
            continue;
        }
        map.set(n.title, { ...n, inbox_group_count: 1 });
    }
    return Array.from(map.values());
}

export default function VariosNotifications({
    notifications,
    canManage,
    mode = 'view',
    recipientOptions = [],
}: Props) {
    const [createOpen, setCreateOpen] = useState(false);
    const [folder, setFolder] = useState<ViewFolder>('unread');
    const [liveNotifications, setLiveNotifications] = useState(notifications);
    const { data, setData, post, processing, errors, reset, transform } = useForm({
        audience: 'all' as NotificationAudience,
        user_id: '' as number | '',
        title: '',
        body: '',
    });

    useEffect(() => {
        setLiveNotifications(notifications);
    }, [notifications]);

    useEffect(() => {
        const handleItemGone = (event: Event) => {
            const custom = event as CustomEvent<{ kind?: string; recordId?: number }>;
            const kind = custom.detail?.kind;
            const recordId = custom.detail?.recordId;
            if ((kind !== 'inbox' && kind !== 'app') || typeof recordId !== 'number') {
                return;
            }
            setLiveNotifications((prev) =>
                prev.filter((n) => {
                    if (kind === 'inbox') {
                        return n.inbox_notification_id !== recordId;
                    }
                    return n.app_notification_id !== recordId;
                }),
            );
        };
        const handleMarkedRead = (event: Event) => {
            const recordId = (event as CustomEvent<{ recordId?: number }>).detail?.recordId;
            if (typeof recordId !== 'number') return;
            setLiveNotifications((prev) => {
                const hit = prev.find((n) => n.inbox_notification_id === recordId);
                if (!hit) {
                    return prev.map((n) =>
                        n.inbox_notification_id === recordId ? { ...n, inbox_unread: false } : n,
                    );
                }
                return prev.map((n) =>
                    n.kind === 'inbox' && n.title === hit.title ? { ...n, inbox_unread: false } : n,
                );
            });
        };
        window.addEventListener('ns:notification-item-gone', handleItemGone as EventListener);
        window.addEventListener('ns:notification-marked-read', handleMarkedRead as EventListener);
        const handleMarkedAll = () => {
            setLiveNotifications((prev) =>
                prev.map((n) => (n.kind === 'inbox' ? { ...n, inbox_unread: false } : n)),
            );
        };
        window.addEventListener('ns:notifications-marked-all-read', handleMarkedAll);
        return () => {
            window.removeEventListener('ns:notification-item-gone', handleItemGone as EventListener);
            window.removeEventListener('ns:notification-marked-read', handleMarkedRead as EventListener);
            window.removeEventListener('ns:notifications-marked-all-read', handleMarkedAll);
        };
    }, []);

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
        for (const n of liveNotifications) {
            if (n.kind !== 'app') continue;
            const raw = (n.id || '').startsWith('app-') ? n.id.slice(4) : '';
            const id = Number(raw);
            if (Number.isFinite(id) && id > 0) {
                map.set(n.id, id);
            }
        }
        return map;
    }, [liveNotifications]);

    const unreadNotifications = useMemo(
        () => groupUnreadByTitle(liveNotifications),
        [liveNotifications],
    );
    const visible = folder === 'unread' ? unreadNotifications : liveNotifications;

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
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                            Notificações
                        </h2>
                        <div className="flex flex-wrap gap-1.5">
                            {viewFolders.map((f) => {
                                const count =
                                    f.key === 'unread'
                                        ? unreadNotifications.length
                                        : liveNotifications.length;
                                return (
                                    <button
                                        key={f.key}
                                        type="button"
                                        onClick={() => setFolder(f.key)}
                                        className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                                            folder === f.key
                                                ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100'
                                                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                                        }`}
                                    >
                                        {f.label}
                                        <span className="ml-1.5 tabular-nums opacity-80">{count}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    {visible.length === 0 ? (
                        <div className="rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 p-12 text-center">
                            <BellAlertIcon className="w-14 h-14 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
                            <p className="text-zinc-600 dark:text-zinc-400 font-medium">
                                {folder === 'unread'
                                    ? liveNotifications.length > 0
                                        ? 'Nenhuma não lida'
                                        : 'Nenhuma notificação ainda'
                                    : 'Nenhuma notificação'}
                            </p>
                            <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-1">
                                {folder === 'unread'
                                    ? liveNotifications.length > 0
                                        ? 'Você já leu os avisos pessoais. Abra Todas para ver o histórico e os avisos da igreja.'
                                        : canManage
                                          ? 'Envie a primeira notificação usando o botão +.'
                                          : 'As notificações aparecerão aqui.'
                                    : canManage
                                      ? 'Envie a primeira notificação usando o botão +.'
                                      : 'As notificações aparecerão aqui.'}
                            </p>
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {visible.map((n) => {
                                const canAdminDelete = canCreate && n.kind === 'app' && appNotificationIds.has(n.id);
                                const removeTarget = dismissTarget(n);
                                const inboxId = n.inbox_notification_id;
                                const showMark =
                                    n.kind === 'inbox' && n.inbox_unread && typeof inboxId === 'number';
                                // Check «já vi» só para avisos da igreja; inbox usa marcar como lida.
                                const showSeen = removeTarget?.kind === 'app';
                                const hasSideActions = Boolean(showMark || showSeen || canAdminDelete);

                                const body = (
                                    <div className="flex gap-3">
                                        <div
                                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${notificationIntentIconWrapClass(n.intent)}`}
                                        >
                                            {n.intent === 'action' ? (
                                                <ExclamationTriangleIcon className="h-5 w-5" />
                                            ) : (
                                                <BellAlertIcon className="h-5 w-5" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="mb-1.5">
                                                <NotificationIntentBadge intent={n.intent} />
                                            </div>
                                            <p
                                                className={`font-semibold ${
                                                    n.intent === 'action'
                                                        ? 'text-amber-950 dark:text-amber-50'
                                                        : 'text-zinc-900 dark:text-white'
                                                }`}
                                            >
                                                {n.title}
                                                {folder === 'unread' &&
                                                typeof n.inbox_group_count === 'number' &&
                                                n.inbox_group_count > 1 ? (
                                                    <span className="ml-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                                                        · {n.inbox_group_count}
                                                    </span>
                                                ) : null}
                                            </p>
                                            <p
                                                className={`mt-0.5 line-clamp-2 text-sm ${
                                                    n.intent === 'action'
                                                        ? 'text-amber-950/85 dark:text-amber-100/85'
                                                        : 'text-zinc-600 dark:text-zinc-400'
                                                }`}
                                            >
                                                {n.body}
                                            </p>
                                            <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                                                {formatNotificationWhen(n.created_at)}
                                                {n.author?.name && ` · ${n.author.name}`}
                                                {n.kind === 'inbox' && ' · Pessoal'}
                                            </p>
                                        </div>
                                    </div>
                                );

                                const sideActions = hasSideActions ? (
                                    <div className="flex shrink-0">
                                        {showMark ? (
                                            <MarkInboxNotificationReadButton notificationId={inboxId} />
                                        ) : null}
                                        {showSeen && removeTarget ? (
                                            <DismissNotificationButton
                                                kind="app"
                                                recordId={removeTarget.id}
                                                appearance="seen"
                                            />
                                        ) : null}
                                        {canAdminDelete ? (
                                            <button
                                                type="button"
                                                onClick={() => void onDelete(n)}
                                                title="Excluir para todos"
                                                aria-label="Excluir notificação para todos"
                                                className="flex shrink-0 cursor-pointer items-center justify-center self-stretch border-l border-zinc-100 px-2.5 text-zinc-400 transition hover:bg-red-50 hover:text-red-600 dark:border-zinc-800 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                                            >
                                                <TrashIcon className="h-5 w-5" aria-hidden />
                                            </button>
                                        ) : null}
                                    </div>
                                ) : null;

                                return (
                                    <li key={n.id}>
                                        <div
                                            className={`flex overflow-hidden rounded-xl border shadow-sm transition-colors ${notificationIntentSurfaceClass(
                                                n.intent,
                                                Boolean(n.kind === 'inbox' && n.inbox_unread),
                                            )} ${
                                                n.intent === 'action'
                                                    ? 'ring-1 ring-amber-300/60 dark:ring-amber-700/50'
                                                    : 'hover:border-zinc-300 dark:hover:border-zinc-700'
                                            }`}
                                        >
                                            {n.href ? (
                                                <Link
                                                    href={notificationLinkHref(n.href)}
                                                    className="min-w-0 flex-1 cursor-pointer p-4 text-left transition-colors hover:brightness-[0.98] dark:hover:brightness-110"
                                                >
                                                    {body}
                                                </Link>
                                            ) : (
                                                <div className="min-w-0 flex-1 p-4">{body}</div>
                                            )}
                                            {sideActions}
                                        </div>
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
