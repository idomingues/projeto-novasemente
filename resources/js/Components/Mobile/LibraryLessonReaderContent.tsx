import Modal from '@/Components/Modal';
import { useCallback, useState } from 'react';

type VerseRow = { verse: number; text: string };

type VerseModalState =
    | { status: 'loading'; ref: string }
    | { status: 'ok'; ref: string; book: string; chapter: number; verses: VerseRow[] }
    | { status: 'error'; ref: string; error: string };

type Props = {
    html: string;
    className?: string;
};

const bibleRefLinkClass =
    '[&_.bible-ref-link]:cursor-pointer [&_.bible-ref-link]:border-0 [&_.bible-ref-link]:bg-transparent [&_.bible-ref-link]:p-0 [&_.bible-ref-link]:font-semibold [&_.bible-ref-link]:text-teal-700 [&_.bible-ref-link]:underline [&_.bible-ref-link]:underline-offset-2 [&_.bible-ref-link]:transition hover:[&_.bible-ref-link]:text-teal-900 dark:[&_.bible-ref-link]:text-teal-300 dark:hover:[&_.bible-ref-link]:text-teal-200';

export default function LibraryLessonReaderContent({ html, className = '' }: Props) {
    const [verseModal, setVerseModal] = useState<VerseModalState | null>(null);

    const openVerseModal = useCallback(async (ref: string) => {
        setVerseModal({ status: 'loading', ref });

        try {
            const url = new URL(route('mobile.bible.reference'), window.location.origin);
            url.searchParams.set('ref', ref);

            const response = await fetch(url.toString(), {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'same-origin',
            });

            const data: {
                ok?: boolean;
                ref?: string;
                book?: string;
                chapter?: number;
                verses?: VerseRow[];
                error?: string;
            } = await response.json();

            if (!response.ok || !data.ok || !Array.isArray(data.verses) || data.verses.length === 0) {
                setVerseModal({
                    status: 'error',
                    ref,
                    error: data.error ?? 'Não foi possível carregar o versículo.',
                });
                return;
            }

            setVerseModal({
                status: 'ok',
                ref: data.ref ?? ref,
                book: data.book ?? '',
                chapter: data.chapter ?? 0,
                verses: data.verses,
            });
        } catch {
            setVerseModal({
                status: 'error',
                ref,
                error: 'Não foi possível carregar o versículo.',
            });
        }
    }, []);

    const handleContentClick = useCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
            const target = (event.target as HTMLElement | null)?.closest('[data-bible-ref]');
            if (!(target instanceof HTMLElement)) {
                return;
            }

            event.preventDefault();
            const ref = target.getAttribute('data-bible-ref')?.trim();
            if (!ref) {
                return;
            }

            void openVerseModal(ref);
        },
        [openVerseModal],
    );

    return (
        <>
            <div
                className={`${className} ${bibleRefLinkClass}`}
                onClick={handleContentClick}
                dangerouslySetInnerHTML={{ __html: html }}
            />

            <Modal show={verseModal !== null} onClose={() => setVerseModal(null)} maxWidth="lg">
                {verseModal ? (
                    <>
                        <div className="border-b border-zinc-100 px-5 py-4 pr-12 dark:border-zinc-800 sm:pr-14">
                            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
                                Versículo bíblico
                            </p>
                            <h2 className="mt-0.5 text-lg font-bold text-zinc-900 dark:text-white">
                                {verseModal.status === 'ok' ? verseModal.ref : verseModal.ref}
                            </h2>
                        </div>

                        <div className="max-h-[min(70vh,32rem)] overflow-y-auto p-5">
                            {verseModal.status === 'loading' ? (
                                <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">A carregar versículo…</p>
                            ) : verseModal.status === 'error' ? (
                                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                                    {verseModal.error}
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    {verseModal.verses.map((verse) => (
                                        <p key={verse.verse} className="text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-100">
                                            <sup className="mr-1.5 font-bold text-teal-700 dark:text-teal-300">{verse.verse}</sup>
                                            {verse.text}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                ) : null}
            </Modal>
        </>
    );
}
