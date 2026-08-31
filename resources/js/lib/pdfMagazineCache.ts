const DB_NAME = 'ns-pdf-magazine-cache-v1';
const DB_VERSION = 1;
const STORE_NAME = 'articles';

export type CachedMagazineArticle = {
    title: string;
    paragraphs: string[];
    pageNumber: number;
    imageDataUrl: string | null;
};

type CacheEntry = {
    cacheKey: string;
    articles: CachedMagazineArticle[];
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
        request.onerror = () => reject(request.error ?? new Error('Falha ao abrir cache da revista.'));
    });
}

export function buildMagazineCacheKey(url: string, byteLength: number): string {
    return `magazine::${url}::${byteLength}`;
}

export async function readMagazineCache(cacheKey: string): Promise<CachedMagazineArticle[] | null> {
    try {
        const db = await openDb();
        return await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(cacheKey);

            request.onsuccess = () => {
                const entry = request.result as CacheEntry | undefined;
                if (!entry || !Array.isArray(entry.articles) || entry.articles.length === 0) {
                    resolve(null);
                    return;
                }
                resolve(entry.articles);
            };
            request.onerror = () => reject(request.error ?? new Error('Falha ao ler cache da revista.'));
        });
    } catch {
        return null;
    }
}

export async function writeMagazineCache(cacheKey: string, articles: CachedMagazineArticle[]): Promise<void> {
    if (articles.length === 0) {
        return;
    }

    try {
        const db = await openDb();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const entry: CacheEntry = {
                cacheKey,
                articles,
                updatedAt: Date.now(),
            };
            const request = store.put(entry);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error ?? new Error('Falha ao gravar cache da revista.'));
        });
    } catch {
        // Quota ou IndexedDB indisponível — tenta de novo sem imagens.
        const stripped = articles.map((article) => ({ ...article, imageDataUrl: null }));
        try {
            const db = await openDb();
            await new Promise<void>((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const request = store.put({
                    cacheKey,
                    articles: stripped,
                    updatedAt: Date.now(),
                } satisfies CacheEntry);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch {
            // Cache é opcional.
        }
    }
}
