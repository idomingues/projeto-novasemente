/** ISO `YYYY-MM-DD` (ou com hora) → `DD/MM/AAAA` para digitação/exibição. */
export function isoToBrDate(iso: string | null | undefined): string {
    if (!iso?.trim()) {
        return '';
    }
    const part = iso.trim().split('T')[0];
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(part);
    if (!m) {
        return '';
    }
    return `${m[3]}/${m[2]}/${m[1]}`;
}

/** Aplica máscara `DD/MM/AAAA` enquanto o usuário digita (apenas dígitos). */
export function maskBrDateTyping(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) {
        return digits;
    }
    if (digits.length <= 4) {
        return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** `DD/MM/AAAA` ou só dígitos → ISO `YYYY-MM-DD`, ou `null` se incompleto/inválido. */
export function brDateToIso(br: string): string | null {
    const digits = br.replace(/\D/g, '');
    if (digits.length !== 8) {
        return null;
    }
    const day = Number(digits.slice(0, 2));
    const month = Number(digits.slice(2, 4));
    const year = Number(digits.slice(4, 8));
    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) {
        return null;
    }
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
        return null;
    }
    return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Data de hoje no fuso local, em ISO `YYYY-MM-DD`. */
export function todayIsoLocal(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export function isIsoDateInRange(iso: string, min?: string, max?: string): boolean {
    if (min && iso < min) {
        return false;
    }
    if (max && iso > max) {
        return false;
    }
    return true;
}
