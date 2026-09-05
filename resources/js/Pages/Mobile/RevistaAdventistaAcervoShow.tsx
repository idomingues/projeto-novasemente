import MobileLayout from '@/Layouts/MobileLayout';
import MagazineReader from '@/Components/Mobile/MagazineReader';
import { Head } from '@inertiajs/react';

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
                <MagazineReader
                    title={edition.title}
                    subtitle={subtitle}
                    coverUrl={edition.cover_url}
                    pdfUrl={edition.pdf_url}
                    downloadUrl={route('mobile.acervo-revista-adventista.pdf-download', edition.id)}
                    originalPdfUrl={edition.source_pdf_url}
                    contentKey={`revista-adventista:edition:${edition.id}`}
                    backHref={route('mobile.biblioteca', { tab: 'magazines', ano: edition.year })}
                    backLabel={`Voltar à biblioteca (${edition.year})`}
                    className="sm:px-0"
                />

                <p className="mt-6 px-4 text-center text-xs text-zinc-500 dark:text-zinc-500 sm:px-0">
                    Conteúdo © Revista Adventista / detentores dos acervos de origem
                </p>
            </div>
        </MobileLayout>
    );
}
