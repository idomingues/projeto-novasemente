import Modal from '@/Components/Modal';
import { ShareIcon, HeartIcon } from '@heroicons/react/24/outline';
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
            ? 'opacity-0 translate-y-1'
            : anim === 'in'
              ? 'opacity-100 translate-y-0'
              : 'opacity-100 translate-y-0';

    return (
        <Modal
            show={show}
            onClose={handleClose}
            maxWidth="md"
            footer={
                <button
                    type="button"
                    onClick={handleClose}
                    className="inline-flex w-full min-h-[44px] cursor-pointer items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 active:scale-[0.99] dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                >
                    Fechar
                </button>
            }
        >
            <div className="px-5 pt-6 pb-2 sm:px-7 sm:pt-7">
                <h2 className="text-lg font-bold leading-tight tracking-tight text-zinc-900 dark:text-white">Caixa de Promessas</h2>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                    {canFavorite && favorites.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setShowFavorites((v) => !v)}
                            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                                showFavorites
                                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200'
                                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
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

            <div className="px-5 pb-6 sm:px-7">
                {canFavorite && showFavorites ? (
                    favorites.length === 0 ? (
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
                            Você ainda não favoritou nenhuma promessa.
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {favorites.slice(0, 30).map((f) => (
                                <li key={f.id} className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                                    <p className="text-sm leading-relaxed text-zinc-900 dark:text-zinc-50">{f.text}</p>
                                    <p className="mt-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">{f.ref}</p>
                                </li>
                            ))}
                        </ul>
                    )
                ) : status === 'loading' ? (
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
                        Carregando promessa…
                    </div>
                ) : status === 'error' ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-100">
                        <p className="font-semibold">Não foi possível carregar</p>
                        <p className="mt-1 opacity-90">{error || 'Tente novamente.'}</p>
                    </div>
                ) : promise ? (
                    <div
                        className={`rounded-2xl border border-zinc-200 bg-gradient-to-b from-white to-zinc-50/80 p-5 shadow-sm transition-all duration-200 ease-out dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-900/60 ${cardAnimClass}`}
                    >
                        <p className="text-[15px] leading-relaxed text-zinc-900 dark:text-zinc-50">{promise.text}</p>
                        <p className="mt-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400">{promise.ref}</p>

                        <div className="mt-5 flex items-center justify-center gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                            <button
                                type="button"
                                onClick={share}
                                className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs font-semibold text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 active:scale-[0.99] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 ${canFavorite ? 'flex-1' : 'w-full'}`}
                            >
                                <ShareIcon className="h-4 w-4 shrink-0" aria-hidden />
                                Compartilhar
                            </button>
                            {canFavorite && (
                                <button
                                    type="button"
                                    onClick={toggleFavorite}
                                    className={`inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors active:scale-[0.99] ${
                                        isFavorited
                                            ? 'border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200'
                                            : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-800'
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
                    </div>
                ) : (
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
                        Abra para receber uma promessa.
                    </div>
                )}
            </div>
        </Modal>
    );
}
