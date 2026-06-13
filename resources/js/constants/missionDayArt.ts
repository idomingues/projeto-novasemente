export const MISSION_DAY_ART = {
    stories: '/images/mission/mission-day/stories.png',
    central: '/images/mission/mission-day/central.png',
    left: '/images/mission/mission-day/left.png',
    right: '/images/mission/mission-day/right.png',
    total: '/images/mission/mission-day/total.png',
} as const;

export const MISSION_DAY_ALT =
    'Mission Day — domingo 14 de junho de 2026, 17 horas, Nova Semente, Rua Cubatão 48, Paraíso — SP';

export function isMissionDayEvent(title: string): boolean {
    return /mission\s*day/i.test(title);
}
