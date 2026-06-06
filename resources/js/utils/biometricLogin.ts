import { Capacitor } from '@capacitor/core';
import {
    AccessControl,
    BiometryType,
    NativeBiometric,
} from '@capgo/capacitor-native-biometric';

import { readLastLogin } from '@/utils/loginPreferences';

export const BIOMETRIC_SERVER = 'br.org.novasemente.app';

const BIOMETRIC_ENABLED_KEY = 'ns_biometric_login_enabled';
const OPT_IN_ASK_KEY = 'ns_biometric_opt_in_ask';
const OPT_IN_CREDS_KEY = 'ns_biometric_opt_in_creds';

export type BiometricAvailability = {
    isAvailable: boolean;
    label: string;
    biometryType: BiometryType;
};

export function isNativeApp(): boolean {
    return typeof window !== 'undefined' && Capacitor.isNativePlatform();
}

function canUseStorage(): boolean {
    return typeof window !== 'undefined';
}

export function isBiometricLoginEnabled(): boolean {
    if (!canUseStorage()) {
        return false;
    }
    try {
        return localStorage.getItem(BIOMETRIC_ENABLED_KEY) === '1';
    } catch {
        return false;
    }
}

export function setBiometricLoginEnabled(enabled: boolean): void {
    if (!canUseStorage()) {
        return;
    }
    try {
        if (enabled) {
            localStorage.setItem(BIOMETRIC_ENABLED_KEY, '1');
        } else {
            localStorage.removeItem(BIOMETRIC_ENABLED_KEY);
        }
    } catch {
        // ignorar
    }
}

export function biometricLabelForType(biometryType: BiometryType): string {
    switch (biometryType) {
        case BiometryType.FACE_ID:
        case BiometryType.FACE_AUTHENTICATION:
            return 'Face ID';
        case BiometryType.TOUCH_ID:
            return 'Touch ID';
        case BiometryType.FINGERPRINT:
            return 'Impressão digital';
        case BiometryType.IRIS_AUTHENTICATION:
            return 'Íris';
        default:
            return 'Biometria';
    }
}

export async function getBiometricAvailability(): Promise<BiometricAvailability> {
    if (!isNativeApp()) {
        return { isAvailable: false, label: 'Biometria', biometryType: BiometryType.NONE };
    }

    try {
        const result = await NativeBiometric.isAvailable({ useFallback: false });
        return {
            isAvailable: result.isAvailable,
            label: biometricLabelForType(result.biometryType),
            biometryType: result.biometryType,
        };
    } catch {
        return { isAvailable: false, label: 'Biometria', biometryType: BiometryType.NONE };
    }
}

export async function hasStoredBiometricCredentials(): Promise<boolean> {
    if (!isNativeApp()) {
        return false;
    }
    try {
        const result = await NativeBiometric.isCredentialsSaved({ server: BIOMETRIC_SERVER });
        return result.isSaved;
    } catch {
        return false;
    }
}

export async function canShowBiometricLogin(): Promise<{
    canUse: boolean;
    label: string;
    maskedLogin: string;
} | null> {
    if (!isNativeApp() || !isBiometricLoginEnabled()) {
        return null;
    }

    const availability = await getBiometricAvailability();
    if (!availability.isAvailable) {
        return null;
    }

    const saved = await hasStoredBiometricCredentials();
    if (!saved) {
        return null;
    }

    return {
        canUse: true,
        label: availability.label,
        maskedLogin: readLastLogin() ?? '',
    };
}

export async function saveBiometricCredentials(login: string, password: string): Promise<void> {
    if (!isNativeApp()) {
        return;
    }

    await NativeBiometric.setCredentials({
        username: login.trim(),
        password,
        server: BIOMETRIC_SERVER,
        accessControl: AccessControl.BIOMETRY_ANY,
    });
    setBiometricLoginEnabled(true);
}

export async function getBiometricCredentials(): Promise<{ login: string; password: string } | null> {
    if (!isNativeApp() || !isBiometricLoginEnabled()) {
        return null;
    }

    try {
        const credentials = await NativeBiometric.getSecureCredentials({
            server: BIOMETRIC_SERVER,
            reason: 'Confirme sua identidade para entrar',
            title: 'Entrar',
            subtitle: 'Nova Semente',
            description: 'Use biometria para acessar sua conta',
            negativeButtonText: 'Usar senha',
        });

        return {
            login: credentials.username,
            password: credentials.password,
        };
    } catch {
        return null;
    }
}

export async function disableBiometricLogin(): Promise<void> {
    if (!isNativeApp()) {
        setBiometricLoginEnabled(false);
        return;
    }

    try {
        await NativeBiometric.deleteCredentials({ server: BIOMETRIC_SERVER });
    } catch {
        // credenciais já removidas
    }
    setBiometricLoginEnabled(false);
}

export function queueBiometricOptIn(login: string, password: string): void {
    if (!isNativeApp() || isBiometricLoginEnabled()) {
        return;
    }
    try {
        sessionStorage.setItem(OPT_IN_ASK_KEY, '1');
        sessionStorage.setItem(
            OPT_IN_CREDS_KEY,
            JSON.stringify({ login: login.trim(), password, ts: Date.now() }),
        );
    } catch {
        // ignorar
    }
}

export function consumeBiometricOptIn(): { login: string; password: string } | null {
    if (!canUseStorage()) {
        return null;
    }
    try {
        if (sessionStorage.getItem(OPT_IN_ASK_KEY) !== '1') {
            return null;
        }
        const raw = sessionStorage.getItem(OPT_IN_CREDS_KEY);
        sessionStorage.removeItem(OPT_IN_ASK_KEY);
        sessionStorage.removeItem(OPT_IN_CREDS_KEY);
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw) as { login?: string; password?: string; ts?: number };
        if (!parsed.login || !parsed.password) {
            return null;
        }
        if (parsed.ts && Date.now() - parsed.ts > 5 * 60 * 1000) {
            return null;
        }
        return { login: parsed.login, password: parsed.password };
    } catch {
        sessionStorage.removeItem(OPT_IN_ASK_KEY);
        sessionStorage.removeItem(OPT_IN_CREDS_KEY);
        return null;
    }
}

/** Pede ao navegador guardar a senha (iCloud Keychain / Google), quando suportado. */
export async function offerStoreBrowserPassword(login: string, password: string): Promise<void> {
    if (typeof window === 'undefined' || isNativeApp()) {
        return;
    }

    const PasswordCredentialCtor = (
        window as Window & {
            PasswordCredential?: new (data: { id: string; password: string; name?: string }) => Credential;
        }
    ).PasswordCredential;

    if (!PasswordCredentialCtor || !navigator.credentials?.store) {
        return;
    }

    try {
        const credential = new PasswordCredentialCtor({
            id: login.trim(),
            password,
            name: login.trim(),
        });
        await navigator.credentials.store(credential);
    } catch {
        // usuário recusou ou navegador não suporta
    }
}
