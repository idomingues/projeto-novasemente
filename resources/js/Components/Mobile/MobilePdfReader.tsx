import { pdfUrlWithViewerParams, stripUrlFragment, usePdfViewerFragment } from '@/lib/pdfViewerUrl';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

type Props = {
    url: string;
    title: string;
    className?: string;
};

export default function MobilePdfReader({ url, title, className = '' }: Props) {
    const pdfViewerFragment = usePdfViewerFragment();
    const iframeUrl = pdfUrlWithViewerParams(url, pdfViewerFragment);
    const plainUrl = stripUrlFragment(url);

    return (
        <div className={`flex min-w-0 flex-col gap-3 overflow-hidden ${className}`}>
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                <iframe
                    title={title}
                    src={iframeUrl}
                    className="block h-[calc(100dvh-14rem)] w-full max-w-full border-0 bg-white dark:bg-zinc-900"
                />
            </div>

            <a
                href={plainUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
                <ArrowTopRightOnSquareIcon className="h-5 w-5 shrink-0" aria-hidden />
                Abrir em tela cheia
            </a>

            <p className="text-center text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                Use dois dedos para ampliar o documento. Para leitura confortável, prefira «Abrir em tela cheia».
            </p>
        </div>
    );
}
