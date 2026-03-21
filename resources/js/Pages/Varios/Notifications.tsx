import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { BellAlertIcon, PaperAirplaneIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import FlashMessages from '@/Components/FlashMessages';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import Textarea from '@/Components/Textarea';
import PrimaryButton from '@/Components/PrimaryButton';
import InputError from '@/Components/InputError';
import { FormEventHandler } from 'react';

interface NotificationItem {
    id: string;
    title: string;
    body: string;
    created_at: string;
    author: { name: string } | null;
    href?: string;
    kind?: string;
}

interface Props {
    notifications: NotificationItem[];
    canManage: boolean;
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

export default function VariosNotifications({ notifications, canManage }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        title: '',
        body: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('notifications.store'), {
            onSuccess: () => reset(),
            preserveScroll: true,
        });
    };

    return (
        <AdminLayout>
            <Head title="Notificações" />
            <FlashMessages />
            <div className="space-y-6 sm:space-y-8">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Notificações</h1>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Envie avisos para todos os utilizadores do app. As notificações aparecem no sino e na página de notificações.
                    </p>
                </div>

                {canManage && (
                    <section className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                            <PaperAirplaneIcon className="w-5 h-5 text-primary-500" />
                            Enviar notificação
                        </h2>
                        <form onSubmit={submit} className="space-y-4">
                            <div>
                                <InputLabel htmlFor="notif_title" value="Título" />
                                <TextInput
                                    id="notif_title"
                                    value={data.title}
                                    onChange={(e) => setData('title', e.target.value)}
                                    placeholder="Ex: Novo evento no sábado"
                                    className="mt-1 block w-full"
                                    maxLength={255}
                                />
                                <InputError message={errors.title} className="mt-1" />
                            </div>
                            <div>
                                <InputLabel htmlFor="notif_body" value="Mensagem" />
                                <Textarea
                                    id="notif_body"
                                    value={data.body}
                                    onChange={(e) => setData('body', e.target.value)}
                                    placeholder="Escreva a mensagem que todos verão..."
                                    rows={4}
                                    className="mt-1 block w-full"
                                    maxLength={5000}
                                />
                                <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                                    {data.body.length}/5000
                                </p>
                                <InputError message={errors.body} className="mt-1" />
                            </div>
                            <PrimaryButton type="submit" disabled={processing}>
                                {processing ? 'A enviar...' : 'Enviar para todos'}
                            </PrimaryButton>
                        </form>
                    </section>
                )}

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
                                const card = (
                                    <div className="flex gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/30">
                                            <BellAlertIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-zinc-900 dark:text-white">
                                                {n.title}
                                            </p>
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
                                    return (
                                        <li key={n.id}>
                                            <a href={n.href} className={wrapClass}>
                                                {card}
                                            </a>
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
        </AdminLayout>
    );
}
