/** Legenda do feed: remove HTML, mantém quebras de linha, evita repetir o título no texto. */
export function feedCaptionText(htmlOrPlain: string, postTitle?: string): string {
    const raw = htmlOrPlain.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (!raw.trim()) {
        return '';
    }

    let text = raw
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>\s*/gi, '\n\n')
        .replace(/<p[^>]*>/gi, '')
        .replace(/<[^>]+>/g, '');

    text = text
        .split('\n')
        .map((line) => line.replace(/[^\S\n]+/g, ' ').trimEnd())
        .join('\n')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    const title = postTitle?.trim();
    if (!title || !text) {
        return text;
    }

    const lines = text.split('\n');
    if (lines[0]?.trim() === title) {
        return lines.slice(1).join('\n').replace(/^\n+/, '').trim();
    }

    if (text.startsWith(title)) {
        return text.slice(title.length).replace(/^[\s:.\-–—]+/, '').trim();
    }

    return text;
}

/** Blocos separados por linha em branco (parágrafos), como no Instagram. */
export function feedCaptionParagraphs(caption: string): string[] {
    if (!caption.trim()) {
        return [];
    }

    return caption
        .split(/\n\n+/)
        .map((block) => block.trim())
        .filter((block) => block.length > 0);
}
