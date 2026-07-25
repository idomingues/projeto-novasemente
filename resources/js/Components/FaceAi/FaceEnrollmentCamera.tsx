import { useEffect, useRef, useState } from 'react';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import {
    FACE_EMBEDDING_MODEL,
    buildChallengeSequence,
    estimatePose,
    loadFaceApi,
    poseLabel,
    poseMatches,
    type FaceApiNamespace,
    type PoseHint,
} from '@/utils/faceEnrollment';

type Props = {
    onComplete: (payload: { blob: Blob; embedding: number[]; modelVersion: string }) => void;
    onCancel: () => void;
    busy?: boolean;
};

type Phase = 'loading' | 'camera' | 'challenge' | 'capturing' | 'error';

const HOLD_MS = 700;
const DETECT_EVERY_MS = 120;

export default function FaceEnrollmentCamera({ onComplete, onCancel, busy = false }: Props) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const apiRef = useRef<FaceApiNamespace | null>(null);
    const holdStartedRef = useRef<number | null>(null);
    const stepRef = useRef(0);
    const sequenceRef = useRef<PoseHint[]>([]);
    const rafRef = useRef<number | null>(null);
    const lastDetectRef = useRef(0);
    const onCompleteRef = useRef(onComplete);
    onCompleteRef.current = onComplete;

    const [phase, setPhase] = useState<Phase>('loading');
    const [message, setMessage] = useState('Preparando modelos…');
    const [stepIndex, setStepIndex] = useState(0);
    const [sequence, setSequence] = useState<PoseHint[]>([]);
    const [faceOk, setFaceOk] = useState(false);

    const stopCamera = () => {
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
    };

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                setPhase('loading');
                setMessage('Carregando reconhecimento facial…');
                const api = await loadFaceApi();
                if (cancelled) return;
                apiRef.current = api;

                setMessage('Abrindo câmera…');
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: false,
                    video: {
                        facingMode: 'user',
                        width: { ideal: 720 },
                        height: { ideal: 720 },
                    },
                });
                if (cancelled) {
                    stream.getTracks().forEach((t) => t.stop());
                    return;
                }
                streamRef.current = stream;
                const video = videoRef.current;
                if (!video) {
                    throw new Error('Elemento de vídeo indisponível.');
                }
                video.srcObject = stream;
                await video.play();

                const seq = buildChallengeSequence();
                sequenceRef.current = seq;
                setSequence(seq);
                stepRef.current = 0;
                setStepIndex(0);
                holdStartedRef.current = null;
                setPhase('challenge');
                setMessage(poseLabel(seq[0]));
            } catch (e) {
                if (cancelled) return;
                const text =
                    e instanceof Error
                        ? e.message
                        : 'Não foi possível iniciar a câmera ou os modelos.';
                setPhase('error');
                setMessage(
                    text.includes('Permission') || text.includes('NotAllowed')
                        ? 'Permissão de câmera negada. Libere a câmera no navegador e tente de novo.'
                        : text,
                );
            }
        })();

        return () => {
            cancelled = true;
            stopCamera();
        };
    }, []);

    useEffect(() => {
        if (phase !== 'challenge') {
            return;
        }

        const loop = async (ts: number) => {
            rafRef.current = requestAnimationFrame(loop);
            if (ts - lastDetectRef.current < DETECT_EVERY_MS) {
                return;
            }
            lastDetectRef.current = ts;

            const api = apiRef.current;
            const video = videoRef.current;
            if (!api || !video || video.readyState < 2) {
                return;
            }

            try {
                const detection = await api
                    .detectSingleFace(video, new api.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
                    .withFaceLandmarks()
                    .withFaceDescriptor();

                if (!detection) {
                    setFaceOk(false);
                    holdStartedRef.current = null;
                    setMessage('Posicione o rosto dentro do oval');
                    return;
                }

                setFaceOk(true);
                const { yaw, pitch } = estimatePose(detection);
                const current = sequenceRef.current[stepRef.current];
                if (!current) {
                    return;
                }

                if (!poseMatches(current, yaw, pitch)) {
                    holdStartedRef.current = null;
                    setMessage(poseLabel(current));
                    return;
                }

                const now = performance.now();
                if (holdStartedRef.current === null) {
                    holdStartedRef.current = now;
                    setMessage(`${poseLabel(current)}… mantendo`);
                    return;
                }

                if (now - holdStartedRef.current < HOLD_MS) {
                    return;
                }

                // Passo concluído
                holdStartedRef.current = null;
                const next = stepRef.current + 1;
                if (next < sequenceRef.current.length) {
                    stepRef.current = next;
                    setStepIndex(next);
                    setMessage(poseLabel(sequenceRef.current[next]));
                    return;
                }

                // Captura final
                setPhase('capturing');
                setMessage('Capturando foto de referência…');
                if (rafRef.current !== null) {
                    cancelAnimationFrame(rafRef.current);
                    rafRef.current = null;
                }

                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth || 640;
                canvas.height = video.videoHeight || 640;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    setPhase('error');
                    setMessage('Falha ao capturar o frame.');
                    return;
                }
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                const final = await api
                    .detectSingleFace(canvas, new api.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
                    .withFaceLandmarks()
                    .withFaceDescriptor();

                if (!final?.descriptor) {
                    setPhase('error');
                    setMessage('Não foi possível gerar a matriz do rosto. Tente de novo com mais luz.');
                    stopCamera();
                    return;
                }

                const embedding = Array.from(final.descriptor);
                const blob = await new Promise<Blob>((resolve, reject) => {
                    canvas.toBlob(
                        (b) => (b ? resolve(b) : reject(new Error('Falha ao gerar JPEG.'))),
                        'image/jpeg',
                        0.92,
                    );
                });

                stopCamera();
                onCompleteRef.current({ blob, embedding, modelVersion: FACE_EMBEDDING_MODEL });
            } catch {
                // Ignora frames com falha pontual do detector
            }
        };

        rafRef.current = requestAnimationFrame(loop);
        return () => {
            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
        };
    }, [phase]);

    return (
        <div className="space-y-4">
            <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-2xl bg-zinc-900">
                <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="h-full w-full scale-x-[-1] object-cover"
                />
                <div
                    className={`pointer-events-none absolute inset-[12%] rounded-[50%] border-4 ${
                        faceOk ? 'border-emerald-400' : 'border-white/70'
                    }`}
                    style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)' }}
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-4">
                    <p className="text-center text-sm font-medium text-white">{message}</p>
                    {sequence.length > 0 && phase === 'challenge' ? (
                        <p className="mt-1 text-center text-xs text-zinc-300">
                            Passo {stepIndex + 1} de {sequence.length}
                        </p>
                    ) : null}
                </div>
            </div>

            {phase === 'error' ? (
                <p className="text-sm text-red-600 dark:text-red-400">{message}</p>
            ) : null}

            <div className="flex flex-wrap gap-2">
                <SecondaryButton type="button" onClick={onCancel} disabled={busy} className="cursor-pointer">
                    Cancelar
                </SecondaryButton>
                {phase === 'error' ? (
                    <PrimaryButton
                        type="button"
                        className="cursor-pointer"
                        onClick={() => window.location.reload()}
                    >
                        Tentar de novo
                    </PrimaryButton>
                ) : null}
            </div>
        </div>
    );
}
