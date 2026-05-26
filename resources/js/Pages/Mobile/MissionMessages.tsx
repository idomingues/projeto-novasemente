import MobileLayout from '@/Layouts/MobileLayout';
import MissionHubBackLink from '@/Components/Mission/MissionHubBackLink';
import PrimaryButton from '@/Components/PrimaryButton';
import Textarea from '@/Components/Textarea';
import InputError from '@/Components/InputError';
import FlashMessages from '@/Components/FlashMessages';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

type MessageItem = {
    id: number;
    body: string;
    authorName: string;
    authorPhotoUrl: string | null;
    createdAt: string | null;
};

interface Props {
    messages: MessageItem[];
    canPost: boolean;
    storeUrl: string;
}

function formatWhen(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function MissionMessages({ messages, canPost, storeUrl }: Props) {
    const { auth } = usePage().props as { auth?: { user?: { name: string } | null } };
    const { data, setData, post, processing, errors, reset } = useForm({ body: '' });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(storeUrl, {
            preserveScroll: true,
            onSuccess: () => reset('body'),
        });
    };

    return (
        <MobileLayout>
            <Head title="Recados da Missão" />
            <FlashMessages />
            <div className="space-y-6">
                <div>
                    <MissionHubBackLink />
                    <h1 className="mt-3 text-xl font-bold text-zinc-900 dark:text-white">Recados</h1>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        Espaço aberto para a comunidade e a liderança compartilharem mensagens.
                    </p>
                </div>

                {canPost ? (
                    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Publicar como {auth?.user?.name ?? 'você'}
                        </p>
                        <Textarea
                            value={data.body}
                            onChange={(e) => setData('body', e.target.value)}
                            rows={3}
                            placeholder="Escreva seu recado…"
                            className="w-full"
                        />
                        <InputError message={errors.body} />
                        <PrimaryButton type="submit" disabled={processing || !data.body.trim()}>
                            Publicar recado
                        </PrimaryButton>
                    </form>
                ) : (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                        <Link href={route('login')} className="font-semibold underline">
                            Faça login
                        </Link>{' '}
                        para publicar um recado na comunidade missionária.
                    </div>
                )}

                {messages.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-200 bg-white py-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
                        <ChatBubbleLeftRightIcon className="mx-auto h-10 w-10 text-zinc-400" />
                        <p className="mt-3 font-medium text-zinc-600 dark:text-zinc-400">Nenhum recado ainda</p>
                        <p className="mt-1 text-sm text-zinc-500">Seja o primeiro a compartilhar uma mensagem.</p>
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {messages.map((m) => (
                            <li
                                key={m.id}
                                className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-semibold text-zinc-900 dark:text-white">{m.authorName}</span>
                                    <time className="text-xs text-zinc-500" dateTime={m.createdAt ?? undefined}>
                                        {formatWhen(m.createdAt)}
                                    </time>
                                </div>
                                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                                    {m.body}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </MobileLayout>
    );
}
