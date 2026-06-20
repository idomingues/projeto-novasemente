export function missionVolunteerWhatsAppDigits(phone: string | null | undefined): string {
    const digits = (phone ?? '').replace(/\D+/g, '');
    if (digits === '') {
        return '';
    }
    if (!digits.startsWith('55') && digits.length <= 11) {
        return `55${digits}`;
    }

    return digits;
}

export function buildMissionVolunteerWhatsAppText(fullName: string, defaultMessage: string): string {
    const name = fullName.trim();
    const greeting = name ? `Olá, ${name},` : 'Olá,';
    const body = defaultMessage.trim();

    return body ? `${greeting}\n\n${body}` : greeting;
}

export function missionVolunteerWhatsAppUrl(phone: string | null | undefined, message: string): string | null {
    const digits = missionVolunteerWhatsAppDigits(phone);
    if (digits === '') {
        return null;
    }

    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
