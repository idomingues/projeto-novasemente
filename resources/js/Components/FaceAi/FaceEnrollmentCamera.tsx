import { useEffect, useRef, useState } from 'react';
import { CheckIcon } from '@heroicons/react/24/solid';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import {
    FACE_EMBEDDING_MODEL,
    FACE_OVAL_GUIDE,
    buildChallengeSequence,
    estimatePose,
    evaluateFaceFit,
    faceFitLabel,
    loadFaceApi,
    poseLabel,
    poseMatches,
    poseShortLabel,
    type FaceApiNamespace,
    type FaceFitStatus,
    type PoseHint,
} from '@/utils/faceEnrollment';

type Props = {
    onComplete: (payload: { blob: Blob; embedding: number[]; modelVersion: string }) => void;
    onCancel: () => void;
    busy?: boolean;
};

type Phase = 'loading' | 'camera' | 'challenge' | 'ready' | 'capturing' | 'error';
type CaptureMode = 'auto' | 'manual';

const HOLD_MS = 700;
const FIT_HOLD_MS = 900;
const DETECT_EVERY_MS = 120;

export default function FaceEnrollmentCamera({ onComplete, onCancel, busy = false }: Props) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const apiRef = useRef<FaceApiNamespace | null>(null);
    const holdStartedRef = useRef<number | null>(null);
    const fitHoldRef = useRef<number | null>(null);
    const stepRef = useRef(0);
    const sequenceRef = useRef<PoseHint[]>([]);
    const phaseRef = useRef<Phase>('loading');
    const captureModeRef = useRef<CaptureMode>('auto');
    const capturingRef = useRef(false);
    const rafRef = useRef<number | null>(null);
    const lastDetectRef = useRef(0);
    const onCompleteRef = useRef(onComplete);
    onCompleteRef.current = onComplete;

    const [phase, setPhase] = useState<Phase>('loading');
    const [message, setMessage] = useState('Preparando modelos…');
    const [stepIndex, setStepIndex] = useState(0);
    const [sequence, setSequence] = useState<PoseHint[]>([]);
    const [faceOk, setFaceOk] = useState(false);
    const [fitStatus, setFitStatus] = useState<FaceFitStatus>('missing');
    const [captureMode, setCaptureMode] = useState<CaptureMode>('auto');
    const [canManualShot, setCanManualShot] = useState(false);

    phaseRef.current = phase;
    captureModeRef.current = captureMode;

    const stopCamera = () => {
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
    };

    const setPhaseSafe = (next: Phase) => {
        phaseRef.current = next;
        setPhase(next);
    };

    const captureReference = async () => {
        if (capturingRef.current) {
            return;
        }
        capturingRef.current = true;
        setCanManualShot(false);
        setPhaseSafe('capturing');
        setMessage('Capturando foto de referência…');

        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }

        const api = apiRef.current;
        const video = videoRef.current;
        if (!api || !video) {
            capturingRef.current = false;
            setPhaseSafe('error');
            setMessage('Câmera indisponível no momento da captura.');
            return;
        }

        try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 640;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                throw new Error('Falha ao capturar o frame.');
            }
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const final = await api
                .detectSingleFace(canvas, new api.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!final?.descriptor) {
                throw new Error('Não foi possível gerar a matriz do rosto. Tente de novo com mais luz.');
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
        } catch (e) {
            capturingRef.current = false;
            setPhaseSafe('error');
            setMessage(e instanceof Error ? e.message : 'Falha ao capturar.');
            stopCamera();
        }
    };

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                setPhaseSafe('loading');
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
                        height: { ideal: 960 },
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
                fitHoldRef.current = null;
                capturingRef.current = false;
                setPhaseSafe('challenge');
                setMessage(poseLabel(seq[0]));
            } catch (e) {
                if (cancelled) return;
                const text =
                    e instanceof Error
                        ? e.message
                        : 'Não foi possível iniciar a câmera ou os modelos.';
                setPhaseSafe('error');
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
        if (phase !== 'challenge' && phase !== 'ready') {
            return;
        }

        const loop = async (ts: number) => {
            rafRef.current = requestAnimationFrame(loop);
            if (capturingRef.current || ts - lastDetectRef.current < DETECT_EVERY_MS) {
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

                const frameW = video.videoWidth || 1;
                const frameH = video.videoHeight || 1;

                if (!detection) {
                    setFaceOk(false);
                    setFitStatus('missing');
                    setCanManualShot(false);
                    holdStartedRef.current = null;
                    fitHoldRef.current = null;
                    setMessage(faceFitLabel('missing'));
                    return;
                }

                const fit = evaluateFaceFit(
                    detection.detection.box,
                    frameW,
                    frameH,
                    video.clientWidth,
                    video.clientHeight,
                );
                setFitStatus(fit);
                const fitted = fit === 'ok';
                setFaceOk(fitted);

                if (!fitted) {
                    holdStartedRef.current = null;
                    fitHoldRef.current = null;
                    setCanManualShot(false);
                    setMessage(faceFitLabel(fit));
                    return;
                }

                const currentPhase = phaseRef.current;

                // Após o desafio: encaixe ok → pronto para foto (auto ou manual)
                if (currentPhase === 'ready') {
                    if (captureModeRef.current === 'manual') {
                        fitHoldRef.current = null;
                        setCanManualShot(true);
                        setMessage('Posição boa — toque em Tirar foto');
                        return;
                    }

                    const { yaw, pitch } = estimatePose(detection);
                    if (!poseMatches('center', yaw, pitch)) {
                        fitHoldRef.current = null;
                        setCanManualShot(false);
                        setMessage('Olhe para a câmera (de frente) e encaixe o rosto no oval');
                        return;
                    }

                    // Automático: segura um instante e captura
                    setCanManualShot(false);
                    const now = performance.now();
                    if (fitHoldRef.current === null) {
                        fitHoldRef.current = now;
                        setMessage('Perfeito — capturando…');
                        return;
                    }
                    if (now - fitHoldRef.current < FIT_HOLD_MS) {
                        setMessage('Perfeito — capturando…');
                        return;
                    }
                    fitHoldRef.current = null;
                    void captureReference();
                    return;
                }

                // Desafio de vivacidade
                const { yaw, pitch } = estimatePose(detection);
                const current = sequenceRef.current[stepRef.current];
                if (!current) {
                    return;
                }

                const isLastStep = stepRef.current >= sequenceRef.current.length - 1;
                const manualReady =
                    captureModeRef.current === 'manual' && fitted && isLastStep;

                if (!poseMatches(current, yaw, pitch)) {
                    holdStartedRef.current = null;
                    // No último passo em modo manual, oval verde já libera o botão.
                    if (manualReady) {
                        setCanManualShot(true);
                        setMessage('Posição boa — toque em Tirar foto');
                    } else {
                        setCanManualShot(false);
                        setMessage(poseLabel(current));
                    }
                    return;
                }

                if (manualReady) {
                    setCanManualShot(true);
                }

                const now = performance.now();
                if (holdStartedRef.current === null) {
                    holdStartedRef.current = now;
                    setMessage(
                        manualReady
                            ? 'Posição boa — toque em Tirar foto (ou aguarde)'
                            : `${poseLabel(current)}… mantendo`,
                    );
                    return;
                }

                if (now - holdStartedRef.current < HOLD_MS) {
                    return;
                }

                holdStartedRef.current = null;
                const next = stepRef.current + 1;
                if (next < sequenceRef.current.length) {
                    stepRef.current = next;
                    setStepIndex(next);
                    setCanManualShot(false);
                    setMessage(poseLabel(sequenceRef.current[next]));
                    return;
                }

                // Desafio concluído → fase de encaixe + foto
                setPhaseSafe('ready');
                fitHoldRef.current = null;
                if (captureModeRef.current === 'manual') {
                    setCanManualShot(true);
                    setMessage('Posição boa — toque em Tirar foto');
                } else {
                    setCanManualShot(false);
                    setMessage('Encaixe o rosto no oval — a foto será automática');
                }
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

    const ovalLeftPct = ((1 - FACE_OVAL_GUIDE.widthRatio) / 2) * 100;
    const ovalTopPct = (FACE_OVAL_GUIDE.centerYRatio - FACE_OVAL_GUIDE.heightRatio / 2) * 100;
    const ovalWidthPct = FACE_OVAL_GUIDE.widthRatio * 100;
    const ovalHeightPct = FACE_OVAL_GUIDE.heightRatio * 100;

    const modeBtnClass = (mode: CaptureMode) =>
        `cursor-pointer rounded-xl px-3 py-2 text-sm font-medium transition ${
            captureMode === mode
                ? 'bg-teal-600 text-white shadow-sm dark:bg-teal-500'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
        }`;

    const challengeDone = phase === 'ready' || phase === 'capturing';
    const photoDone = phase === 'capturing';
    const showProgress =
        sequence.length > 0 && (phase === 'challenge' || phase === 'ready' || phase === 'capturing');

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Captura:</p>
                <div className="inline-flex gap-1.5 rounded-2xl bg-zinc-50 p-1 ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-700">
                    <button
                        type="button"
                        className={modeBtnClass('auto')}
                        disabled={busy || phase === 'capturing'}
                        onClick={() => {
                            setCaptureMode('auto');
                            setCanManualShot(false);
                            if (phaseRef.current === 'ready') {
                                setMessage('Encaixe o rosto no oval — a foto será automática');
                            }
                        }}
                    >
                        Automática
                    </button>
                    <button
                        type="button"
                        className={modeBtnClass('manual')}
                        disabled={busy || phase === 'capturing'}
                        onClick={() => {
                            setCaptureMode('manual');
                            fitHoldRef.current = null;
                            if (phaseRef.current === 'ready') {
                                setMessage('Encaixe o rosto no oval e toque em Tirar foto');
                            }
                        }}
                    >
                        Manual
                    </button>
                </div>
            </div>

            {showProgress ? (
                <ol
                    className="mx-auto flex w-full max-w-sm flex-wrap items-stretch justify-center gap-2"
                    aria-label="Progresso da identificação"
                >
                    {sequence.map((hint, index) => {
                        const done = challengeDone || index < stepIndex;
                        const current = phase === 'challenge' && index === stepIndex;
                        return (
                            <li
                                key={`${hint}-${index}`}
                                className={`flex min-w-[4.75rem] flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-center ring-1 transition ${
                                    done
                                        ? 'bg-emerald-50 ring-emerald-200 dark:bg-emerald-950/40 dark:ring-emerald-800'
                                        : current
                                          ? 'bg-teal-50 ring-teal-300 dark:bg-teal-950/40 dark:ring-teal-700'
                                          : 'bg-zinc-50 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-700'
                                }`}
                            >
                                <span
                                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                                        done
                                            ? 'bg-emerald-600 text-white'
                                            : current
                                              ? 'bg-teal-600 text-white'
                                              : 'bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400'
                                    }`}
                                >
                                    {done ? <CheckIcon className="h-3.5 w-3.5" aria-hidden /> : index + 1}
                                </span>
                                <span
                                    className={`text-[11px] font-semibold leading-tight ${
                                        done
                                            ? 'text-emerald-800 dark:text-emerald-200'
                                            : current
                                              ? 'text-teal-800 dark:text-teal-200'
                                              : 'text-zinc-500 dark:text-zinc-400'
                                    }`}
                                >
                                    {poseShortLabel(hint)}
                                </span>
                                <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                                    {done ? 'Feito' : current ? 'Agora' : 'Falta'}
                                </span>
                            </li>
                        );
                    })}
                    <li
                        className={`flex min-w-[4.75rem] flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-center ring-1 transition ${
                            photoDone
                                ? 'bg-emerald-50 ring-emerald-200 dark:bg-emerald-950/40 dark:ring-emerald-800'
                                : challengeDone
                                  ? 'bg-teal-50 ring-teal-300 dark:bg-teal-950/40 dark:ring-teal-700'
                                  : 'bg-zinc-50 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-700'
                        }`}
                    >
                        <span
                            className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                                photoDone
                                    ? 'bg-emerald-600 text-white'
                                    : challengeDone
                                      ? 'bg-teal-600 text-white'
                                      : 'bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400'
                            }`}
                        >
                            {photoDone ? (
                                <CheckIcon className="h-3.5 w-3.5" aria-hidden />
                            ) : (
                                sequence.length + 1
                            )}
                        </span>
                        <span
                            className={`text-[11px] font-semibold leading-tight ${
                                photoDone
                                    ? 'text-emerald-800 dark:text-emerald-200'
                                    : challengeDone
                                      ? 'text-teal-800 dark:text-teal-200'
                                      : 'text-zinc-500 dark:text-zinc-400'
                            }`}
                        >
                            Foto
                        </span>
                        <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                            {photoDone ? 'Feito' : challengeDone ? 'Agora' : 'Falta'}
                        </span>
                    </li>
                </ol>
            ) : null}

            <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-2xl bg-zinc-900">
                <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="h-full w-full scale-x-[-1] object-cover"
                />
                {/* Oval vertical semelhante ao rosto (elipse, não círculo) */}
                <div
                    className={`pointer-events-none absolute rounded-[50%] border-[3px] transition-colors duration-200 ${
                        faceOk ? 'border-emerald-400' : 'border-red-500'
                    }`}
                    style={{
                        left: `${ovalLeftPct}%`,
                        top: `${ovalTopPct}%`,
                        width: `${ovalWidthPct}%`,
                        height: `${ovalHeightPct}%`,
                        boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                    }}
                    aria-hidden
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-4 py-4">
                    <p className="text-center text-sm font-medium text-white">{message}</p>
                    {sequence.length > 0 && phase === 'challenge' ? (
                        <p className="mt-1 text-center text-xs text-zinc-300">
                            Passo {stepIndex + 1} de {sequence.length}
                        </p>
                    ) : null}
                    {phase === 'ready' ? (
                        <p className="mt-1 text-center text-xs text-zinc-300">
                            {captureMode === 'auto'
                                ? 'Modo automático'
                                : canManualShot
                                  ? 'Pronto para capturar'
                                  : 'Aguardando encaixe'}
                            {fitStatus === 'ok' ? ' · oval ok' : ''}
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
                {captureMode === 'manual' && (phase === 'challenge' || phase === 'ready') ? (
                    <PrimaryButton
                        type="button"
                        className="cursor-pointer"
                        disabled={busy || !canManualShot}
                        onClick={() => void captureReference()}
                    >
                        Tirar foto
                    </PrimaryButton>
                ) : null}
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
