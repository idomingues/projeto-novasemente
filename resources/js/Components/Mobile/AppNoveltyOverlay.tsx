import { SparklesIcon } from '@heroicons/react/24/outline';
import { router, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';

export type PendingAppNoveltyPayload = {
    id: number;
    title: string;
    body: string;
    module_key: string;
    module_label: string;
    href: string;
};

type Props = {
    novelty: PendingAppNoveltyPayload;
};

type PageProps = {
    csrf_token?: string;
};

export default function AppNoveltyOverlay({ novelty }: Props) {
    const csrf = (usePage().props as PageProps).csrf_token ?? '';
    const [visible, setVisible] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        const frame = window.requestAnimationFrame(() => setVisible(true));
        return () => window.cancelAnimationFrame(frame);
    }, [novelty.id]);

    const dismissOnServer = useCallback(async () => {
        const url = route('mobile.app-novelties.dismiss', novelty.id);
        try {
            await fetch(url, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrf,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({}),
            });
        } catch {
            // Overlay já some; se o descarte falhar, a novidade pode reaparecer na próxima visita.
        }
    }, [csrf, novelty.id]);

    const dismiss = useCallback(async () => {
        if (busy) {
            return;
        }
        setBusy(true);
        setVisible(false);
        await dismissOnServer();
    }, [busy, dismissOnServer]);

    const seeNow = useCallback(async () => {
        if (busy) {
            return;
        }
        setBusy(true);
        setVisible(false);
        await dismissOnServer();
        router.visit(novelty.href);
    }, [busy, dismissOnServer, novelty.href]);

    useEffect(() => {
        if (!visible) {
            return;
        }
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                void dismiss();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [dismiss, visible]);

    if (!visible) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] pt-[calc(1.25rem+env(safe-area-inset-top,0px))] sm:items-center sm:pb-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-novelty-title"
            aria-describedby="app-novelty-body"
        >
            <button
                type="button"
                className="absolute inset-0 cursor-pointer bg-zinc-950/40 backdrop-blur-[2px] dark:bg-black/50"
                aria-label="Agora não"
                onClick={() => void dismiss()}
            />

            <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200/90 dark:bg-zinc-900 dark:ring-zinc-700">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-800 dark:bg-teal-950/50 dark:text-teal-200">
                        <SparklesIcon className="h-5 w-5" aria-hidden strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                Novidade
                            </span>
                            <span className="truncate text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                                {novelty.module_label}
                            </span>
                        </div>
                        <h2
                            id="app-novelty-title"
                            className="mt-1.5 text-[17px] font-semibold leading-snug tracking-tight text-zinc-900 dark:text-zinc-50"
                        >
                            {novelty.title}
                        </h2>
                        <p
                            id="app-novelty-body"
                            className="mt-1.5 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-300"
                        >
                            {novelty.body}
                        </p>
                    </div>
                </div>

                <div className="mt-5 flex gap-2">
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => void dismiss()}
                        className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                        Agora não
                    </button>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => void seeNow()}
                        className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center rounded-xl bg-zinc-900 px-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                    >
                        Ver agora
                    </button>
                </div>
            </div>
        </div>
    );
}
