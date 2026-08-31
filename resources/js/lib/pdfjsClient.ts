import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = pdfWorker;

export async function fetchPdfBytes(url: string): Promise<{ bytes: ArrayBuffer; byteLength: number }> {
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) {
        throw new Error(`Não foi possível carregar o PDF (${response.status}).`);
    }

    const bytes = await response.arrayBuffer();
    return { bytes, byteLength: bytes.byteLength };
}

export async function loadPdfDocument(bytes: ArrayBuffer): Promise<PDFDocumentProxy> {
    return getDocument({ data: new Uint8Array(bytes) }).promise;
}

export function throwIfAborted(signal?: AbortSignal): void {
    if (signal?.aborted) {
        throw new DOMException('Extração cancelada.', 'AbortError');
    }
}
