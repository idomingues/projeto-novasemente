import {
    biometricLabelForType,
    disableBiometricLogin,
    getBiometricAvailability,
    isBiometricLoginEnabled,
    isNativeApp,
} from '@/utils/biometricLogin';
import { FingerPrintIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

export default function BiometricDisableButton() {
    const [visible, setVisible] = useState(false);
    const [label, setLabel] = useState('Biometria');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!isNativeApp() || !isBiometricLoginEnabled()) {
            setVisible(false);
            return;
        }

        void (async () => {
            const availability = await getBiometricAvailability();
            setLabel(biometricLabelForType(availability.biometryType));
            setVisible(true);
        })();
    }, []);

    if (!visible) {
        return null;
    }

    const handleDisable = async () => {
        const ok = window.confirm(`Desativar ${label} para entrar neste aparelho?`);
        if (!ok) {
            return;
        }
        setBusy(true);
        try {
            await disableBiometricLogin();
            setVisible(false);
        } finally {
            setBusy(false);
        }
    };

    return (
        <button
            type="button"
            onClick={() => void handleDisable()}
            disabled={busy}
            className="w-full cursor-pointer rounded-2xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/40"
        >
            <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                    <FingerPrintIcon className="h-6 w-6 text-zinc-700 dark:text-zinc-200" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="font-semibold text-zinc-900 dark:text-white">Desativar {label}</div>
                    <div className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                        Exige e-mail e senha na próxima entrada neste aparelho.
                    </div>
                </div>
            </div>
        </button>
    );
}
