/** Lista legível com no máximo `max` itens, seguida de reticências quando há mais. */
export function formatListPreview(items: string[], max = 3): string {
    const list = items.map((s) => s.trim()).filter(Boolean);
    if (list.length === 0) {
        return '';
    }
    if (list.length <= max) {
        return list.join(', ');
    }

    return `${list.slice(0, max).join(', ')}...`;
}
