const DB_NAME = 'ns-pdf-text-cache-v3';
const DB_VERSION = 1;
const STORE_NAME = 'extractions';

export type PdfTextCacheEntry = {
    cacheKey: string;
    paragraphs: string[];
    updatedAt: number;
};

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error('IndexedDB indisponível.'));
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'cacheKey' });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('Falha ao abrir cache de PDF.'));
    });
}

export function buildPdfTextCacheKey(url: string, byteLength: number): string {
    return `${url}::${byteLength}`;
}

export async function readPdfTextCache(cacheKey: string): Promise<string[] | null> {
    try {
        const db = await openDb();
        return await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(cacheKey);

            request.onsuccess = () => {
                const entry = request.result as PdfTextCacheEntry | undefined;
                if (!entry || !Array.isArray(entry.paragraphs) || entry.paragraphs.length === 0) {
                    resolve(null);
                    return;
                }
                resolve(entry.paragraphs);
            };
            request.onerror = () => reject(request.error ?? new Error('Falha ao ler cache de PDF.'));
        });
    } catch {
        return null;
    }
}

export async function writePdfTextCache(cacheKey: string, paragraphs: string[]): Promise<void> {
    if (paragraphs.length === 0) {
        return;
    }

    try {
        const db = await openDb();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const entry: PdfTextCacheEntry = {
                cacheKey,
                paragraphs,
                updatedAt: Date.now(),
            };
            const request = store.put(entry);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error ?? new Error('Falha ao gravar cache de PDF.'));
        });
    } catch {
        // Cache é opcional — falha silenciosa.
    }
}
