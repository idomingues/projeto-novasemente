/** Extrai o ID de vídeo de URLs comuns do YouTube (alinhado ao backend `Musica::youtubeVideoId`). */
export function youtubeVideoIdFromUrl(url: string): string | null {
    const m = url
        .trim()
        .match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    return m?.[1] ?? null;
}

export function youtubeThumbUrlFromVideoUrl(url: string): string | null {
    const id = youtubeVideoIdFromUrl(url);
    return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
}

export function youtubeEmbedUrlFromVideoUrl(url: string): string | null {
    const id = youtubeVideoIdFromUrl(url);
    return id ? `https://www.youtube.com/embed/${id}` : null;
}
