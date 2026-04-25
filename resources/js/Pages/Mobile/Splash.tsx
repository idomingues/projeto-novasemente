import { router, Head } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

interface Props {
    videoSrc: string;
    nextUrl: string;
}

export default function MobileSplash({ videoSrc, nextUrl }: Props) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [canPlay, setCanPlay] = useState(false);
    const [finished, setFinished] = useState(false);
    const [loadError, setLoadError] = useState(false);

    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;

        const tryPlay = async () => {
            try {
                await v.play();
                setCanPlay(true);
            } catch {
                setCanPlay(false);
            }
        };

        const onEnded = () => setFinished(true);
        v.addEventListener('ended', onEnded);

        // tentar autoplay assim que montar
        void tryPlay();

        // fallback: mesmo que não toque (autoplay bloqueado), segue depois de alguns segundos
        const t = window.setTimeout(() => setFinished(true), 7000);

        return () => {
            v.removeEventListener('ended', onEnded);
            window.clearTimeout(t);
        };
    }, []);

    const requestPlay = async () => {
        const v = videoRef.current;
        if (!v) return;
        try {
            await v.play();
            setCanPlay(true);
        } catch {
            setCanPlay(false);
        }
    };

    useEffect(() => {
        if (!finished) return;
        router.visit(nextUrl, { replace: true });
    }, [finished, nextUrl]);

    return (
        <div className="fixed inset-0 bg-black" onClick={() => void requestPlay()}>
            <Head title="Nova Semente" />

            <button
                type="button"
                onClick={() => setFinished(true)}
                className="absolute right-4 top-4 z-10 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur hover:bg-white/15"
            >
                Pular
            </button>

            <div className="flex h-full w-full items-center justify-center">
                <video
                    ref={videoRef}
                    src={videoSrc}
                    className="h-full w-full object-cover"
                    autoPlay
                    muted
                    playsInline
                    preload="auto"
                    onCanPlay={() => setCanPlay(true)}
                    onEnded={() => setFinished(true)}
                    onError={() => {
                        setLoadError(true);
                        // se o vídeo falhar (404/mime/etc), não prende o utilizador aqui.
                        window.setTimeout(() => setFinished(true), 600);
                    }}
                />
            </div>

            {(!canPlay || loadError) && (
                <div className="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center">
                    <div className="rounded-full bg-black/40 px-4 py-2 text-xs font-medium text-white backdrop-blur">
                        {loadError ? 'Não foi possível carregar o vídeo. A continuar…' : 'Toque para continuar'}
                    </div>
                </div>
            )}
        </div>
    );
}

