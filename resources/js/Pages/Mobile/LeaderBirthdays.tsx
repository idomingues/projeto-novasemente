import MobileLayout from '@/Layouts/MobileLayout';
import UserListAvatar from '@/Components/UserListAvatar';
import { Head, Link, router } from '@inertiajs/react';
import {
    CakeIcon,
    ChatBubbleLeftRightIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    GiftIcon,
} from '@heroicons/react/24/outline';
import { CakeIcon as CakeSolidIcon } from '@heroicons/react/24/solid';

type BirthdayRow = {
    id: number;
    name: string;
    photoUrl: string | null;
    birthDate: string;
    day: number;
    isToday: boolean;
    isSelf?: boolean;
    ministryNames: string[];
    userId?: number | null;
    ministryId?: number | null;
    canCongratulate?: boolean;
    congratulateUrl?: string | null;
};

type BirthdayScope = 'area' | 'all';

interface Props {
    month: number;
    year: number;
    monthLabel: string;
    churchName: string;
    birthdays: BirthdayRow[];
    todayCount: number;
    isCurrentMonth: boolean;
    nsWhatsEnabled?: boolean;
    canViewAllVolunteers?: boolean;
    scope?: BirthdayScope;
    hasAreaScope?: boolean;
}

function capitalizeMonthLabel(label: string): string {
    if (!label) {
        return label;
    }
    return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Formata `YYYY-MM-DD` sem deslocar o dia por fuso (evita `new Date('YYYY-MM-DD')` em UTC). */
function formatDayMonth(birthDate: string): string {
    const part = birthDate.trim().split('T')[0] ?? '';
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(part);
    if (!m) {
        return birthDate;
    }
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
}

export default function LeaderBirthdays({
    month,
    year,
    monthLabel,
    churchName,
    birthdays,
    todayCount,
    isCurrentMonth,
    nsWhatsEnabled = true,
    canViewAllVolunteers = false,
    scope = 'area',
    hasAreaScope = true,
}: Props) {
    const isAllScope = scope === 'all';

    const navigate = (next: { month?: number; year?: number; scope?: BirthdayScope }) => {
        const m = next.month ?? month;
        const y = next.year ?? year;
        const nextScope = next.scope ?? scope;
        const query: Record<string, number | string> = { month: m, year: y };
        if (canViewAllVolunteers && nextScope === 'all') {
            query.scope = 'all';
        }
        router.get(route('mobile.leader.birthdays'), query, { preserveScroll: true });
    };

    const goMonth = (delta: number) => {
        let m = month + delta;
        let y = year;
        if (m < 1) {
            m = 12;
            y -= 1;
        } else if (m > 12) {
            m = 1;
            y += 1;
        }
        navigate({ month: m, year: y });
    };

    const todayRows = birthdays.filter((b) => b.isToday);
    const upcomingRows = birthdays.filter((b) => !b.isToday);

    return (
        <MobileLayout>
            <Head title="Aniversariantes do mês" />

            <div className="mx-auto w-full max-w-lg space-y-5 pb-8 sm:max-w-xl">
                <div>
                    <Link
                        href={route('mobile.profile')}
                        className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-rose-700 hover:underline dark:text-rose-300"
                    >
                        ← Meu perfil
                    </Link>
                </div>

                <section className="relative overflow-hidden rounded-3xl border border-rose-200/80 bg-gradient-to-br from-rose-50 via-white to-amber-50 p-5 shadow-sm dark:border-rose-900/50 dark:from-rose-950 dark:via-zinc-900 dark:to-amber-950/40">
                    <div
                        className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-rose-200/40 blur-2xl dark:bg-rose-700/20"
                        aria-hidden
                    />
                    <div
                        className="pointer-events-none absolute -bottom-12 left-8 h-28 w-28 rounded-full bg-amber-200/50 blur-2xl dark:bg-amber-700/15"
                        aria-hidden
                    />

                    <div className="relative flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-rose-800 ring-1 ring-rose-200/80 dark:bg-rose-950/60 dark:text-rose-100 dark:ring-rose-800/60">
                                <CakeSolidIcon className="h-3.5 w-3.5" aria-hidden />
                                Aniversariantes
                            </div>
                            <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                                {capitalizeMonthLabel(monthLabel)}
                            </h1>
                            <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                                {isAllScope
                                    ? `Todos os voluntários de ${churchName}, em ordem alfabética.`
                                    : `Pessoas da sua área em ${churchName}. Envie parabéns pelo NS Conecta.`}
                            </p>
                        </div>
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/80 shadow-sm ring-1 ring-rose-100 dark:bg-zinc-900/70 dark:ring-rose-900/50">
                            <GiftIcon className="h-7 w-7 text-rose-600 dark:text-rose-300" aria-hidden />
                        </div>
                    </div>

                    {canViewAllVolunteers ? (
                        <div
                            className="relative mt-4 grid grid-cols-2 gap-1 rounded-2xl bg-white/70 p-1 ring-1 ring-rose-200/70 dark:bg-zinc-950/40 dark:ring-rose-900/50"
                            role="tablist"
                            aria-label="Escopo dos aniversariantes"
                        >
                            <button
                                type="button"
                                role="tab"
                                aria-selected={!isAllScope}
                                disabled={!hasAreaScope}
                                onClick={() => navigate({ scope: 'area' })}
                                className={`cursor-pointer rounded-xl px-3 py-2 text-center text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${
                                    !isAllScope
                                        ? 'bg-rose-600 text-white shadow-sm dark:bg-rose-500'
                                        : 'text-zinc-600 hover:bg-white/80 dark:text-zinc-300 dark:hover:bg-zinc-800/70'
                                }`}
                            >
                                Minha área
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={isAllScope}
                                onClick={() => navigate({ scope: 'all' })}
                                className={`cursor-pointer rounded-xl px-3 py-2 text-center text-xs font-semibold transition ${
                                    isAllScope
                                        ? 'bg-rose-600 text-white shadow-sm dark:bg-rose-500'
                                        : 'text-zinc-600 hover:bg-white/80 dark:text-zinc-300 dark:hover:bg-zinc-800/70'
                                }`}
                            >
                                Todos A–Z
                            </button>
                        </div>
                    ) : null}

                    <div className="relative mt-5 flex items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={() => goMonth(-1)}
                            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-rose-200/80 bg-white/80 text-zinc-700 shadow-sm transition hover:bg-white dark:border-rose-900/50 dark:bg-zinc-900/70 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            aria-label="Mês anterior"
                        >
                            <ChevronLeftIcon className="h-5 w-5" />
                        </button>
                        <div className="text-center">
                            <p className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-white">
                                {birthdays.length}{' '}
                                {birthdays.length === 1 ? 'aniversariante' : 'aniversariantes'}
                            </p>
                            {isCurrentMonth && todayCount > 0 ? (
                                <p className="mt-0.5 text-xs font-medium text-rose-700 dark:text-rose-300">
                                    {todayCount === 1 ? '1 aniversário hoje' : `${todayCount} aniversários hoje`}
                                </p>
                            ) : (
                                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                                    {isAllScope ? 'Ordenados por nome' : 'Ordenados por dia do mês'}
                                </p>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => goMonth(1)}
                            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-rose-200/80 bg-white/80 text-zinc-700 shadow-sm transition hover:bg-white dark:border-rose-900/50 dark:bg-zinc-900/70 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            aria-label="Próximo mês"
                        >
                            <ChevronRightIcon className="h-5 w-5" />
                        </button>
                    </div>
                </section>

                {birthdays.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-zinc-300 bg-white/70 px-5 py-12 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
                        <CakeIcon className="mx-auto h-10 w-10 text-zinc-300 dark:text-zinc-600" aria-hidden />
                        <p className="mt-3 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                            Nenhum aniversariante neste mês
                        </p>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            {isAllScope
                                ? 'Só aparecem voluntários ativos da igreja com data de nascimento cadastrada.'
                                : 'Só aparecem voluntários ativos da sua área com data de nascimento cadastrada.'}
                        </p>
                    </div>
                ) : isAllScope ? (
                    <section className="space-y-3">
                        <h2 className="px-1 text-xs font-bold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                            Todos os voluntários
                        </h2>
                        <ul className="space-y-2">
                            {birthdays.map((row) => (
                                <li key={row.id}>
                                    <BirthdayCard
                                        row={row}
                                        highlight={row.isToday}
                                        nsWhatsEnabled={nsWhatsEnabled}
                                    />
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : (
                    <div className="space-y-6">
                        {todayRows.length > 0 ? (
                            <section className="space-y-3">
                                <div className="flex items-center gap-2 px-1">
                                    <span className="inline-flex h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_0_4px_rgba(244,63,94,0.18)] dark:shadow-[0_0_0_4px_rgba(244,63,94,0.25)]" />
                                    <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-rose-700 dark:text-rose-300">
                                        Hoje
                                    </h2>
                                </div>
                                <ul className="space-y-2.5">
                                    {todayRows.map((row) => (
                                        <li key={`today-${row.id}`}>
                                            <BirthdayCard row={row} highlight nsWhatsEnabled={nsWhatsEnabled} />
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        ) : null}

                        {upcomingRows.length > 0 ? (
                            <section className="space-y-3">
                                {todayRows.length > 0 ? (
                                    <h2 className="px-1 text-xs font-bold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                                        No mês
                                    </h2>
                                ) : null}
                                <ul className="space-y-2">
                                    {upcomingRows.map((row) => (
                                        <li key={row.id}>
                                            <BirthdayCard row={row} nsWhatsEnabled={nsWhatsEnabled} />
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        ) : null}
                    </div>
                )}
            </div>
        </MobileLayout>
    );
}

function BirthdayCard({
    row,
    highlight = false,
    nsWhatsEnabled = true,
}: {
    row: BirthdayRow;
    highlight?: boolean;
    nsWhatsEnabled?: boolean;
}) {
    const ministries = row.ministryNames.filter(Boolean).join(' · ');
    const showCongratulate = nsWhatsEnabled && row.canCongratulate && row.congratulateUrl;

    const congratulateBtn = showCongratulate ? (
        <Link
            href={row.congratulateUrl!}
            className={`inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-semibold transition active:scale-[0.99] ${
                highlight
                    ? 'bg-rose-100 text-rose-800 ring-1 ring-inset ring-rose-200 hover:bg-rose-200 dark:bg-rose-950/50 dark:text-rose-100 dark:ring-rose-800 dark:hover:bg-rose-900/60'
                    : 'bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200/80 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-100 dark:ring-emerald-800/70 dark:hover:bg-emerald-900/50'
            }`}
        >
            <ChatBubbleLeftRightIcon className="h-4 w-4" aria-hidden />
            Dar parabéns
        </Link>
    ) : null;

    if (highlight) {
        return (
            <article className="relative overflow-hidden rounded-2xl border border-rose-300 bg-gradient-to-r from-rose-100 via-rose-50 to-amber-50 p-4 shadow-md dark:border-rose-700 dark:from-rose-950 dark:via-rose-950/80 dark:to-amber-950/50">
                <div
                    className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-rose-500 to-amber-400"
                    aria-hidden
                />
                <div className="flex items-center gap-3.5 pl-1.5">
                    <div className="relative">
                        <div className="rounded-full p-[2px] ring-2 ring-rose-400/70 dark:ring-rose-500/60">
                            <UserListAvatar name={row.name} photoUrl={row.photoUrl} size="md" />
                        </div>
                        <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-white shadow-sm ring-2 ring-rose-50 dark:ring-rose-950">
                            <CakeSolidIcon className="h-3.5 w-3.5" aria-hidden />
                        </span>
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-[15px] font-bold text-zinc-900 dark:text-white">{row.name}</h3>
                            {row.isSelf ? (
                                <span className="shrink-0 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white dark:bg-zinc-200 dark:text-zinc-900">
                                    Você
                                </span>
                            ) : null}
                            <span className="shrink-0 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white dark:bg-rose-500">
                                Aniversário hoje
                            </span>
                        </div>
                        <p className="mt-0.5 text-sm font-semibold text-rose-800 dark:text-rose-200">
                            {formatDayMonth(row.birthDate)}
                        </p>
                        {ministries ? (
                            <p className="mt-0.5 truncate text-xs text-zinc-600 dark:text-zinc-400">{ministries}</p>
                        ) : null}
                    </div>
                    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-white/80 text-center shadow-sm ring-1 ring-rose-200 dark:bg-zinc-900/70 dark:ring-rose-800">
                        <span className="text-[10px] font-semibold uppercase text-rose-600 dark:text-rose-300">Dia</span>
                        <span className="text-lg font-bold leading-none tabular-nums text-zinc-900 dark:text-white">
                            {String(row.day).padStart(2, '0')}
                        </span>
                    </div>
                </div>
                {congratulateBtn ? <div className="mt-3 pl-1.5">{congratulateBtn}</div> : null}
            </article>
        );
    }

    return (
        <article className="rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-sm transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700">
            <div className="flex items-center gap-3">
                <UserListAvatar name={row.name} photoUrl={row.photoUrl} size="md" />
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-[15px] font-semibold text-zinc-900 dark:text-white">{row.name}</h3>
                        {row.isSelf ? (
                            <span className="shrink-0 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white dark:bg-zinc-200 dark:text-zinc-900">
                                Você
                            </span>
                        ) : null}
                    </div>
                    <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-300">{formatDayMonth(row.birthDate)}</p>
                    {ministries ? (
                        <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">{ministries}</p>
                    ) : null}
                </div>
                <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-zinc-50 text-center ring-1 ring-zinc-200 dark:bg-zinc-800 dark:ring-zinc-700">
                    <span className="text-[9px] font-semibold uppercase text-zinc-400 dark:text-zinc-500">Dia</span>
                    <span className="text-base font-bold leading-none tabular-nums text-zinc-800 dark:text-zinc-100">
                        {String(row.day).padStart(2, '0')}
                    </span>
                </div>
            </div>
            {congratulateBtn ? <div className="mt-3">{congratulateBtn}</div> : null}
        </article>
    );
}
