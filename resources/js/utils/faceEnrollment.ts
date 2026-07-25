/** Carrega face-api (CDN) e modelos — usado só na página admin IA Foto. */

export type FaceApiNamespace = {
    nets: {
        tinyFaceDetector: { loadFromUri: (uri: string) => Promise<unknown> };
        faceLandmark68Net: { loadFromUri: (uri: string) => Promise<unknown> };
        faceRecognitionNet: { loadFromUri: (uri: string) => Promise<unknown> };
    };
    detectSingleFace: (
        input: HTMLVideoElement | HTMLCanvasElement,
        options?: unknown,
    ) => {
        withFaceLandmarks: () => {
            withFaceDescriptor: () => Promise<FaceDetectionResult | undefined>;
        };
    };
    TinyFaceDetectorOptions: new (opts?: { inputSize?: number; scoreThreshold?: number }) => unknown;
};

export type FaceDetectionResult = {
    detection: { score: number; box: { x: number; y: number; width: number; height: number } };
    landmarks: {
        getNose: () => Array<{ x: number; y: number }>;
        getLeftEye: () => Array<{ x: number; y: number }>;
        getRightEye: () => Array<{ x: number; y: number }>;
        getJawOutline: () => Array<{ x: number; y: number }>;
    };
    descriptor: Float32Array;
};

declare global {
    interface Window {
        faceapi?: FaceApiNamespace;
    }
}

const FACE_API_SCRIPT =
    'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/dist/face-api.min.js';
const FACE_API_MODELS =
    'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model';

export const FACE_EMBEDDING_MODEL = 'face-api-recognition-v1';

let loadPromise: Promise<FaceApiNamespace> | null = null;

function loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
        if (existing) {
            if (window.faceapi) {
                resolve();
                return;
            }
            existing.addEventListener('load', () => resolve());
            existing.addEventListener('error', () => reject(new Error('Falha ao carregar face-api.')));
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Falha ao carregar face-api.'));
        document.head.appendChild(script);
    });
}

export async function loadFaceApi(): Promise<FaceApiNamespace> {
    if (window.faceapi?.nets?.faceRecognitionNet) {
        return window.faceapi;
    }
    if (!loadPromise) {
        loadPromise = (async () => {
            await loadScript(FACE_API_SCRIPT);
            const api = window.faceapi;
            if (!api) {
                throw new Error('Biblioteca de reconhecimento facial indisponível.');
            }
            await Promise.all([
                api.nets.tinyFaceDetector.loadFromUri(FACE_API_MODELS),
                api.nets.faceLandmark68Net.loadFromUri(FACE_API_MODELS),
                api.nets.faceRecognitionNet.loadFromUri(FACE_API_MODELS),
            ]);
            return api;
        })().catch((err) => {
            loadPromise = null;
            throw err;
        });
    }
    return loadPromise;
}

export type PoseHint = 'left' | 'right' | 'up' | 'center';

function mid(points: Array<{ x: number; y: number }>): { x: number; y: number } {
    const n = points.length || 1;
    let x = 0;
    let y = 0;
    for (const p of points) {
        x += p.x;
        y += p.y;
    }
    return { x: x / n, y: y / n };
}

/**
 * Estimativa simples de pose a partir dos landmarks (vídeo espelhado na UI).
 * yaw > 0 ≈ olhar à direita do usuário; pitch > 0 ≈ olhar para cima.
 */
export function estimatePose(result: FaceDetectionResult): { yaw: number; pitch: number } {
    const nose = result.landmarks.getNose();
    const leftEye = result.landmarks.getLeftEye();
    const rightEye = result.landmarks.getRightEye();
    const jaw = result.landmarks.getJawOutline();

    const noseTip = nose[Math.min(3, nose.length - 1)] ?? nose[0];
    const eyeL = mid(leftEye);
    const eyeR = mid(rightEye);
    const eyeMid = { x: (eyeL.x + eyeR.x) / 2, y: (eyeL.y + eyeR.y) / 2 };
    const eyeDist = Math.max(Math.hypot(eyeR.x - eyeL.x, eyeR.y - eyeL.y), 1);

    // Vídeo com scaleX(-1): coordenadas do detector seguem o frame não espelhado da câmera.
    // Para o usuário, "olhe para a esquerda" = yaw negativo no frame bruto em muitos dispositivos;
    // calibramos com limiares generosos e labels espelhados na UI.
    const yaw = (noseTip.x - eyeMid.x) / eyeDist;

    const jawBottom = jaw[Math.floor(jaw.length / 2)] ?? jaw[jaw.length - 1];
    const faceHeight = Math.max(Math.abs(jawBottom.y - eyeMid.y), 1);
    const pitch = (eyeMid.y - noseTip.y) / faceHeight;

    return { yaw, pitch };
}

export function poseMatches(hint: PoseHint, yaw: number, pitch: number): boolean {
    const yawAbs = 0.18;
    const pitchUp = 0.12;
    const centerYaw = 0.12;
    const centerPitch = 0.1;

    switch (hint) {
        case 'left':
            // No frame da câmera front (sem mirror no canvas de análise), olhar à esquerda do usuário
            // move o nariz para a direita da imagem → yaw positivo.
            return yaw >= yawAbs;
        case 'right':
            return yaw <= -yawAbs;
        case 'up':
            return pitch >= pitchUp && Math.abs(yaw) < 0.28;
        case 'center':
            return Math.abs(yaw) <= centerYaw && Math.abs(pitch) <= centerPitch;
        default:
            return false;
    }
}

export function poseLabel(hint: PoseHint): string {
    switch (hint) {
        case 'left':
            return 'Olhe para a sua esquerda';
        case 'right':
            return 'Olhe para a sua direita';
        case 'up':
            return 'Olhe para cima';
        case 'center':
            return 'Olhe para a câmera (de frente)';
        default:
            return '';
    }
}

/** Sequência curta: esquerda, direita, frente — suficiente para provar presença. */
export function buildChallengeSequence(): PoseHint[] {
    return Math.random() < 0.5 ? ['left', 'right', 'center'] : ['right', 'left', 'center'];
}
