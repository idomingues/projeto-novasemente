/**
 * Redimensiona e comprime imagens grandes (ex.: fotos do iPhone) para JPEG
 * antes do upload, evitando 413 no proxy e mantendo qualidade aceitável para avatar.
 */
/** Margem para corpo multipart + campos do formulário (muitos nginx usam 1 MB ou 512 KB). */
const TARGET_MAX_BYTES = 480_000;
const HARD_MAX_BYTES = 520_000;
const INITIAL_MAX_EDGE = 1024;
const MIN_QUALITY = 0.48;

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
            reject(new Error('LOAD_IMAGE_FAILED'));
        };
        img.src = url;
    });
}

async function decodeToImage(file: File): Promise<HTMLImageElement | ImageBitmap> {
    try {
        if (typeof createImageBitmap === 'function') {
            return await createImageBitmap(file);
        }
    } catch {
        /* HEIC / formatos: fallback abaixo */
    }
    return loadImageFromFile(file);
}

function releaseDecoded(src: HTMLImageElement | ImageBitmap): void {
    if ('close' in src && typeof src.close === 'function') {
        src.close();
    }
}

async function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
    return new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', quality);
    });
}

export class ImageCompressError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ImageCompressError';
    }
}

/**
 * @returns Arquivo JPEG (ou o original se já for pequeno / não for imagem)
 */
export async function compressImageForUpload(file: File): Promise<File> {
    if (!file.type.startsWith('image/')) {
        return file;
    }
    const isJpeg = file.type === 'image/jpeg' || file.type === 'image/jpg';
    if (file.size <= TARGET_MAX_BYTES && isJpeg) {
        return file;
    }

    let decoded: HTMLImageElement | ImageBitmap;
    try {
        decoded = await decodeToImage(file);
    } catch {
        throw new ImageCompressError(
            'Não foi possível ler esta imagem. Tente outra foto ou exporte como JPEG nas definições da câmera.',
        );
    }

    try {
        const srcW = decoded.width;
        const srcH = decoded.height;
        if (srcW < 1 || srcH < 1) {
            throw new ImageCompressError('Imagem inválida.');
        }

        let maxEdge = INITIAL_MAX_EDGE;
        let blob: Blob | null = null;

        for (let attempt = 0; attempt < 6; attempt++) {
            const scale = Math.min(1, maxEdge / Math.max(srcW, srcH));
            const w = Math.max(1, Math.round(srcW * scale));
            const h = Math.max(1, Math.round(srcH * scale));

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                throw new ImageCompressError('O browser não suporta processamento desta imagem.');
            }
            ctx.drawImage(decoded as CanvasImageSource, 0, 0, w, h);

            let quality = 0.9;
            while (quality >= MIN_QUALITY) {
                blob = await canvasToJpegBlob(canvas, quality);
                if (blob && blob.size <= TARGET_MAX_BYTES) {
                    const baseName = file.name.replace(/\.[^.]+$/, '') || 'perfil';
                    return new File([blob], `${baseName}.jpg`, {
                        type: 'image/jpeg',
                        lastModified: Date.now(),
                    });
                }
                quality -= 0.06;
            }

            const lastBlob = await canvasToJpegBlob(canvas, MIN_QUALITY);
            if (lastBlob && lastBlob.size <= HARD_MAX_BYTES) {
                const baseName = file.name.replace(/\.[^.]+$/, '') || 'perfil';
                return new File([lastBlob], `${baseName}.jpg`, {
                    type: 'image/jpeg',
                    lastModified: Date.now(),
                });
            }

            maxEdge = Math.round(maxEdge * 0.82);
            if (maxEdge < 480) {
                break;
            }
        }

        throw new ImageCompressError(
            'A imagem continua grande demais após compressão. Experimente uma foto com menos detalhe ou mais curta.',
        );
    } finally {
        releaseDecoded(decoded);
    }
}
