/** Carrega face-api (CDN) e modelos — usado só na página admin IA Foto. */

export type FaceApiNamespace = {
    nets: {
        tinyFaceDetector: { loadFromUri: (uri: string) => Promise<unknown> };
        faceLandmark68Net: { loadFromUri: (uri: string) => Promise<unknown> };
        faceRecognitionNet: { loadFromUri: (uri: string) => Promise<unknown> };
        ssdMobilenetv1: { loadFromUri: (uri: string) => Promise<unknown> };
    };
    detectSingleFace: (
        input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
        options?: unknown,
    ) => {
        withFaceLandmarks: () => {
            withFaceDescriptor: () => Promise<FaceDetectionResult | undefined>;
        };
    };
    detectAllFaces: (
        input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
        options?: unknown,
    ) => {
        withFaceLandmarks: () => {
            withFaceDescriptors: () => Promise<FaceDetectionResult[]>;
        };
    };
    TinyFaceDetectorOptions: new (opts?: { inputSize?: number; scoreThreshold?: number }) => unknown;
    SsdMobilenetv1Options: new (opts?: { minConfidence?: number; maxResults?: number }) => unknown;
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
                api.nets.ssdMobilenetv1.loadFromUri(FACE_API_MODELS),
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
    const yawAbs = 0.16;
    const pitchUp = 0.1;
    // Limiares folgados: webcam + ângulo natural costumam falhar com valores apertados.
    const centerYaw = 0.32;
    const centerPitch = 0.26;

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

/** Rótulo curto para checklist de progresso. */
export function poseShortLabel(hint: PoseHint): string {
    switch (hint) {
        case 'left':
            return 'Esquerda';
        case 'right':
            return 'Direita';
        case 'up':
            return 'Cima';
        case 'center':
            return 'Frente';
        default:
            return '';
    }
}

/** Sequência curta: esquerda, direita, frente — suficiente para provar presença. */
export function buildChallengeSequence(): PoseHint[] {
    return Math.random() < 0.5 ? ['left', 'right', 'center'] : ['right', 'left', 'center'];
}

/**
 * Frações do frame visível (object-cover) usadas pelo guia oval (retrato).
 * Devem bater com o CSS do oval em FaceEnrollmentCamera.
 */
export const FACE_OVAL_GUIDE = {
    /** Largura do oval relativa à área visível */
    widthRatio: 0.58,
    /** Altura do oval relativa à área visível */
    heightRatio: 0.72,
    /** Centro Y do oval (um pouco acima do meio) */
    centerYRatio: 0.45,
} as const;

export type FaceFitStatus = 'missing' | 'too_far' | 'too_close' | 'off_center' | 'ok';

/** Ponto do frame da câmera → coordenadas normalizadas da área visível (object-cover). */
function videoPointToCoverNorm(
    x: number,
    y: number,
    videoW: number,
    videoH: number,
    viewW: number,
    viewH: number,
): { x: number; y: number } {
    const videoAspect = videoW / videoH;
    const viewAspect = viewW / viewH;
    let scale: number;
    let offsetX = 0;
    let offsetY = 0;
    if (videoAspect > viewAspect) {
        scale = viewH / videoH;
        offsetX = (viewW - videoW * scale) / 2;
    } else {
        scale = viewW / videoW;
        offsetY = (viewH - videoH * scale) / 2;
    }
    return {
        x: (x * scale + offsetX) / viewW,
        y: (y * scale + offsetY) / viewH,
    };
}

/**
 * Avalia se o bounding box do rosto encaixa no oval de guia.
 * `viewWidth`/`viewHeight` = tamanho do elemento de vídeo na tela (clientWidth/Height).
 */
export function evaluateFaceFit(
    box: { x: number; y: number; width: number; height: number },
    frameWidth: number,
    frameHeight: number,
    viewWidth?: number,
    viewHeight?: number,
): FaceFitStatus {
    if (frameWidth <= 0 || frameHeight <= 0 || box.width <= 0 || box.height <= 0) {
        return 'missing';
    }

    const viewW = viewWidth && viewWidth > 0 ? viewWidth : frameWidth;
    const viewH = viewHeight && viewHeight > 0 ? viewHeight : frameHeight;

    const tl = videoPointToCoverNorm(box.x, box.y, frameWidth, frameHeight, viewW, viewH);
    const br = videoPointToCoverNorm(
        box.x + box.width,
        box.y + box.height,
        frameWidth,
        frameHeight,
        viewW,
        viewH,
    );

    const faceW = Math.abs(br.x - tl.x);
    const faceH = Math.abs(br.y - tl.y);
    const faceCx = (tl.x + br.x) / 2;
    const faceCy = (tl.y + br.y) / 2;

    const ovalW = FACE_OVAL_GUIDE.widthRatio;
    const ovalH = FACE_OVAL_GUIDE.heightRatio;
    const ovalCx = 0.5;
    const ovalCy = FACE_OVAL_GUIDE.centerYRatio;

    // Tamanho: o rosto deve preencher boa parte do oval, sem estourar
    const heightFill = faceH / ovalH;
    const widthFill = faceW / ovalW;
    if (heightFill < 0.42 || widthFill < 0.4) {
        return 'too_far';
    }
    if (heightFill > 0.98 || widthFill > 0.98) {
        return 'too_close';
    }

    // Centro do rosto dentro do oval (elipse um pouco folgada)
    const dx = (faceCx - ovalCx) / (ovalW * 0.48);
    const dy = (faceCy - ovalCy) / (ovalH * 0.48);
    if (dx * dx + dy * dy > 1) {
        return 'off_center';
    }

    return 'ok';
}

export function faceFitLabel(status: FaceFitStatus): string {
    switch (status) {
        case 'missing':
            return 'Posicione o rosto dentro do oval';
        case 'too_far':
            return 'Aproxime-se um pouco';
        case 'too_close':
            return 'Afaste-se um pouco';
        case 'off_center':
            return 'Centralize o rosto no oval';
        case 'ok':
            return 'Rosto encaixado';
        default:
            return '';
    }
}

/**
 * Limiar base (selfie / 1 rosto). Valores mais baixos = menos falso positivo.
 * Use `matchThresholdForFaceCount` para o limiar efetivo por foto.
 */
export const FACE_MATCH_THRESHOLD = 0.55;

/**
 * Limiar adaptativo:
 * - 1 rosto: 0.55 (pega casos como dist 0.505)
 * - 2 rostos: 0.52 (mais rigoroso — parentesco em foto de dupla)
 * - 3+ rostos: 0.66 (grupo: ângulo/luz piores)
 */
export function matchThresholdForFaceCount(facesFound: number): number {
    if (facesFound >= 3) {
        return 0.66;
    }
    if (facesFound === 2) {
        return 0.52;
    }
    return FACE_MATCH_THRESHOLD;
}

export function euclideanDistance(a: number[], b: number[]): number {
    const n = Math.min(a.length, b.length);
    if (n === 0 || a.length !== b.length) {
        return Number.POSITIVE_INFINITY;
    }
    let sum = 0;
    for (let i = 0; i < n; i++) {
        const d = a[i] - b[i];
        sum += d * d;
    }
    return Math.sqrt(sum);
}

export function describeMatch(
    distance: number,
    threshold: number = FACE_MATCH_THRESHOLD,
): { matched: boolean; label: string } {
    if (!Number.isFinite(distance)) {
        return { matched: false, label: 'Rosto não encontrado' };
    }
    const matched = distance <= threshold;
    return {
        matched,
        label: matched ? 'Rosto encontrado' : 'Rosto não encontrado',
    };
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Não foi possível ler a imagem.'));
        };
        img.src = url;
    });
}

/**
 * Extrai o descriptor do primeiro rosto detectado no arquivo.
 * Retorna null se nenhum rosto for encontrado.
 */
export async function extractEmbeddingFromImageFile(file: File): Promise<number[] | null> {
    const api = await loadFaceApi();
    await api.nets.ssdMobilenetv1.loadFromUri(FACE_API_MODELS);
    const img = await loadImageFromFile(file);
    const descriptors = await collectFaceDescriptors(api, img);
    return descriptors[0] ?? null;
}

export type ImageMatchResult = {
    facesFound: number;
    bestDistance: number | null;
    matched: boolean;
    label: string;
    threshold: number;
};

type DetectInput = HTMLImageElement | HTMLCanvasElement;

function drawRotatedImage(img: HTMLImageElement, degrees: number): HTMLCanvasElement {
    const rad = (degrees * Math.PI) / 180;
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil(w * cos + h * sin));
    canvas.height = Math.max(1, Math.ceil(w * sin + h * cos));
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Canvas indisponível.');
    }
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rad);
    ctx.drawImage(img, -w / 2, -h / 2);
    return canvas;
}

async function detectOnInput(api: FaceApiNamespace, input: DetectInput): Promise<FaceDetectionResult[]> {
    let detections = await api
        .detectAllFaces(input, new api.SsdMobilenetv1Options({ minConfidence: 0.2, maxResults: 40 }))
        .withFaceLandmarks()
        .withFaceDescriptors();

    if (detections.length === 0) {
        detections = await api
            .detectAllFaces(
                input,
                new api.TinyFaceDetectorOptions({ inputSize: 608, scoreThreshold: 0.2 }),
            )
            .withFaceLandmarks()
            .withFaceDescriptors();
    }

    return detections;
}

/**
 * Coleta descriptors em várias rotações — ajuda quando a cabeça está inclinada.
 */
async function collectFaceDescriptors(
    api: FaceApiNamespace,
    img: HTMLImageElement,
): Promise<number[][]> {
    const angles = [0, -18, 18, -32, 32];
    const descriptors: number[][] = [];

    for (const angle of angles) {
        const input: DetectInput = angle === 0 ? img : drawRotatedImage(img, angle);
        const detections = await detectOnInput(api, input);
        for (const detection of detections) {
            if (detection.descriptor) {
                descriptors.push(Array.from(detection.descriptor));
            }
        }
    }

    return descriptors;
}

/**
 * Detecta rostos na foto (com rotações) e compara cada um com a matriz cadastrada.
 * Retorna a melhor (menor) distância.
 */
export async function matchReferenceInImageFile(
    file: File,
    referenceEmbedding: number[],
): Promise<ImageMatchResult> {
    const api = await loadFaceApi();
    await api.nets.ssdMobilenetv1.loadFromUri(FACE_API_MODELS);

    const img = await loadImageFromFile(file);
    const probes = await collectFaceDescriptors(api, img);
    // Contagem aproximada: no ângulo 0 (sem contar duplicatas de rotação)
    const upright = await detectOnInput(api, img);
    const facesFound = Math.max(upright.length, probes.length > 0 ? 1 : 0);

    if (probes.length === 0) {
        return {
            facesFound: 0,
            bestDistance: null,
            matched: false,
            label: 'Rosto não encontrado',
            threshold: FACE_MATCH_THRESHOLD,
        };
    }

    if (referenceEmbedding.length === 0) {
        const n = facesFound || probes.length;
        return {
            facesFound: n,
            bestDistance: null,
            matched: false,
            label: `${n} ${n === 1 ? 'rosto identificado' : 'rostos identificados'}`,
            threshold: matchThresholdForFaceCount(n),
        };
    }

    let bestDistance = Number.POSITIVE_INFINITY;
    for (const probe of probes) {
        const distance = euclideanDistance(referenceEmbedding, probe);
        if (distance < bestDistance) {
            bestDistance = distance;
        }
    }

    const shownFaces = facesFound || 1;
    const threshold = matchThresholdForFaceCount(shownFaces);
    const { matched, label } = describeMatch(bestDistance, threshold);

    return {
        facesFound: shownFaces,
        bestDistance,
        matched,
        label,
        threshold,
    };
}
