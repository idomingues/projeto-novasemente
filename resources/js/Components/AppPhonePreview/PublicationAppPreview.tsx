import AppPhonePreview from '@/Components/AppPhonePreview/AppPhonePreview';

export type PublicationAppPreviewData = {
    typeLabel: string;
    title: string;
    excerpt?: string | null;
    imageUrl?: string | null;
    meta?: string[];
    publishedLabel?: string | null;
    /** Texto do “voltar” no topo do preview. */
    backLabel?: string;
};

type Props = {
    show: boolean;
    onClose: () => void;
    item: PublicationAppPreviewData | null;
};

export function formatPublicationPreviewDate(iso: string | null | undefined): string | null {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

/**
 * Preview genérico de publicação (card no estilo do feed) dentro do celular.
 */
export default function PublicationAppPreview({ show, onClose, item }: Props) {
    const title = item?.title?.trim() || 'Publicação';
    const excerpt = item?.excerpt?.trim() || '';
    const imageUrl = item?.imageUrl?.trim() || '';
    const typeLabel = item?.typeLabel?.trim() || 'Publicação';
    const backLabel = item?.backLabel?.trim() || '← Publicações';
    const when = item?.publishedLabel?.trim() || null;
    const meta = (item?.meta ?? []).filter(Boolean);

    return (
        <AppPhonePreview show={show} onClose={onClose}>
            {!item ? (
                <p className="py-10 text-center text-sm text-zinc-500">Nada para pré-visualizar.</p>
            ) : (
                <div className="space-y-3">
                    <p className="text-[12px] font-medium text-teal-700 dark:text-teal-300">{backLabel}</p>

                    <article className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200/90 dark:bg-zinc-900 dark:ring-zinc-700">
                        {imageUrl ? (
                            <div className="aspect-[4/3] bg-zinc-100 dark:bg-zinc-800">
                                <img
                                    src={imageUrl}
                                    alt=""
                                    className="h-full w-full object-cover object-center"
                                />
                            </div>
                        ) : (
                            <div className="flex aspect-[4/3] items-center justify-center bg-zinc-100 text-xs font-medium text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
                                Sem capa
                            </div>
                        )}

                        <div className="space-y-2 p-3.5">
                            <span className="inline-flex rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-800 ring-1 ring-inset ring-teal-200/80 dark:bg-teal-950/45 dark:text-teal-200 dark:ring-teal-800/60">
                                {typeLabel}
                            </span>
                            <h2 className="text-[15px] font-semibold leading-snug text-zinc-900 dark:text-white">
                                {title}
                            </h2>
                            {excerpt ? (
                                <p className="line-clamp-4 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-300">
                                    {excerpt}
                                </p>
                            ) : null}
                            {(when || meta.length > 0) && (
                                <div className="flex flex-wrap gap-x-2 gap-y-1 pt-1 text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                                    {when ? <span>{when}</span> : null}
                                    {meta.map((m) => (
                                        <span key={m}>· {m}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </article>
                </div>
            )}
        </AppPhonePreview>
    );
}
