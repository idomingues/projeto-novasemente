/**
 * Dispara download no navegador/WebView sem navegar para outra página.
 */
export function downloadBlob(blob: Blob, filename: string): void {
    const objectUrl = URL.createObjectURL(blob);
    try {
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = filename;
        anchor.rel = 'noopener';
        anchor.style.display = 'none';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
    } finally {
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
    }
}

export function sanitizeDownloadFilename(name: string, fallback = 'arquivo'): string {
    const cleaned = name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9-_]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
    return (cleaned.slice(0, 80) || fallback).toLowerCase();
}
