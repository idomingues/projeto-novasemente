import MobileLayout from '@/Layouts/MobileLayout';
import { Head } from '@inertiajs/react';
import {
    MapPinIcon,
    ClockIcon,
    CalendarDaysIcon,
    BanknotesIcon,
    XMarkIcon,
    TicketIcon,
    ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import Modal from '@/Components/Modal';
import ImageDownloadButton from '@/Components/ImageDownloadButton';
import {
    formatWhenLine,
    getDayMonth,
    priceText,
    type MobileEventListItem,
} from '@/utils/mobileEventDisplay';
import { useState, useCallback } from 'react';

interface Props {
    events: MobileEventListItem[];
}

export default function MobileEvents({ events }: Props) {
    const [selected, setSelected] = useState<MobileEventListItem | null>(null);
    const closeModal = useCallback(() => setSelected(null), []);

    return (
        <MobileLayout>
            <Head title="Eventos" />
            <div className="space-y-6">
                {events.length === 0 ? (
                    <div className="py-12 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                            <CalendarDaysIcon className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
                        </div>
                        <p className="text-zinc-600 dark:text-zinc-400 font-medium">Nenhum evento cadastrado</p>
                        <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-1">Os eventos aparecerão aqui.</p>
                    </div>
                ) : (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
                        {events.map((ev) => {
                            const { day, month } = getDayMonth(ev.starts_at);
                            const accent = ev.color || '#059669';
                            return (
                                <li key={ev.id} className="h-full min-w-0">
                                    <button
                                        type="button"
                                        onClick={() => setSelected(ev)}
                                        className="group flex h-full w-full min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-200/90 bg-white text-left shadow-sm ring-0 transition-all hover:border-zinc-300 hover:shadow-md active:scale-[0.99] dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                                    >
                                        <div className="flex min-h-[7.5rem] flex-1">
                                            <div
                                                className="flex w-[4.25rem] shrink-0 flex-col items-center justify-center px-2 py-3 text-white sm:w-[4.5rem]"
                                                style={{ backgroundColor: accent }}
                                            >
                                                <span className="text-2xl font-bold leading-none tabular-nums">{day}</span>
                                                <span className="mt-1 text-[0.65rem] font-semibold uppercase tracking-wide opacity-95">
                                                    {month}
                                                </span>
                                            </div>
                                            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 p-3 sm:p-4">
                                                <div className="flex flex-wrap items-start gap-2">
                                                    <h2 className="line-clamp-2 min-w-0 flex-1 text-base font-semibold leading-snug text-zinc-900 dark:text-white">
                                                        {ev.title}
                                                    </h2>
                                                    {ev.purchase_url && String(ev.purchase_url).trim() !== '' && (
                                                        <span className="shrink-0 rounded-full bg-primary-600 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-white">
                                                            Compra
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-start gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                                                    <ClockIcon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" />
                                                    <span className="leading-snug">{formatWhenLine(ev)}</span>
                                                </div>
                                                {ev.location && (
                                                    <div className="flex items-start gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                                                        <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" />
                                                        <span className="truncate">{ev.location}</span>
                                                    </div>
                                                )}
                                                {ev.description && (
                                                    <p className="line-clamp-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                                                        {ev.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {ev.image_url ? (
                                            <div className="relative border-t border-zinc-100 dark:border-zinc-800">
                                                <img
                                                    src={ev.image_url}
                                                    alt=""
                                                    className="aspect-[16/10] w-full object-cover sm:aspect-[2/1]"
                                                    loading="lazy"
                                                />
                                                <ImageDownloadButton
                                                    src={ev.image_url}
                                                    filenameBase={`evento-${ev.id}`}
                                                    className="absolute bottom-2 right-2 z-10"
                                                    stopPropagation
                                                    size="sm"
                                                />
                                            </div>
                                        ) : null}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            <Modal show={selected !== null} onClose={closeModal} maxWidth="lg">
                {selected && (
                    <>
                        <div className="relative">
                            {selected.image_url ? (
                                <img
                                    src={selected.image_url}
                                    alt=""
                                    className="max-h-52 w-full object-cover sm:max-h-64"
                                />
                            ) : null}
                            {selected.image_url ? (
                                <ImageDownloadButton
                                    src={selected.image_url}
                                    filenameBase={`evento-${selected.id}`}
                                    className="absolute bottom-3 right-3 z-10"
                                    size="sm"
                                />
                            ) : null}
                            <button
                                type="button"
                                onClick={closeModal}
                                className="absolute right-3 top-3 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
                                aria-label="Fechar"
                            >
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="space-y-4 p-5 sm:p-6">
                            <div>
                                <p
                                    className="mb-2 inline-flex rounded-lg px-2 py-0.5 text-xs font-semibold uppercase text-white"
                                    style={{ backgroundColor: selected.color || '#059669' }}
                                >
                                    {getDayMonth(selected.starts_at).day}{' '}
                                    {getDayMonth(selected.starts_at).month}
                                </p>
                                <h2 className="text-xl font-bold text-zinc-900 dark:text-white sm:text-2xl">
                                    {selected.title}
                                </h2>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                                <span className="inline-flex items-center gap-2">
                                    <ClockIcon className="h-5 w-5 shrink-0 text-zinc-400" />
                                    {formatWhenLine(selected)}
                                </span>
                                {selected.location && (
                                    <span className="inline-flex min-w-0 items-center gap-2">
                                        <MapPinIcon className="h-5 w-5 shrink-0 text-zinc-400" />
                                        <span className="break-words">{selected.location}</span>
                                    </span>
                                )}
                            </div>
                            {selected.description ? (
                                <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800">
                                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                                        {selected.description}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-sm italic text-zinc-500 dark:text-zinc-500">Sem descrição adicional.</p>
                            )}
                            {selected.purchase_url && String(selected.purchase_url).trim() !== '' && (
                                <a
                                    href={selected.purchase_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary-600 to-emerald-600 px-4 py-4 text-base font-bold text-white shadow-lg shadow-primary-600/25 transition-transform active:scale-[0.98] dark:from-primary-500 dark:to-emerald-500 dark:shadow-primary-900/40"
                                >
                                    <TicketIcon className="h-6 w-6 shrink-0" aria-hidden />
                                    Comprar ou inscrever-se
                                    <ArrowTopRightOnSquareIcon className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
                                </a>
                            )}
                            {priceText(selected.price) && (
                                <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/90 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/40">
                                    <div className="flex items-start gap-2">
                                        <BanknotesIcon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                        <div className="min-w-0">
                                            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                                                Valor e condições
                                            </p>
                                            <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-zinc-900 dark:text-zinc-100">
                                                {priceText(selected.price)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={closeModal}
                                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 sm:w-auto sm:px-8"
                            >
                                Fechar
                            </button>
                        </div>
                    </>
                )}
            </Modal>
        </MobileLayout>
    );
}
