import { router } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';

const REACHABILITY_URL = '/up';
const REACHABILITY_TIMEOUT_MS = 5000;

function reachabilityTarget(): string {
    return new URL(REACHABILITY_URL, window.location.origin).href;
}

async function verifyAppReachable(): Promise<boolean> {
    const url = reachabilityTarget();

    for (const method of ['HEAD', 'GET'] as const) {
        try {
            const controller = new AbortController();
            const timeoutId = window.setTimeout(() => controller.abort(), REACHABILITY_TIMEOUT_MS);
            const response = await fetch(url, {
                method,
                cache: 'no-store',
                signal: controller.signal,
                credentials: 'same-origin',
            });
            window.clearTimeout(timeoutId);

            if (response.ok) {
                return true;
            }
        } catch {
            // tenta GET se HEAD falhar (alguns proxies/CDNs)
        }
    }

    return false;
}

/**
 * Aviso quando o app não consegue falar com o servidor (navegador + WebView nativo).
 * Só exibe após falha em /up — não confia só em navigator.onLine / Capacitor Network.
 */
export default function OfflineBanner() {
    const [offline, setOffline] = useState(false);
    const verifyGeneration = useRef(0);

    const refreshConnectivity = useCallback(async (optimisticOnline = false) => {
        const generation = ++verifyGeneration.current;

        if (optimisticOnline) {
            setOffline(false);

            return;
        }

        const reachable = await verifyAppReachable();
        if (generation !== verifyGeneration.current) {
            return;
        }

        setOffline(!reachable);
    }, []);

    useEffect(() => {
        let cancelled = false;

        const runCheck = (optimisticOnline = false) => {
            if (!cancelled) {
                void refreshConnectivity(optimisticOnline);
            }
        };

        const onVisibility = () => {
            if (document.visibilityState === 'visible') {
                runCheck(false);
            }
        };

        const removeRouter = router.on('success', () => {
            if (!cancelled) {
                setOffline(false);
            }
        });

        if (Capacitor.isNativePlatform()) {
            let removeListener: (() => void) | undefined;

            Network.getStatus().then((status) => {
                runCheck(status.connected);
            });

            Network.addListener('networkStatusChange', (status) => {
                runCheck(status.connected);
            }).then((handle) => {
                removeListener = () => void handle.remove();
            });

            document.addEventListener('visibilitychange', onVisibility);
            runCheck(false);

            return () => {
                cancelled = true;
                verifyGeneration.current += 1;
                removeListener?.();
                removeRouter();
                document.removeEventListener('visibilitychange', onVisibility);
            };
        }

        const onOffline = () => runCheck(false);
        const onOnline = () => runCheck(true);

        runCheck(navigator.onLine);
        window.addEventListener('offline', onOffline);
        window.addEventListener('online', onOnline);
        document.addEventListener('visibilitychange', onVisibility);

        const recheckId = window.setTimeout(() => runCheck(false), 1500);

        return () => {
            cancelled = true;
            verifyGeneration.current += 1;
            window.clearTimeout(recheckId);
            window.removeEventListener('offline', onOffline);
            window.removeEventListener('online', onOnline);
            document.removeEventListener('visibilitychange', onVisibility);
            removeRouter();
        };
    }, [refreshConnectivity]);

    if (!offline) {
        return null;
    }

    return (
        <div
            role="status"
            className="fixed left-0 right-0 top-0 z-[10000] border-b border-amber-800/30 bg-amber-500 px-4 py-2.5 text-center text-sm font-medium text-amber-950 shadow-sm dark:border-amber-500/30 dark:bg-amber-600/90 dark:text-amber-50"
        >
            Sem conexão com a internet. Algumas funções podem não estar disponíveis.
        </div>
    );
}
