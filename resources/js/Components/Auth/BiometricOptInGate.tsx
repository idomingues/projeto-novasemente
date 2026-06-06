import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import {
    consumeBiometricOptIn,
    getBiometricAvailability,
    isBiometricLoginEnabled,
    isNativeApp,
    saveBiometricCredentials,
} from '@/utils/biometricLogin';
import { router } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';

export default function BiometricOptInGate() {
    const [show, setShow] = useState(false);
    const [biometricLabel, setBiometricLabel] = useState('biometria');
    const [pendingLogin, setPendingLogin] = useState('');
    const [pendingPassword, setPendingPassword] = useState('');
    const [saving, setSaving] = useState(false);

    const maybePromptOptIn = useCallback(() => {
        if (!isNativeApp() || isBiometricLoginEnabled() || show) {
            return;
        }

        const pending = consumeBiometricOptIn();
        if (!pending) {
            return;
        }

        void (async () => {
            const availability = await getBiometricAvailability();
            if (!availability.isAvailable) {
                return;
            }
            setBiometricLabel(availability.label);
            setPendingLogin(pending.login);
            setPendingPassword(pending.password);
            setShow(true);
        })();
    }, [show]);

    useEffect(() => {
        maybePromptOptIn();
        return router.on('success', () => {
            maybePromptOptIn();
        });
    }, [maybePromptOptIn]);

    const close = () => {
        setShow(false);
        setPendingPassword('');
    };

    const activate = async () => {
        setSaving(true);
        try {
            await saveBiometricCredentials(pendingLogin, pendingPassword);
            close();
        } catch {
            // falha silenciosa — usuário pode ativar depois no perfil
            close();
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal show={show} onClose={close} maxWidth="sm">
            <div className="p-6">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                    Usar {biometricLabel} para entrar?
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    Na próxima vez você entra sem digitar senha neste aparelho. Quem tiver {biometricLabel}{' '}
                    cadastrado neste celular poderá acessar sua conta.
                </p>
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <SecondaryButton type="button" onClick={close} disabled={saving} className="cursor-pointer">
                        Agora não
                    </SecondaryButton>
                    <PrimaryButton
                        type="button"
                        onClick={() => void activate()}
                        disabled={saving}
                        className="cursor-pointer"
                    >
                        Ativar {biometricLabel}
                    </PrimaryButton>
                </div>
            </div>
        </Modal>
    );
}
