import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { useEffect, useMemo, useState } from 'react';

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
    nativeIosMinimumVersion,
}: {
    nativeIosMinimumVersion?: string | null;
}) {
    const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) {
            setReady(true);
            return;
        }

        let cancelled = false;

        Device.getInfo()
            .then((info) => {
                if (cancelled) {
                    return;
                }

                setDeviceInfo({
                    operatingSystem: info.operatingSystem ?? '',
                    osVersion: info.osVersion ?? '',
                });
            })
            .catch(() => {
                if (!cancelled) {
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

    if (!requiresIosUpdate) {
        return null;
    }

    const title = 'Atualize o iOS';
    const message =
        'Este aparelho está com uma versão do iOS antiga demais para a versão atual do Nova Semente. Atualize o iOS em Ajustes para continuar usando o app.';

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
                    iOS do aparelho: {deviceInfo?.osVersion}
                    <span className="mx-2 text-zinc-500">·</span>
                    Mínimo: iOS {nativeIosMinimumVersion}
                </div>
                <p className="mt-6 text-xs leading-relaxed text-zinc-400">
                    Se o aparelho não permitir instalar iOS {nativeIosMinimumVersion} ou superior, ele não é compatível com a versão atual.
                </p>
            </div>
        </div>
    );
}
