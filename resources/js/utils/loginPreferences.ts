const LAST_LOGIN_KEY = 'ns_last_login_identifier';
const REMEMBER_KEY = 'ns_login_remember';

function canUseStorage(): boolean {
    return typeof window !== 'undefined';
}

export function readLastLogin(): string | null {
    if (!canUseStorage()) {
        return null;
    }
    try {
        const value = localStorage.getItem(LAST_LOGIN_KEY)?.trim();
        return value && value.length > 0 ? value : null;
    } catch {
        return null;
    }
}

export function saveLastLogin(identifier: string): void {
    if (!canUseStorage()) {
        return;
    }
    const trimmed = identifier.trim();
    if (!trimmed) {
        return;
    }
    try {
        localStorage.setItem(LAST_LOGIN_KEY, trimmed);
    } catch {
        // ignorar quota / modo privado
    }
}

export function clearLastLogin(): void {
    if (!canUseStorage()) {
        return;
    }
    try {
        localStorage.removeItem(LAST_LOGIN_KEY);
    } catch {
        // ignorar
    }
}

export function readRememberPreference(): boolean {
    if (!canUseStorage()) {
        return false;
    }
    try {
        return localStorage.getItem(REMEMBER_KEY) === '1';
    } catch {
        return false;
    }
}

export function saveRememberPreference(remember: boolean): void {
    if (!canUseStorage()) {
        return;
    }
    try {
        localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0');
    } catch {
        // ignorar
    }
}

/** Máscara para exibição em telas públicas (ex.: painel Face ID). */
export function maskLoginIdentifier(identifier: string): string {
    const trimmed = identifier.trim();
    if (!trimmed) {
        return '';
    }
    if (trimmed.includes('@')) {
        const [local, domain] = trimmed.split('@');
        if (!domain) {
            return trimmed;
        }
        const visible = local.slice(0, Math.min(2, local.length));
        const maskedLocal = local.length <= 2 ? `${visible}*` : `${visible}${'*'.repeat(Math.min(4, local.length - 2))}`;
        return `${maskedLocal}@${domain}`;
    }
    if (trimmed.length <= 3) {
        return `${trimmed[0] ?? ''}**`;
    }
    return `${trimmed.slice(0, 2)}${'*'.repeat(Math.min(5, trimmed.length - 2))}${trimmed.slice(-1)}`;
}
