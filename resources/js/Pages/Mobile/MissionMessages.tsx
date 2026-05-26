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
    isTeamHighlight: boolean;
    createdAt: string | null;
};

type PendingItem = {
    id: number;
    body: string;
    createdAt: string | null;
};

interface Props {
    messages: MessageItem[];
    myPendingMessages: PendingItem[];
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

function messageCardClass(isTeamHighlight: boolean): string {
    if (isTeamHighlight) {
        return 'border-teal-300 bg-gradient-to-br from-teal-50 to-emerald-50/90 shadow-md ring-1 ring-teal-200/90 dark:border-teal-700 dark:from-teal-950/60 dark:to-emerald-950/40 dark:ring-teal-800/50';
    }

    return 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900';
}

export default function MissionMessages({ messages, myPendingMessages, canPost, storeUrl }: Props) {
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
            <Head title="Depoimentos da Missão" />
            <FlashMessages />
            <div className="space-y-6">
                <div>
                    <MissionHubBackLink />
                    <h1 className="mt-3 text-xl font-bold text-zinc-900 dark:text-white">Depoimentos</h1>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        Compartilhe sua experiência com a missão. Mensagens adequadas são publicadas na hora; conteúdo
                        inadequado passa por análise da equipe.
                    </p>
                </div>

                {myPendingMessages.length > 0 ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
                        <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">Seus depoimentos em análise</p>
                        <ul className="mt-3 space-y-3">
                            {myPendingMessages.map((m) => (
                                <li key={m.id} className="text-sm text-amber-950/90 dark:text-amber-100/90">
                                    <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                                    <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-200/80">
                                        Enviado {formatWhen(m.createdAt)} — você será avisado no aplicativo quando for analisado.
                                    </p>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null}

                {canPost ? (
                    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Publicar como {auth?.user?.name ?? 'você'}
                        </p>
                        <Textarea
                            value={data.body}
                            onChange={(e) => setData('body', e.target.value)}
                            rows={3}
                            placeholder="Escreva seu depoimento…"
                            className="w-full"
                        />
                        <InputError message={errors.body} />
                        <PrimaryButton type="submit" disabled={processing || !data.body.trim()}>
                            Publicar depoimento
                        </PrimaryButton>
                    </form>
                ) : (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                        <Link href={route('login')} className="font-semibold underline">
                            Faça login
                        </Link>{' '}
                        para publicar um depoimento na comunidade missionária.
                    </div>
                )}

                {messages.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-200 bg-white py-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
                        <ChatBubbleLeftRightIcon className="mx-auto h-10 w-10 text-zinc-400" />
                        <p className="mt-3 font-medium text-zinc-600 dark:text-zinc-400">Nenhum depoimento ainda</p>
                        <p className="mt-1 text-sm text-zinc-500">Seja o primeiro a compartilhar.</p>
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {messages.map((m) => (
                            <li
                                key={m.id}
                                className={`rounded-2xl border p-4 ${messageCardClass(m.isTeamHighlight)}`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                                        <span
                                            className={`text-sm font-semibold ${
                                                m.isTeamHighlight
                                                    ? 'text-teal-950 dark:text-teal-50'
                                                    : 'text-zinc-900 dark:text-white'
                                            }`}
                                        >
                                            {m.authorName}
                                        </span>
                                        {m.isTeamHighlight ? (
                                            <span className="inline-flex shrink-0 rounded-full bg-teal-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white dark:bg-teal-400 dark:text-teal-950">
                                                Equipe Missão
                                            </span>
                                        ) : null}
                                    </div>
                                    <time className="shrink-0 text-xs text-zinc-500" dateTime={m.createdAt ?? undefined}>
                                        {formatWhen(m.createdAt)}
                                    </time>
                                </div>
                                <p
                                    className={`mt-2 whitespace-pre-wrap text-sm leading-relaxed ${
                                        m.isTeamHighlight
                                            ? 'text-teal-950/95 dark:text-teal-50/95'
                                            : 'text-zinc-700 dark:text-zinc-300'
                                    }`}
                                >
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
