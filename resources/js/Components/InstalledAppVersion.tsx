import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { useEffect, useMemo, useState } from 'react';

type InstalledInfo = {
    version: string;
    build: string;
};

export default function InstalledAppVersion({ className = '' }: { className?: string }) {
    const [info, setInfo] = useState<InstalledInfo | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            if (!Capacitor.isNativePlatform()) {
                return;
            }

            const i = await App.getInfo();
            if (cancelled) {
                return;
            }

            setInfo({ version: i.version, build: i.build });
        }

        load();
        return () => {
            cancelled = true;
        };
    }, []);

    const label = useMemo(() => {
        if (!info?.version) {
            return '—';
        }
        if (!info.build) {
            return `v${info.version}`;
        }
        return `v${info.version} (build ${info.build})`;
    }, [info]);

    return (
        <span className={className} aria-label="Versão instalada">
            {label}
        </span>
    );
}

