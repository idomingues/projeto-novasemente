import PrimaryButton from '@/Components/PrimaryButton';
import { maskLoginIdentifier } from '@/utils/loginPreferences';
import { FingerPrintIcon } from '@heroicons/react/24/outline';

type BiometricLoginPanelProps = {
    biometricLabel: string;
    loginHint: string;
    processing: boolean;
    onBiometricLogin: () => void;
    onUsePassword: () => void;
};

export default function BiometricLoginPanel({
    biometricLabel,
    loginHint,
    processing,
    onBiometricLogin,
    onUsePassword,
}: BiometricLoginPanelProps) {
    const masked = maskLoginIdentifier(loginHint);

    return (
        <div className="mt-6 space-y-4">
            {masked ? (
                <p className="text-center text-sm text-zinc-600">
                    Continuar como <span className="font-semibold text-zinc-900">{masked}</span>
                </p>
            ) : null}

            <PrimaryButton
                type="button"
                onClick={onBiometricLogin}
                disabled={processing}
                className="relative z-10 flex w-full items-center justify-center gap-2 !rounded-xl !bg-zinc-900 !py-3.5 !text-sm !font-semibold !normal-case !tracking-normal !text-white shadow-sm hover:!bg-zinc-800 disabled:!opacity-50"
            >
                <FingerPrintIcon className="h-5 w-5 shrink-0" aria-hidden />
                Entrar com {biometricLabel}
            </PrimaryButton>

            <button
                type="button"
                onClick={onUsePassword}
                disabled={processing}
                className="w-full cursor-pointer text-center text-sm font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
                Usar senha
            </button>
        </div>
    );
}
