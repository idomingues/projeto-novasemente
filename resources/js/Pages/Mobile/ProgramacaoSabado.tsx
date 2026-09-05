import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeftIcon, ClockIcon } from '@heroicons/react/24/outline';
import PdfReflowReader from '@/Components/Mobile/PdfReflowReader';

type ProgramPayload =
    | {
          status: 'available';
          id: number;
          title: string;
          saturday_date: string | null;
          pdf_url: string;
      }
    | {
          status: 'waiting';
          message: string;
      };

interface Props {
    program: ProgramPayload;
}

type PageProps = { appUrl?: string };

function imageSrc(url: string, appUrl: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = appUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    return `${base}${url}`;
}

function formatSaturday(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
}

export default function ProgramacaoSabado({ program }: Props) {
    const appUrl = (usePage().props as PageProps).appUrl ?? '';
    const backHref = route('mobile.conheca');

    if (program.status === 'available' && program.pdf_url) {
        const pdf = imageSrc(program.pdf_url, appUrl);
        const subtitle = formatSaturday(program.saturday_date);

        return (
            <MobileLayout>
                <Head title={program.title} />
                <div className="-mx-4 min-w-0 overflow-x-hidden sm:mx-0">
                    <div className="mb-3 px-4 sm:px-0">
                        <Link
                            href={backHref}
                            className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
                        >
                            <ArrowLeftIcon className="h-4 w-4" aria-hidden />
                            Conheça a Nova Semente
                        </Link>
                    </div>
                    <PdfReflowReader
                        title={program.title}
                        subtitle={subtitle || null}
                        pdfUrl={pdf}
                        originalPdfUrl={pdf}
                        contentKey={`saturday-program:${program.id}`}
                        className="sm:px-0"
                    />
                </div>
            </MobileLayout>
        );
    }

    const message =
        program.status === 'waiting'
            ? program.message
            : 'Aguarde a publicação do próximo sábado.';

    return (
        <MobileLayout>
            <Head title="Programação do Sábado" />
            <div className="mx-auto w-full max-w-lg space-y-6 pb-4 sm:max-w-xl md:max-w-2xl">
                <div>
                    <Link
                        href={backHref}
                        className="cursor-pointer text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
                    >
                        ← Conheça a Nova Semente
                    </Link>
                    <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                        Programação do Sábado
                    </h1>
                </div>

                <section
                    aria-live="polite"
                    className="flex flex-col items-center gap-3 rounded-2xl bg-white px-5 py-10 text-center shadow-sm ring-1 ring-zinc-200/90 dark:bg-zinc-900 dark:ring-zinc-700"
                >
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-50 text-zinc-500 ring-1 ring-inset ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600">
                        <ClockIcon className="h-6 w-6" aria-hidden />
                    </span>
                    <p className="max-w-sm text-[15px] font-medium leading-relaxed text-zinc-700 dark:text-zinc-200">
                        {message}
                    </p>
                </section>
            </div>
        </MobileLayout>
    );
}
