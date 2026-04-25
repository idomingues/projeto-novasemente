import MobileLayout from '@/Layouts/MobileLayout';
import { Head } from '@inertiajs/react';
import { ArrowDownTrayIcon, ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useMemo, useRef, useState } from 'react';

interface Props {
    title?: string;
    embedUrl: string;
    folderUrl: string;
    images?: {
        id: string;
        name: string | null;
        thumb_url: string;
        full_url: string;
        download_url: string;
        view_url: string;
    }[];
}

export default function MobilePhotos({ title = 'Fotos', embedUrl, folderUrl, images: imagesProp = [] }: Props) {
    const images = useMemo(() => (Array.isArray(imagesProp) ? imagesProp : []), [imagesProp]);
    const [open, setOpen] = useState(false);
    const [idx, setIdx] = useState(0);
    const [zoomed, setZoomed] = useState(false);
    const touchStartX = useRef<number | null>(null);

    const canUseGallery = images.length > 0;
    const current = canUseGallery ? images[Math.min(idx, images.length - 1)] : null;

    const openAt = (i: number) => {
        setIdx(i);
        setZoomed(false);
        setOpen(true);
    };

    const prev = () => {
        setIdx((v) => (v - 1 + images.length) % images.length);
        setZoomed(false);
    };

    const next = () => {
        setIdx((v) => (v + 1) % images.length);
        setZoomed(false);
    };

    return (
        <MobileLayout>
            <Head title={title} />

            <div className="space-y-3">
                <div className="flex items-end justify-between gap-3">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                        {title}
                    </h1>

                    <a
                        href={folderUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white underline underline-offset-4"
                    >
                        Abrir no Drive
                    </a>
                </div>

                {canUseGallery ? (
                    <>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {images.map((img, i) => (
                                <button
                                    key={img.id}
                                    type="button"
                                    onClick={() => openAt(i)}
                                    className="relative aspect-square overflow-hidden rounded-2xl bg-zinc-200 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 active:scale-[0.99] transition"
                                    title={img.name ?? 'Foto'}
                                >
                                    <img
                                        src={img.thumb_url}
                                        alt={img.name ?? ''}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                </button>
                            ))}
                        </div>

                        {open && current ? (
                            <div className="fixed inset-0 z-[100] bg-black/90">
                                <div className="absolute inset-x-0 top-0 p-4 flex items-center justify-between gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setOpen(false)}
                                        className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/15"
                                        aria-label="Fechar"
                                    >
                                        <XMarkIcon className="w-6 h-6" />
                                    </button>

                                    <a
                                        href={current.download_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 text-white hover:bg-white/15 text-sm font-semibold"
                                        title="Download"
                                    >
                                        <ArrowDownTrayIcon className="w-5 h-5" />
                                        Download
                                    </a>
                                </div>

                                <div
                                    className="absolute inset-0 pt-16 pb-16 px-4 flex items-center justify-center"
                                    onTouchStart={(e) => (touchStartX.current = e.touches[0]?.clientX ?? null)}
                                    onTouchEnd={(e) => {
                                        const start = touchStartX.current;
                                        const end = e.changedTouches[0]?.clientX ?? null;
                                        touchStartX.current = null;
                                        if (start === null || end === null) return;
                                        const dx = end - start;
                                        if (Math.abs(dx) < 40) return;
                                        if (dx > 0) prev();
                                        else next();
                                    }}
                                >
                                    <div
                                        className={`max-w-[min(96vw,1100px)] max-h-[72dvh] overflow-auto rounded-2xl ${
                                            zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'
                                        }`}
                                        onClick={() => setZoomed((v) => !v)}
                                    >
                                        <img
                                            src={current.full_url}
                                            alt={current.name ?? ''}
                                            className={`w-auto h-auto max-w-full max-h-[72dvh] object-contain select-none ${
                                                zoomed ? 'scale-150 origin-center' : 'scale-100'
                                            } transition-transform duration-200`}
                                            draggable={false}
                                        />
                                    </div>
                                </div>

                                <div className="absolute inset-x-0 bottom-0 p-4 flex items-center justify-between gap-3">
                                    <button
                                        type="button"
                                        onClick={prev}
                                        className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 text-white hover:bg-white/15 text-sm font-semibold"
                                    >
                                        <ChevronLeftIcon className="w-5 h-5" />
                                        Anterior
                                    </button>
                                    <p className="text-xs text-white/70 tabular-nums">
                                        {idx + 1} / {images.length}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={next}
                                        className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 text-white hover:bg-white/15 text-sm font-semibold"
                                    >
                                        Próxima
                                        <ChevronRightIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </>
                ) : (
                    <div className="rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                        <iframe
                            title="Álbum de fotos (Google Drive)"
                            src={embedUrl}
                            className="w-full h-[70dvh] min-h-[520px] bg-white"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            allowFullScreen
                        />
                    </div>
                )}

                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Se não aparecer nada aqui, confirme se a pasta do Drive está como &quot;Qualquer pessoa com o link pode
                    ver&quot;.
                </p>
            </div>
        </MobileLayout>
    );
}

