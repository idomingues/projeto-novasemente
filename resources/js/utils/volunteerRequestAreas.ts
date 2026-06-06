type RowWithArea = {
    subject: string;
    ministry_id: number | null;
};

export function areaLabelFromSubject(subject: string): string {
    const parts = subject.split('—').map((part) => part.trim()).filter(Boolean);
    if (parts.length >= 2) return parts[1] ?? 'Sem área';
    return 'Sem área';
}

export function areaLabelForRow(
    row: RowWithArea,
    ministryNameById: Map<number, string>,
): string {
    const fromMinistry =
        row.ministry_id != null && row.ministry_id > 0 ? ministryNameById.get(row.ministry_id) : null;
    const area = fromMinistry ?? areaLabelFromSubject(row.subject);
    return area || 'Sem área';
}

export type VolunteerRequestAreaTag = {
    area: string;
    count: number;
};

export function buildVolunteerRequestAreaTags(
    rows: RowWithArea[],
    _ministries: { name: string }[],
    ministryNameById: Map<number, string>,
): VolunteerRequestAreaTag[] {
    const counts = new Map<string, number>();

    rows.forEach((row) => {
        const key = areaLabelForRow(row, ministryNameById);
        counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    return Array.from(counts.entries())
        .filter(([, count]) => count > 0)
        .sort(([a], [b]) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))
        .map(([area, count]) => ({ area, count }));
}

export function filterVolunteerRequestRowsByArea<T extends RowWithArea>(
    rows: T[],
    area: string,
    ministryNameById: Map<number, string>,
): T[] {
    return rows.filter((row) => areaLabelForRow(row, ministryNameById) === area);
}
