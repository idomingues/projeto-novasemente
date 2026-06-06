import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

type NativeInfo = {
    version: string;
    build: string;
};

function formatVersionLabel(raw: string | null | undefined): string {
    const t = (raw ?? '').trim();
    if (!t) {
        return '—';
    }
    return t.startsWith('v') || t.startsWith('V') ? t : `v${t}`;
}

function resolveWebVersionRaw(
    appVersion: string | null | undefined,
    appVersionHistory: { version: string }[],
): string {
    const bundleHint = typeof __APP_FRONT_BUNDLE_VERSION__ === 'string' ? __APP_FRONT_BUNDLE_VERSION__.trim() : '';
    const historyHead = appVersionHistory[0]?.version?.trim() || '';
    return (appVersion ?? '').trim() || historyHead || bundleHint;
}

function resolveInstalledLabel(nativeInfo: NativeInfo | null, webVersionRaw: string): string {
    const v = (nativeInfo?.version ?? '').trim();
    const b = (nativeInfo?.build ?? '').trim();
    if (v) {
        if (!b) {
            return formatVersionLabel(v);
        }
        return `${formatVersionLabel(v)} (build ${b})`;
    }
    const fb = webVersionRaw.trim();
    if (fb) {
        return Capacitor.isNativePlatform() ? `${formatVersionLabel(fb)} (pacote)` : formatVersionLabel(fb);
    }
    if (!Capacitor.isNativePlatform()) {
        const hint = typeof __APP_FRONT_BUNDLE_VERSION__ === 'string' ? __APP_FRONT_BUNDLE_VERSION__.trim() : '';
        return hint ? formatVersionLabel(hint) : '—';
    }
    return '—';
}

export function useAppVersionLabels() {
    const { appVersion, appVersionHistory = [] } = usePage().props as {
        appVersion?: string | null;
        appVersionHistory?: { version: string }[];
    };
    const [nativeInfo, setNativeInfo] = useState<NativeInfo | null>(null);

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) {
            return;
        }

        let cancelled = false;

        App.getInfo()
            .then((i) => {
                if (!cancelled) {
                    setNativeInfo({ version: i.version ?? '', build: i.build ?? '' });
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setNativeInfo(null);
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const webVersionRaw = useMemo(
        () => resolveWebVersionRaw(appVersion, appVersionHistory),
        [appVersion, appVersionHistory],
    );

    const webLabel = useMemo(() => formatVersionLabel(webVersionRaw), [webVersionRaw]);

    const installedLabel = useMemo(
        () => resolveInstalledLabel(nativeInfo, webVersionRaw),
        [nativeInfo, webVersionRaw],
    );

    const summaryLabel = useMemo(() => {
        if (Capacitor.isNativePlatform() && installedLabel !== '—') {
            return `Web ${webLabel} · App ${installedLabel}`;
        }
        return `Web ${webLabel}`;
    }, [webLabel, installedLabel]);

    return { webLabel, installedLabel, summaryLabel, webVersionRaw };
}
