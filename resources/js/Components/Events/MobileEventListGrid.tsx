import EventCardMedia from '@/Components/Events/EventCardMedia';
import { formatWhenLine, getDayMonth, type MobileEventListItem } from '@/utils/mobileEventDisplay';
import { ClockIcon, MapPinIcon } from '@heroicons/react/24/outline';

type Props = {
    events: MobileEventListItem[];
    onSelect: (event: MobileEventListItem) => void;
    mediaOpensDetail?: boolean;
};

export default function MobileEventListGrid({ events, onSelect, mediaOpensDetail = false }: Props) {
    return (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
            {events.map((ev) => {
                const { day, month } = getDayMonth(ev.starts_at);
                const accent = ev.color || '#059669';

                return (
                    <li key={ev.id} className="h-full min-w-0">
                        <div className="group flex h-full w-full min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-200/90 bg-white text-left shadow-sm transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600">
                            <button
                                type="button"
                                onClick={() => onSelect(ev)}
                                className="flex min-h-[7.5rem] flex-1 cursor-pointer touch-manipulation text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
                            >
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
                            </button>
                            <EventCardMedia
                                ev={ev}
                                onOpenDetail={() => onSelect(ev)}
                                mediaOpensDetail={mediaOpensDetail}
                            />
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}
