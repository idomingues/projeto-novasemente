import Modal from '@/Components/Modal';
import { Link, usePage } from '@inertiajs/react';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';
import { FormEvent, useEffect, useState } from 'react';

export type PublicationCommentRow = {
    id: number;
    body: string;
    author_name: string;
    author_initial: string;
    is_mine: boolean;
    created_at: string | null;
    created_at_label: string;
};

type Props = {
    show: boolean;
    feedId: string;
    onClose: () => void;
    onCountChange?: (count: number) => void;
};

type PageProps = {
    auth?: { user?: { id: number; name?: string } | null };
    csrf_token?: string;
};

export default function PublicationCommentsSheet({ show, feedId, onClose, onCountChange }: Props) {
    const page = usePage().props as PageProps;
    const user = page.auth?.user ?? null;
    const csrf = page.csrf_token ?? '';
    const [comments, setComments] = useState<PublicationCommentRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [body, setBody] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!show) {
            return;
        }

        let cancelled = false;
        setLoading(true);
        setError(null);

        void (async () => {
            try {
                const response = await fetch(route('mobile.publications.comments.index', { feedId }), {
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    credentials: 'same-origin',
                });
                if (!response.ok) {
                    if (!cancelled) {
                        setError('Não foi possível carregar os comentários.');
                    }
                    return;
                }
                const payload = (await response.json()) as {
                    comments: PublicationCommentRow[];
                    comments_count: number;
                };
                if (!cancelled) {
                    setComments(payload.comments ?? []);
                    onCountChange?.(payload.comments_count ?? 0);
                }
            } catch {
                if (!cancelled) {
                    setError('Não foi possível carregar os comentários.');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when sheet opens / feed changes
    }, [show, feedId]);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!user) {
            window.location.href = route('login');
            return;
        }
        const text = body.trim();
        if (!text || submitting) {
            return;
        }

        setSubmitting(true);
        setError(null);
        try {
            const response = await fetch(route('mobile.publications.comments.store', { feedId }), {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrf,
                },
                credentials: 'same-origin',
                body: JSON.stringify({ body: text }),
            });

            if (response.status === 401) {
                window.location.href = route('login');
                return;
            }

            if (!response.ok) {
                setError('Não foi possível publicar o comentário.');
                return;
            }

            const payload = (await response.json()) as {
                comment: PublicationCommentRow;
                comments_count: number;
            };
            setComments((current) => [...current, payload.comment]);
            setBody('');
            onCountChange?.(payload.comments_count);
        } catch {
            setError('Não foi possível publicar o comentário.');
        } finally {
            setSubmitting(false);
        }
    };

    const removeOwn = async (commentId: number) => {
        if (!user) {
            return;
        }
        try {
            const response = await fetch(route('mobile.publications.comments.destroy', { comment: commentId }), {
                method: 'DELETE',
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrf,
                },
                credentials: 'same-origin',
            });
            if (!response.ok) {
                return;
            }
            const payload = (await response.json()) as { comments_count: number };
            setComments((current) => current.filter((c) => c.id !== commentId));
            onCountChange?.(payload.comments_count);
        } catch {
            // ignore
        }
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="md" disableBodyScroll>
            <div className="flex max-h-[min(85vh,640px)] flex-col">
                <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                    <h2 className="text-center text-sm font-semibold text-zinc-900 dark:text-white">Comentários</h2>
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
                    {loading ? (
                        <p className="text-center text-sm text-zinc-500">Carregando…</p>
                    ) : comments.length === 0 ? (
                        <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                            Ainda não há comentários. Seja o primeiro!
                        </p>
                    ) : (
                        comments.map((c) => (
                            <div key={c.id} className="flex gap-3">
                                <div
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100"
                                    aria-hidden
                                >
                                    {c.author_initial}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm leading-snug text-zinc-800 dark:text-zinc-100">
                                        <span className="font-semibold">{c.author_name}</span>{' '}
                                        <span className="font-normal">{c.body}</span>
                                    </p>
                                    <div className="mt-1 flex items-center gap-3 text-[11px] text-zinc-500">
                                        <span>{c.created_at_label}</span>
                                        {c.is_mine ? (
                                            <button
                                                type="button"
                                                onClick={() => void removeOwn(c.id)}
                                                className="cursor-pointer font-semibold text-zinc-600 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400"
                                            >
                                                Excluir
                                            </button>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                    {error ? <p className="text-center text-sm text-rose-600 dark:text-rose-400">{error}</p> : null}
                </div>

                <div className="border-t border-zinc-200 px-3 py-3 dark:border-zinc-800">
                    {user ? (
                        <form onSubmit={(e) => void submit(e)} className="flex items-center gap-2">
                            <input
                                type="text"
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                maxLength={1000}
                                placeholder="Adicione um comentário…"
                                className="min-w-0 flex-1 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none ring-teal-500/30 placeholder:text-zinc-400 focus:border-teal-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                            />
                            <button
                                type="submit"
                                disabled={submitting || !body.trim()}
                                className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-zinc-900 text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                                aria-label="Publicar comentário"
                            >
                                <PaperAirplaneIcon className="h-4 w-4" aria-hidden />
                            </button>
                        </form>
                    ) : (
                        <p className="text-center text-sm text-zinc-600 dark:text-zinc-300">
                            <Link href={route('login')} className="cursor-pointer font-semibold text-teal-700 dark:text-teal-300">
                                Entre
                            </Link>{' '}
                            para comentar.
                        </p>
                    )}
                </div>
            </div>
        </Modal>
    );
}
