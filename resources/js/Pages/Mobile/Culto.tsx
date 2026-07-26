import MobileLayout from '@/Layouts/MobileLayout';
import VideoPlayOverlay from '@/Components/News/VideoPlayOverlay';
import { Head, Link } from '@inertiajs/react';
import { FilmIcon } from '@heroicons/react/24/outline';
import { useEffect } from 'react';
import type React from 'react';

interface CultoItem {
    id: number;
    title: string;
    youtube_url: string;
    youtube_embed_url: string | null;
    youtube_thumb_url: string | null;
    published_at: string | null;
}

/** Cartão fixo «AO VIVO» (URL configurada na igreja). */
interface LiveCultoItem {
    title: string;
    youtube_url: string;
    youtube_embed_url: string | null;
    youtube_thumb_url: string | null;
}

interface Props {
    cultos: CultoItem[];
    liveCulto?: LiveCultoItem | null;
    showPostRegistrationBanner?: boolean;
}

function formatDate(iso: string | null): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

function CultoVideoCard({
    id,
    title,
    youtube_url,
    youtube_thumb_url,
    published_at,
    isLive,
}: Pick<CultoItem, 'id' | 'title' | 'youtube_url' | 'youtube_thumb_url' | 'published_at'> & { isLive?: boolean }) {
    const Wrapper = ({ children }: { children: React.ReactNode }) =>
        isLive ? (
            <a href={youtube_url} target="_blank" rel="noopener noreferrer" className="group block cursor-pointer">
                {children}
            </a>
        ) : (
            <Link href={route('mobile.culto.show', id)} className="group block cursor-pointer">
                {children}
            </Link>
        );

    return (
        <li
            className={`rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border shadow-sm hover:shadow-md active:scale-[0.99] transition-all ${
                isLive
                    ? 'border-rose-400 ring-2 ring-rose-500/40 dark:border-rose-700 dark:ring-rose-600/30'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
            }`}
        >
            <Wrapper>
                {youtube_thumb_url ? (
                    <div className="relative aspect-video overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                        <img src={youtube_thumb_url} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
                        <VideoPlayOverlay alwaysVisible />
                        {isLive ? (
                            <span className="absolute top-2 left-2 rounded-md bg-rose-600 px-2 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-md">
                                AO VIVO
                            </span>
                        ) : null}
                        {!isLive && published_at ? (
                            <span className="absolute bottom-2 left-3 rounded-lg bg-black/55 px-2.5 py-1 text-xs font-medium text-white/95 backdrop-blur-sm">
                                {formatDate(published_at)}
                            </span>
                        ) : null}
                    </div>
                ) : (
                    <div className="relative flex aspect-video items-center justify-center bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800">
                        <FilmIcon className="h-12 w-12 text-zinc-400 dark:text-zinc-500" />
                        {isLive ? (
                            <span className="absolute top-2 left-2 rounded-md bg-rose-600 px-2 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-md">
                                AO VIVO
                            </span>
                        ) : null}
                    </div>
                )}
                <div className="px-4 py-3.5">
                    <h2 className="line-clamp-2 text-[15px] font-medium leading-relaxed tracking-wide text-zinc-700 dark:text-zinc-300">
                        {title}
                    </h2>
                    {!isLive && published_at ? (
                        <p className="mt-1.5 text-xs font-normal text-zinc-500 dark:text-zinc-400">{formatDate(published_at)}</p>
                    ) : isLive ? (
                        <p className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">Transmissão ao vivo no YouTube</p>
                    ) : null}
                </div>
            </Wrapper>
        </li>
    );
}

export default function MobileCulto({ cultos, liveCulto = null, showPostRegistrationBanner = false }: Props) {
    useEffect(() => {
        if (!showPostRegistrationBanner || typeof window === 'undefined') {
            return;
        }
        const u = new URL(window.location.href);
        if (u.searchParams.has('reg_ok')) {
            u.searchParams.delete('reg_ok');
            const next = u.pathname + (u.searchParams.toString() ? `?${u.searchParams.toString()}` : '') + u.hash;
            window.history.replaceState({}, '', next);
        }
    }, [showPostRegistrationBanner]);

    return (
        <MobileLayout>
            <Head title="Culto" />
            <div className="space-y-6">
                <Link href={route('mobile.home')} className="text-sm text-zinc-500 underline dark:text-zinc-400">
                    ← Início
                </Link>
                {showPostRegistrationBanner ? (
                    <div
                        className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-50"
                        role="status"
                    >
                        <p className="font-semibold">Conta criada com sucesso</p>
                        <p className="mt-1 text-emerald-900/90 dark:text-emerald-100/90">
                            Você já está conectado(a). Pode explorar o culto e o restante do aplicativo.
                        </p>
                    </div>
                ) : null}
                {cultos.length === 0 && !liveCulto ? (
                    <div className="py-12 lg:py-20 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                            <FilmIcon className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
                        </div>
                        <p className="text-zinc-600 dark:text-zinc-400 font-medium">Nenhum culto publicado</p>
                        <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-1">Os vídeos aparecerão aqui.</p>
                    </div>
                ) : (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {liveCulto ? (
                            <CultoVideoCard
                                key="live-youtube"
                                id={0}
                                title={liveCulto.title}
                                youtube_url={liveCulto.youtube_url}
                                youtube_thumb_url={liveCulto.youtube_thumb_url}
                                published_at={null}
                                isLive
                            />
                        ) : null}
                        {cultos.map((c) => (
                            <CultoVideoCard
                                key={c.id}
                                id={c.id}
                                title={c.title}
                                youtube_url={c.youtube_url}
                                youtube_thumb_url={c.youtube_thumb_url}
                                published_at={c.published_at}
                            />
                        ))}
                    </ul>
                )}
            </div>
        </MobileLayout>
    );
}
