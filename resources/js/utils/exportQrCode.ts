function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
}

function serializeSvg(svgElement: SVGSVGElement, size: number): string {
    const clone = svgElement.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', String(size));
    clone.setAttribute('height', String(size));

    return new XMLSerializer().serializeToString(clone);
}

export function downloadQrSvg(svgElement: SVGSVGElement, filename: string, size = 512): void {
    const source = serializeSvg(svgElement, size);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    downloadBlob(blob, filename);
}

export async function downloadQrPng(
    svgElement: SVGSVGElement,
    filename: string,
    size = 2048,
    backgroundColor = '#ffffff',
): Promise<void> {
    const source = serializeSvg(svgElement, size);
    const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    try {
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Não foi possível gerar o PNG do QR code.'));
            img.src = url;
        });

        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Canvas não suportado neste navegador.');
        }

        context.fillStyle = backgroundColor;
        context.fillRect(0, 0, size, size);
        context.drawImage(image, 0, 0, size, size);

        const blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob(resolve, 'image/png');
        });
        if (!blob) {
            throw new Error('Não foi possível gerar o PNG do QR code.');
        }

        downloadBlob(blob, filename);
    } finally {
        URL.revokeObjectURL(url);
    }
}

export function missionSignupQrFilename(extension: 'png' | 'svg'): string {
    return `qr-inscricao-missao-tailandia-mianmar.${extension}`;
}
