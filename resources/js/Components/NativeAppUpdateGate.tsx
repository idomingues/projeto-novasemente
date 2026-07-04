import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { useEffect, useMemo, useState } from 'react';

type NativeInfo = {
    version: string;
    build: string;
};

type DeviceInfo = {
    operatingSystem: string;
    osVersion: string;
};

function normalizeVersionPart(part: string): number {
    const parsed = Number.parseInt(part.replace(/\D+/g, ''), 10);
    return Number.isFinite(parsed) ? parsed : 0;
}

function compareVersions(left: string, right: string): number {
    const l = left.trim().replace(/^v/i, '').split(/[.-]/).map(normalizeVersionPart);
    const r = right.trim().replace(/^v/i, '').split(/[.-]/).map(normalizeVersionPart);
    const max = Math.max(l.length, r.length);

    for (let i = 0; i < max; i += 1) {
        const diff = (l[i] ?? 0) - (r[i] ?? 0);
        if (diff !== 0) {
            return diff > 0 ? 1 : -1;
        }
    }

    return 0;
}

export default function NativeAppUpdateGate({
    appVersion,
    iosAppStoreUrl,
    nativeIosMinimumVersion,
}: {
    appVersion?: string | null;
    iosAppStoreUrl?: string | null;
    nativeIosMinimumVersion?: string | null;
}) {
    const [nativeInfo, setNativeInfo] = useState<NativeInfo | null>(null);
    const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) {
            setReady(true);
            return;
        }

        let cancelled = false;

        Promise.allSettled([App.getInfo(), Device.getInfo()])
            .then(([appResult, deviceResult]) => {
                if (cancelled) {
                    return;
                }

                if (appResult.status === 'fulfilled') {
                    setNativeInfo({
                        version: appResult.value.version ?? '',
                        build: appResult.value.build ?? '',
                    });
                } else {
                    setNativeInfo(null);
                }

                if (deviceResult.status === 'fulfilled') {
                    setDeviceInfo({
                        operatingSystem: deviceResult.value.operatingSystem ?? '',
                        osVersion: deviceResult.value.osVersion ?? '',
                    });
                } else {
                    setDeviceInfo(null);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setReady(true);
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const requiresIosUpdate = useMemo(() => {
        if (!ready || !Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
            return false;
        }

        if (!nativeIosMinimumVersion || !deviceInfo?.osVersion) {
            return false;
        }

        return compareVersions(deviceInfo.osVersion, nativeIosMinimumVersion) < 0;
    }, [deviceInfo, nativeIosMinimumVersion, ready]);

    const requiresUpdate = useMemo(() => {
        if (!ready || !Capacitor.isNativePlatform() || !appVersion || !nativeInfo?.version) {
            return false;
        }

        // Hotfix: nao bloqueia iOS por versao do app enquanto a release pode
        // estar pendente na App Store. Mantemos o bloqueio por versao no Android.
        if (Capacitor.getPlatform() === 'ios') {
            return false;
        }

        return compareVersions(nativeInfo.version, appVersion) < 0;
    }, [appVersion, nativeInfo, ready]);

    if (!requiresIosUpdate && !requiresUpdate) {
        return null;
    }

    const storeUrl = iosAppStoreUrl?.trim() || null;
    const title = requiresIosUpdate ? 'Atualize o iOS' : 'Atualize o app';
    const message = requiresIosUpdate
        ? 'Este aparelho está com uma versão do iOS antiga demais para a versão atual do Nova Semente. Atualize o iOS em Ajustes para continuar usando o app.'
        : 'Esta versão instalada é antiga. Para continuar usando o Nova Semente, instale a versão mais recente.';

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-zinc-950 px-5 py-8 text-white">
            <div className="w-full max-w-sm text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-2xl font-black text-white">
                    NS
                </div>
                <h1 className="text-2xl font-bold leading-tight">{title}</h1>
                <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                    {message}
                </p>
                <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-zinc-300">
                    {requiresIosUpdate ? (
                        <>
                            iOS do aparelho: {deviceInfo?.osVersion}
                            <span className="mx-2 text-zinc-500">·</span>
                            Mínimo: iOS {nativeIosMinimumVersion}
                        </>
                    ) : (
                        <>
                            Instalado: v{nativeInfo?.version}
                            <span className="mx-2 text-zinc-500">·</span>
                            Atual: v{appVersion}
                        </>
                    )}
                </div>
                {requiresIosUpdate ? (
                    <p className="mt-6 text-xs leading-relaxed text-zinc-400">
                        Se o aparelho não permitir instalar iOS {nativeIosMinimumVersion} ou superior, ele não é compatível com a versão atual.
                    </p>
                ) : storeUrl ? (
                    <a
                        href={storeUrl}
                        className="mt-6 inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-emerald-500 px-6 text-sm font-bold text-white shadow-lg shadow-emerald-950/40 transition-colors active:bg-emerald-600"
                    >
                        Abrir App Store
                    </a>
                ) : (
                    <p className="mt-6 text-xs leading-relaxed text-zinc-400">
                        Abra a App Store, procure por Nova Semente e toque em Atualizar.
                    </p>
                )}
            </div>
        </div>
    );
}
