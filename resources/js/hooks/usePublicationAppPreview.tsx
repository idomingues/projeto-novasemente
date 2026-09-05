import { useCallback, useState, type ReactNode } from 'react';
import PublicationAppPreview, {
    type PublicationAppPreviewData,
} from '@/Components/AppPhonePreview/PublicationAppPreview';

/** Estado + modal reutilizável para pré-visualizar publicações no celular. */
export function usePublicationAppPreview(): {
    openPreview: (next: PublicationAppPreviewData) => void;
    closePreview: () => void;
    previewModal: ReactNode;
} {
    const [item, setItem] = useState<PublicationAppPreviewData | null>(null);

    const openPreview = useCallback((next: PublicationAppPreviewData) => {
        setItem(next);
    }, []);

    const closePreview = useCallback(() => {
        setItem(null);
    }, []);

    const previewModal = (
        <PublicationAppPreview show={item != null} item={item} onClose={closePreview} />
    );

    return { openPreview, closePreview, previewModal };
}

export type { PublicationAppPreviewData };
