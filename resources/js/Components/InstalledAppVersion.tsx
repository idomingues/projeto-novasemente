import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { useEffect, useMemo, useState } from 'react';

type InstalledInfo = {
    version: string;
    build: string;
};

function formatV(raw: string): string {
    const t = raw.trim();
    if (!t) {
        return '';
    }
    return t.startsWith('v') || t.startsWith('V') ? t : `v${t}`;
}

export default function InstalledAppVersion({
    className = '',
    fallbackLabel = null,
}: {
    className?: string;
    /** Quando não há app nativa ou `App.getInfo` falha — ex.: mesma versão «Web» do servidor. */
    fallbackLabel?: string | null;
}) {
    const [info, setInfo] = useState<InstalledInfo | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            if (!Capacitor.isNativePlatform()) {
                return;
            }

            try {
                const i = await App.getInfo();
                if (cancelled) {
                    return;
                }
                setInfo({ version: i.version ?? '', build: i.build ?? '' });
            } catch {
                if (!cancelled) {
                    setInfo(null);
                }
            }
        }

        void load();
        return () => {
            cancelled = true;
        };
    }, []);

    const label = useMemo(() => {
        const v = (info?.version ?? '').trim();
        const b = (info?.build ?? '').trim();
        if (v) {
            if (!b) {
                return formatV(v);
            }
            return `${formatV(v)} (build ${b})`;
        }
        const fb = (fallbackLabel ?? '').trim();
        if (fb) {
            return Capacitor.isNativePlatform() ? `${formatV(fb)} (pacote)` : formatV(fb);
        }
        if (!Capacitor.isNativePlatform()) {
            const hint = typeof __APP_FRONT_BUNDLE_VERSION__ === 'string' ? __APP_FRONT_BUNDLE_VERSION__.trim() : '';
            return hint ? formatV(hint) : '—';
        }
        return '—';
    }, [info, fallbackLabel]);

    return (
        <span className={className} aria-label="Versão instalada">
            {label}
        </span>
    );
}

