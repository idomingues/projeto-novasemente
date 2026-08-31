import MobileLayout from '@/Layouts/MobileLayout';
import MagazineReader from '@/Components/Mobile/MagazineReader';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

interface Edition {
    id: number;
    title: string;
    year: number;
    month: number;
    month_label: string;
    cover_url: string | null;
    has_pdf: boolean;
    pdf_url: string;
    source_pdf_url: string | null;
}

interface Props {
    edition: Edition;
}

export default function MobileRevistaAdventistaAcervoShow({ edition }: Props) {
    const subtitle = `Acervo histórico da Revista Adventista · ${edition.month_label} ${edition.year}`;

    return (
        <MobileLayout>
            <Head title={edition.title} />

            <div className="-mx-4 min-w-0 overflow-x-hidden sm:mx-0">
                <div className="mb-3 px-4 sm:px-0">
                    <Link
                        href={route('mobile.biblioteca', { tab: 'revista_adventista_acervo', ano: edition.year })}
                        className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
                    >
                        <ArrowLeftIcon className="h-4 w-4" aria-hidden />
                        Voltar à biblioteca ({edition.year})
                    </Link>
                </div>

                <MagazineReader
                    title={edition.title}
                    subtitle={subtitle}
                    coverUrl={edition.cover_url}
                    pdfUrl={edition.pdf_url}
                    downloadUrl={route('mobile.acervo-revista-adventista.pdf-download', edition.id)}
                    originalPdfUrl={edition.source_pdf_url}
                    contentKey={`revista-adventista:edition:${edition.id}`}
                    className="sm:px-0"
                />

                <p className="mt-6 px-4 text-center text-xs text-zinc-500 dark:text-zinc-500 sm:px-0">
                    Conteúdo © Revista Adventista / detentores dos acervos de origem
                </p>
            </div>
        </MobileLayout>
    );
}
