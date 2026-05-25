import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function UserPhotoPreviewOverlay({
    photoUrl,
    title,
    onClose,
}: {
    photoUrl: string;
    title: string;
    onClose: () => void;
}) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev === 'hidden' ? '' : prev;
        };
    }, [onClose]);

    useEffect(() => () => {
        document.body.style.overflow = '';
    }, []);

    return createPortal(
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={onClose}
        >
            <button
                type="button"
                className="absolute right-4 top-4 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/25"
                onClick={onClose}
            >
                Fechar
            </button>
            <img
                src={photoUrl}
                alt={title}
                className="max-h-[min(90vh,640px)] max-w-full rounded-2xl object-contain shadow-2xl ring-1 ring-white/10"
                onClick={(e) => e.stopPropagation()}
            />
        </div>,
        document.body,
    );
}
