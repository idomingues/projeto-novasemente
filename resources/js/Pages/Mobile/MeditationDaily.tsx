import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeftIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

interface Props {
    ok: boolean;
    html: string;
    error?: string;
    sourceUrl?: string;
}

export default function MobileMeditationDaily({ ok, html, error = '', sourceUrl = '' }: Props) {
    const displayError = (error || '').trim() || 'Não foi possível carregar a meditação agora.';
    const displayHtml = (html || '').trim();

    return (
        <MobileLayout>
            <Head title="Meditação diária" />
            <div className="space-y-4">
                <Link
                    href={route('mobile.home')}
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
                >
                    <ArrowLeftIcon className="h-4 w-4" aria-hidden />
                    Voltar ao início
                </Link>

                <header className="space-y-1">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                        Meditação diária
                    </h1>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">Devocional do dia (melhor esforço).</p>
                </header>

                {!ok || !displayHtml ? (
                    <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                        <p className="font-semibold">Não foi possível mostrar o texto</p>
                        <p className="leading-relaxed">{displayError}</p>
                        {sourceUrl ? (
                            <a
                                href={sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-2"
                            >
                                <ArrowTopRightOnSquareIcon className="h-4 w-4 shrink-0" aria-hidden />
                                Abrir no site original
                            </a>
                        ) : null}
                    </div>
                ) : (
                    <article className="space-y-4">
                        <div
                            className="rounded-2xl border border-zinc-200/90 bg-white p-4 text-sm leading-relaxed text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 [&_a]:font-medium [&_a]:text-primary-600 [&_a]:underline dark:[&_a]:text-primary-400 [&_blockquote]:my-3 [&_blockquote]:rounded-xl [&_blockquote]:border [&_blockquote]:border-dashed [&_blockquote]:border-zinc-300 [&_blockquote]:bg-white/90 [&_blockquote]:px-3.5 [&_blockquote]:py-3 dark:[&_blockquote]:border-zinc-600 dark:[&_blockquote]:bg-zinc-900/50 [&_blockquote+p]:mt-4 [&_blockquote+h2]:mt-6 [&_blockquote+blockquote]:mt-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2+p]:mt-3 [&_h2+p>em]:text-[15px] [&_h2+p>em]:leading-relaxed [&_h2+p>em]:text-zinc-700 dark:[&_h2+p>em]:text-zinc-300 [&_h3]:mt-2 [&_h3]:text-base [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_p:first-of-type]:text-[15px] [&_p+h2]:mt-6 [&_p+p]:mt-5 [&_p+p]:border-t [&_p+p]:border-zinc-200 [&_p+p]:pt-5 dark:[&_p+p]:border-zinc-700 [&_ul]:list-disc [&_ul]:pl-5"
                            dangerouslySetInnerHTML={{ __html: displayHtml }}
                        />

                        {sourceUrl ? (
                            <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                                <a
                                    href={sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 font-medium text-primary-600 underline-offset-2 hover:underline dark:text-primary-400"
                                >
                                    <ArrowTopRightOnSquareIcon className="h-4 w-4 shrink-0" aria-hidden />
                                    Abrir no site original
                                </a>
                            </p>
                        ) : null}
                    </article>
                )}
            </div>
        </MobileLayout>
    );
}

