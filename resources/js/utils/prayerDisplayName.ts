export interface PrayerDisplayItem {
    name_or_nickname: string;
    is_anonymous?: boolean;
}

export function prayerDisplayName(item: PrayerDisplayItem): string | null {
    if (item.is_anonymous) {
        return 'Anônimo';
    }

    const name = item.name_or_nickname?.trim();

    return name || null;
}
