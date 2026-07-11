import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import { ArrowTopRightOnSquareIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useCallback, useState } from 'react';
import {
    ADVENTIST_BELIEFS_SOURCE,
    adventistBeliefs,
    type AdventistBelief,
} from '@/data/adventistBeliefs';
import beliefFullText from '@/data/adventistBeliefsFullText.gen';

export default function MobileBeliefs() {
    const [open, setOpen] = useState<AdventistBelief | null>(null);
    const close = useCallback(() => setOpen(null), []);

    const fullBody = (b: AdventistBelief) =>
        (beliefFullText[b.slug] ?? '').trim() || b.summary;

    return (
        <MobileLayout>
            <Head title="Nossas crenças" />
            <div className="space-y-5">
                <div>
                    <Link
                        href={route('mobile.home')}
                        className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
                    >
                        ← Início
                    </Link>
                    <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Nossas crenças</h1>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                        Os adventistas do sétimo dia aceitam a Bíblia como regra de fé e prática. Abaixo estão os 28
                        princípios de fé, com imagens e o{' '}
                        <strong className="font-semibold text-zinc-800 dark:text-zinc-200">
                            texto integral
                        </strong>{' '}
                        publicado pela Igreja Adventista (
                        <a
                            href={ADVENTIST_BELIEFS_SOURCE}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 underline dark:text-primary-400"
                        >
                            institucional.adventistas.org
                        </a>
                        ). Toque em um card para ler a declaração completa (com referências bíblicas).
                    </p>
                </div>

                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
                    {adventistBeliefs.map((b) => (
                        <li key={b.slug} className="min-w-0">
                            <button
                                type="button"
                                onClick={() => setOpen(b)}
                                className="group relative flex aspect-[3/4] w-full overflow-hidden rounded-2xl border border-zinc-200/90 text-left shadow-sm ring-0 transition-all hover:border-zinc-300 hover:shadow-md active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:border-zinc-800 dark:hover:border-zinc-600 dark:focus-visible:ring-offset-zinc-950"
                            >
                                <img
                                    src={b.imageUrl}
                                    alt=""
                                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    loading="lazy"
                                />
                                <div
                                    className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent"
                                    aria-hidden
                                />
                                <div className="relative mt-auto flex w-full flex-col justify-end p-3 sm:p-4">
                                    <span className="text-sm font-bold uppercase leading-snug text-white sm:text-base">
                                        <span className="text-white/85">{b.n}. </span>
                                        {b.title}
                                    </span>
                                    <p className="mt-1 line-clamp-2 text-xs leading-snug text-white/90 sm:line-clamp-3">
                                        {b.summary}
                                    </p>
                                </div>
                            </button>
                        </li>
                    ))}
                </ul>

                <p className="text-center text-xs text-zinc-500 dark:text-zinc-500">
                    Conteúdo doutrinário e imagens de referência: Igreja Adventista do Sétimo Dia — Divisão Sul-Americana.
                </p>
            </div>

            <Modal show={open !== null} onClose={close} maxWidth="lg">
                {open && (
                    <div className="relative">
                        <div className="relative max-h-48 overflow-hidden sm:max-h-56">
                            <img
                                src={open.imageUrl}
                                alt=""
                                className="h-full w-full object-cover object-center"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" aria-hidden />
                            <button
                                type="button"
                                onClick={close}
                                className="absolute right-3 top-3 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
                                aria-label="Fechar"
                            >
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                            <div className="absolute bottom-3 left-4 right-14">
                                <h2 className="text-lg font-bold uppercase leading-tight text-white sm:text-xl">
                                    <span className="text-white/80">{open.n}. </span>
                                    {open.title}
                                </h2>
                            </div>
                        </div>
                        <div className="space-y-4 p-5 sm:p-6">
                            <div className="max-h-[min(55vh,28rem)] overflow-y-auto overscroll-contain rounded-xl border border-zinc-100 bg-zinc-50/80 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/50">
                                <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                                    {fullBody(open)}
                                </p>
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-500">
                                Fonte: Divisão Sul-Americana. No site oficial há também o vídeo explicativo desta crença.
                            </p>
                            <a
                                href={open.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700 sm:w-auto"
                            >
                                Abrir no site oficial
                                <ArrowTopRightOnSquareIcon className="h-5 w-5" />
                            </a>
                            <button
                                type="button"
                                onClick={close}
                                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 sm:w-auto sm:px-8"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </MobileLayout>
    );
}
