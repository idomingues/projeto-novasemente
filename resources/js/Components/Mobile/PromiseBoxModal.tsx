import Modal from '@/Components/Modal';
import { ArrowPathIcon, ShareIcon, HeartIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { useEffect, useMemo, useRef, useState } from 'react';

type PromiseMode = 'daily' | 'random';

type PromisePayload = {
    id: number;
    livro: string;
    capitulo: number;
    versiculo_inicio: number;
    versiculo_fim: number;
    text: string;
    ref: string;
    categoria: string;
    nota: number;
    peso: number;
    ativo: boolean;
};

type ApiOk = { ok: true; mode: PromiseMode; promise: PromisePayload };
type ApiErr = { ok: false; message?: string };

const FAVORITES_KEY = 'ns:promiseBox:favorites:v1';

function readFavorites(): PromisePayload[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(FAVORITES_KEY);
        if (!raw) return [];
        const arr = JSON.parse(raw) as unknown;
        if (!Array.isArray(arr)) return [];
        return arr.filter(Boolean) as PromisePayload[];
    } catch {
        return [];
    }
}

function writeFavorites(items: PromisePayload[]) {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(items.slice(0, 200)));
    } catch {
        // ignore
    }
}

function buildShareText(p: PromisePayload): string {
    return `${p.text}\n${p.ref}\n\nCaixa de Promessas - Nova Semente APP`;
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function PromiseBoxModal({
    show,
    onClose,
    canFavorite = true,
}: {
    show: boolean;
    onClose: () => void;
    /** Visitantes podem ver e compartilhar; favoritar exige login. */
    canFavorite?: boolean;
}) {
    const lastPromiseIdRef = useRef<number | null>(null);
    const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
    const [promise, setPromise] = useState<PromisePayload | null>(null);
    const [error, setError] = useState('');
    const [anim, setAnim] = useState<'idle' | 'out' | 'in'>('idle');
    const [favorites, setFavorites] = useState<PromisePayload[]>([]);
    const [showFavorites, setShowFavorites] = useState(false);
    const [drawing, setDrawing] = useState(false);

    const favoriteIds = useMemo(() => new Set(favorites.map((f) => f.id)), [favorites]);
    const isFavorited = promise ? favoriteIds.has(promise.id) : false;

    const loadRandom = async () => {
        setStatus('loading');
        setError('');
        try {
            const exclude = lastPromiseIdRef.current;
            const url =
                exclude !== null
                    ? `${route('mobile.promise-box.random')}?exclude=${exclude}`
                    : route('mobile.promise-box.random');
            const res = await fetch(url, { method: 'GET' });
            const data = (await res.json()) as ApiOk | ApiErr;
            if (!res.ok || !data || (data as ApiOk).ok !== true) {
                const msg = (data as ApiErr)?.message || 'Não foi possível carregar a promessa agora. Tente novamente.';
                setStatus('error');
                setPromise(null);
                setError(msg);
                return;
            }
            const ok = data as ApiOk;
            setPromise(ok.promise);
            lastPromiseIdRef.current = ok.promise.id;
            setStatus('idle');
        } catch {
            setStatus('error');
            setPromise(null);
            setError('Não foi possível carregar a promessa agora. Verifique sua conexão e tente novamente.');
        }
    };

    const drawAnother = async () => {
        if (drawing || status === 'loading') return;
        setDrawing(true);
        setShowFavorites(false);
        setAnim('out');
        await sleep(180);
        await loadRandom();
        setAnim('in');
        await sleep(220);
        setAnim('idle');
        setDrawing(false);
    };

    const toggleFavorite = () => {
        if (!promise) return;
        const next = favoriteIds.has(promise.id) ? favorites.filter((f) => f.id !== promise.id) : [promise, ...favorites];
        setFavorites(next);
        writeFavorites(next);
    };

    const share = async () => {
        if (!promise) return;
        const text = buildShareText(promise);
        try {
            if (navigator.share) {
                await navigator.share({ text, title: 'Caixa de Promessas' });
                return;
            }
        } catch {
            // fallback abaixo
        }
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            // ignore
        }
    };

    const handleClose = () => {
        onClose();
        setPromise(null);
        setError('');
        setStatus('idle');
        setAnim('idle');
        setShowFavorites(false);
        setDrawing(false);
    };

    useEffect(() => {
        if (!show) return;
        if (canFavorite) {
            setFavorites(readFavorites());
        } else {
            setFavorites([]);
            setShowFavorites(false);
        }
        loadRandom();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, canFavorite]);

    const cardAnimClass =
        anim === 'out'
            ? 'opacity-0 translate-y-1.5 scale-[0.985]'
            : anim === 'in'
              ? 'opacity-100 translate-y-0 scale-100'
              : 'opacity-100 translate-y-0 scale-100';

    const actionBtnClass =
        'inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-2xl px-3.5 py-2.5 text-xs font-semibold tracking-wide transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60';

    return (
        <Modal
            show={show}
            onClose={handleClose}
            maxWidth="md"
        >
            <div className="relative overflow-hidden px-5 pt-6 pb-1 sm:px-7 sm:pt-7">
                <div
                    className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-brand-400/15 blur-3xl dark:bg-brand-500/10"
                    aria-hidden
                />
                <div
                    className="pointer-events-none absolute -left-8 top-8 h-28 w-28 rounded-full bg-brand-600/8 blur-2xl dark:bg-brand-400/8"
                    aria-hidden
                />

                <div className="relative flex items-start gap-3 pr-8">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md shadow-brand-600/20 ring-1 ring-brand-600/20 dark:from-brand-600 dark:to-brand-800 dark:shadow-brand-950/40 dark:ring-brand-500/20">
                        <SparklesIcon className="h-5 w-5" aria-hidden />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700/80 dark:text-brand-300/90">
                            Para você hoje
                        </p>
                        <h2 className="mt-0.5 text-lg font-bold leading-tight tracking-tight text-zinc-900 dark:text-white">
                            Caixa de Promessas
                        </h2>
                    </div>
                </div>

                <div className="relative mt-4 flex flex-wrap items-center gap-2">
                    {canFavorite && favorites.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setShowFavorites((v) => !v)}
                            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                                showFavorites
                                    ? 'bg-rose-100 text-rose-800 ring-1 ring-rose-200/80 dark:bg-rose-950/50 dark:text-rose-200 dark:ring-rose-900/60'
                                    : 'bg-zinc-100/90 text-zinc-700 ring-1 ring-zinc-200/80 hover:bg-zinc-200/80 dark:bg-zinc-800/80 dark:text-zinc-300 dark:ring-zinc-700/80 dark:hover:bg-zinc-700'
                            }`}
                        >
                            {showFavorites ? (
                                <>
                                    <HeartSolidIcon className="h-3.5 w-3.5" aria-hidden />
                                    Voltar à promessa
                                </>
                            ) : (
                                <>
                                    <HeartSolidIcon className="h-3.5 w-3.5 text-rose-500" aria-hidden />
                                    Minhas favoritas ({favorites.length})
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>

            <div className="px-5 pb-6 pt-4 sm:px-7">
                {canFavorite && showFavorites ? (
                    favorites.length === 0 ? (
                        <div className="rounded-3xl bg-zinc-50/90 px-5 py-6 text-center text-sm text-zinc-600 ring-1 ring-zinc-200/70 dark:bg-zinc-900/50 dark:text-zinc-300 dark:ring-zinc-800">
                            Você ainda não favoritou nenhuma promessa.
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {favorites.slice(0, 30).map((f) => (
                                <li
                                    key={f.id}
                                    className="rounded-3xl bg-gradient-to-b from-white to-brand-50/40 px-5 py-4 shadow-sm ring-1 ring-brand-900/5 dark:from-zinc-900 dark:to-brand-950/30 dark:ring-white/5"
                                >
                                    <p className="text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-100">{f.text}</p>
                                    <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-700/70 dark:text-brand-300/80">
                                        {f.ref}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )
                ) : status === 'loading' && !promise ? (
                    <div className="rounded-3xl bg-gradient-to-b from-white to-brand-50/50 px-5 py-8 shadow-sm ring-1 ring-brand-900/5 dark:from-zinc-900 dark:to-brand-950/40 dark:ring-white/5">
                        <div className="mx-auto mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-brand-100/80 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
                            <SparklesIcon className="h-5 w-5 animate-pulse" aria-hidden />
                        </div>
                        <div className="space-y-2.5">
                            <div className="mx-auto h-3 w-[88%] animate-pulse rounded-full bg-zinc-200/90 dark:bg-zinc-700/80" />
                            <div className="mx-auto h-3 w-[72%] animate-pulse rounded-full bg-zinc-200/80 dark:bg-zinc-700/70" />
                            <div className="mx-auto h-3 w-[64%] animate-pulse rounded-full bg-zinc-200/70 dark:bg-zinc-700/60" />
                        </div>
                        <p className="mt-5 text-center text-xs font-medium tracking-wide text-zinc-500 dark:text-zinc-400">
                            Preparando sua promessa…
                        </p>
                    </div>
                ) : status === 'error' ? (
                    <div className="rounded-3xl bg-rose-50 px-5 py-5 text-sm text-rose-900 ring-1 ring-rose-200/80 dark:bg-rose-950/40 dark:text-rose-100 dark:ring-rose-900/50">
                        <p className="font-semibold">Não foi possível carregar</p>
                        <p className="mt-1 opacity-90">{error || 'Tente novamente.'}</p>
                        <button
                            type="button"
                            onClick={() => void drawAnother()}
                            className={`${actionBtnClass} mt-4 w-full bg-white text-rose-800 ring-1 ring-rose-200 hover:bg-rose-50 dark:bg-rose-950/40 dark:text-rose-100 dark:ring-rose-800/60 dark:hover:bg-rose-950/60`}
                        >
                            <ArrowPathIcon className="h-4 w-4 shrink-0" aria-hidden />
                            Tentar de novo
                        </button>
                    </div>
                ) : promise ? (
                    <div
                        className={`relative overflow-hidden rounded-3xl bg-gradient-to-b from-white via-white to-brand-50/60 px-5 pb-5 pt-6 shadow-[0_12px_40px_-18px_rgba(0,141,54,0.35)] ring-1 ring-brand-900/6 transition-all duration-200 ease-out dark:from-zinc-900 dark:via-zinc-900 dark:to-brand-950/45 dark:shadow-[0_16px_40px_-18px_rgba(0,0,0,0.55)] dark:ring-white/6 ${cardAnimClass}`}
                    >
                        <div
                            className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-brand-400/10 blur-2xl dark:bg-brand-500/10"
                            aria-hidden
                        />
                        <span
                            className="pointer-events-none absolute left-4 top-2 select-none font-serif text-6xl leading-none text-brand-600/15 dark:text-brand-400/20"
                            aria-hidden
                        >
                            “
                        </span>

                        <p className="relative text-[16px] font-medium leading-[1.65] tracking-[-0.01em] text-zinc-900 dark:text-zinc-50">
                            {promise.text}
                        </p>

                        <div className="relative mt-5 flex items-center gap-3">
                            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-brand-600/25 to-transparent dark:via-brand-400/25" />
                            <p className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700/80 dark:text-brand-300/85">
                                {promise.ref}
                            </p>
                            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-brand-600/25 to-transparent dark:via-brand-400/25" />
                        </div>

                        <div className="relative mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <button
                                type="button"
                                onClick={share}
                                disabled={drawing}
                                className={`${actionBtnClass} bg-white/90 text-zinc-700 shadow-sm ring-1 ring-zinc-200/90 hover:bg-zinc-50 hover:text-zinc-900 dark:bg-zinc-950/40 dark:text-zinc-200 dark:ring-zinc-700/80 dark:hover:bg-zinc-800 ${canFavorite ? '' : 'sm:col-span-2'}`}
                            >
                                <ShareIcon className="h-4 w-4 shrink-0" aria-hidden />
                                Compartilhar
                            </button>
                            {canFavorite && (
                                <button
                                    type="button"
                                    onClick={toggleFavorite}
                                    disabled={drawing}
                                    className={`${actionBtnClass} ${
                                        isFavorited
                                            ? 'bg-rose-50 text-rose-700 shadow-sm ring-1 ring-rose-200/90 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-900/60 dark:hover:bg-rose-950/60'
                                            : 'bg-white/90 text-zinc-700 shadow-sm ring-1 ring-zinc-200/90 hover:bg-zinc-50 hover:text-zinc-900 dark:bg-zinc-950/40 dark:text-zinc-200 dark:ring-zinc-700/80 dark:hover:bg-zinc-800'
                                    }`}
                                    aria-pressed={isFavorited}
                                >
                                    {isFavorited ? (
                                        <HeartSolidIcon className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden />
                                    ) : (
                                        <HeartIcon className="h-4 w-4 shrink-0" aria-hidden />
                                    )}
                                    {isFavorited ? 'Favoritada' : 'Favoritar'}
                                </button>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => void drawAnother()}
                            disabled={drawing || status === 'loading'}
                            className={`${actionBtnClass} mt-2 w-full bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-md shadow-brand-600/25 hover:from-brand-700 hover:to-brand-800 dark:from-brand-600 dark:to-brand-700 dark:shadow-brand-950/40 dark:hover:from-brand-500 dark:hover:to-brand-600`}
                        >
                            <ArrowPathIcon className={`h-4 w-4 shrink-0 ${drawing ? 'animate-spin' : ''}`} aria-hidden />
                            {drawing ? 'Abrindo…' : 'Abrir outra promessa'}
                        </button>
                    </div>
                ) : (
                    <div className="rounded-3xl bg-zinc-50/90 px-5 py-6 text-center text-sm text-zinc-600 ring-1 ring-zinc-200/70 dark:bg-zinc-900/50 dark:text-zinc-300 dark:ring-zinc-800">
                        Abra para receber uma promessa.
                    </div>
                )}
            </div>
        </Modal>
    );
}
