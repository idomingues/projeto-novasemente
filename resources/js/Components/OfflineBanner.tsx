import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';

/**
 * Aviso mínimo quando não há rede (navegador + WebView nativo).
 */
export default function OfflineBanner() {
    const [offline, setOffline] = useState(false);

    useEffect(() => {
        const apply = (connected: boolean) => setOffline(!connected);

        if (Capacitor.isNativePlatform()) {
            let cancelled = false;
            let removeListener: (() => void) | undefined;

            Network.getStatus().then((status) => {
                if (!cancelled) apply(status.connected);
            });

            Network.addListener('networkStatusChange', (status) => apply(status.connected)).then((handle) => {
                removeListener = () => void handle.remove();
            });

            return () => {
                cancelled = true;
                removeListener?.();
            };
        }

        const onOffline = () => apply(false);
        const onOnline = () => apply(true);
        apply(navigator.onLine);
        window.addEventListener('offline', onOffline);
        window.addEventListener('online', onOnline);
        return () => {
            window.removeEventListener('offline', onOffline);
            window.removeEventListener('online', onOnline);
        };
    }, []);

    if (!offline) {
        return null;
    }

    return (
        <div
            role="status"
            className="fixed left-0 right-0 top-0 z-[10000] border-b border-amber-800/30 bg-amber-500 px-4 py-2.5 text-center text-sm font-medium text-amber-950 shadow-sm dark:border-amber-500/30 dark:bg-amber-600/90 dark:text-amber-50"
        >
            Sem ligação à internet. Algumas funções podem não estar disponíveis.
        </div>
    );
}
