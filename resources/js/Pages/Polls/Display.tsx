import { Head } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { PollResultOption, PollResults } from '@/Components/Polls/pollTypes';

type DisplayPoll = {
    question: string;
    allow_multiple: boolean;
    display_bg_color: string;
    display_font: 'sans' | 'serif' | 'display' | string;
    display_chart: 'bar' | 'pie' | string;
    display_logo: string;
    display_logo_url: string | null;
    results: PollResults;
    data_url: string;
};

type Props = {
    poll: DisplayPoll;
};

const CHART_COLORS = [
    '#34d399',
    '#60a5fa',
    '#fbbf24',
    '#f472b6',
    '#a78bfa',
    '#2dd4bf',
    '#fb923c',
    '#94a3b8',
];

const POLL_MS = 3000;

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const raw = hex.replace('#', '').trim();
    const full =
        raw.length === 3
            ? raw
                  .split('')
                  .map((c) => c + c)
                  .join('')
            : raw;
    if (!/^[0-9a-fA-F]{6}$/.test(full)) {
        return null;
    }
    return {
        r: Number.parseInt(full.slice(0, 2), 16),
        g: Number.parseInt(full.slice(2, 4), 16),
        b: Number.parseInt(full.slice(4, 6), 16),
    };
}

function isDarkBackground(hex: string): boolean {
    const rgb = hexToRgb(hex);
    if (!rgb) {
        return true;
    }
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance < 0.55;
}

function fontFamily(font: string): string {
    if (font === 'serif') {
        return '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
    }
    if (font === 'display') {
        return '"Avenir Next Condensed", "Segoe UI", "Trebuchet MS", sans-serif';
    }
    return 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
}

function resultsSignature(results: PollResults): string {
    return `${results.total_votes}|${results.options.map((o) => `${o.id}:${o.votes_count}:${o.percent}`).join(',')}`;
}

function useAnimatedNumber(target: number, durationMs = 900): number {
    const [value, setValue] = useState(target);
    const valueRef = useRef(target);
    const frameRef = useRef<number | null>(null);

    useEffect(() => {
        const from = valueRef.current;
        if (from === target) {
            return;
        }

        const start = performance.now();
        if (frameRef.current != null) {
            cancelAnimationFrame(frameRef.current);
        }

        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / durationMs);
            const eased = 1 - Math.pow(1 - t, 3);
            const next = from + (target - from) * eased;
            valueRef.current = next;
            setValue(next);
            if (t < 1) {
                frameRef.current = requestAnimationFrame(tick);
            } else {
                valueRef.current = target;
                setValue(target);
                frameRef.current = null;
            }
        };

        frameRef.current = requestAnimationFrame(tick);
        return () => {
            if (frameRef.current != null) {
                cancelAnimationFrame(frameRef.current);
            }
        };
    }, [target, durationMs]);

    return value;
}

function useRisingHighlights(options: PollResultOption[]): Set<number> {
    const prevRef = useRef<Map<number, number>>(new Map());
    const [rising, setRising] = useState<Set<number>>(new Set());
    const clearTimer = useRef<number | null>(null);

    useEffect(() => {
        const prev = prevRef.current;
        const nextRising = new Set<number>();
        for (const option of options) {
            const before = prev.get(option.id);
            if (before != null && option.votes_count > before) {
                nextRising.add(option.id);
            }
        }
        prevRef.current = new Map(options.map((o) => [o.id, o.votes_count]));

        if (nextRising.size === 0) {
            return;
        }

        setRising(nextRising);
        if (clearTimer.current != null) {
            window.clearTimeout(clearTimer.current);
        }
        clearTimer.current = window.setTimeout(() => {
            setRising(new Set());
            clearTimer.current = null;
        }, 1400);

        return () => {
            if (clearTimer.current != null) {
                window.clearTimeout(clearTimer.current);
            }
        };
    }, [options]);

    return rising;
}

function AnimatedCount({ value, className }: { value: number; className?: string }) {
    const animated = useAnimatedNumber(value);
    return <span className={className}>{Math.round(animated)}</span>;
}

function PieChart({ results, dark, rising }: { results: PollResults; dark: boolean; rising: Set<number> }) {
    const total = Math.max(results.total_votes, 1);
    const size = 320;
    const cx = size / 2;
    const cy = size / 2;
    const radius = 118;
    let angle = -90;

    const slices = results.options.map((option, index) => {
        const sweep = (option.votes_count / total) * 360;
        const start = angle;
        const end = angle + sweep;
        angle = end;

        const startRad = (start * Math.PI) / 180;
        const endRad = (end * Math.PI) / 180;
        const x1 = cx + radius * Math.cos(startRad);
        const y1 = cy + radius * Math.sin(startRad);
        const x2 = cx + radius * Math.cos(endRad);
        const y2 = cy + radius * Math.sin(endRad);
        const large = sweep > 180 ? 1 : 0;

        const path =
            option.votes_count === 0
                ? ''
                : sweep >= 359.9
                  ? `M ${cx} ${cy - radius} A ${radius} ${radius} 0 1 1 ${cx - 0.01} ${cy - radius} Z`
                  : `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`;

        return {
            ...option,
            path,
            color: CHART_COLORS[index % CHART_COLORS.length],
            isRising: rising.has(option.id),
        };
    });

    const hasVotes = results.total_votes > 0;
    const leadingPercent = hasVotes ? Math.max(...results.options.map((o) => o.percent)) : 0;
    const animatedLeading = useAnimatedNumber(leadingPercent);

    return (
        <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-center lg:justify-center lg:gap-12">
            <svg viewBox={`0 0 ${size} ${size}`} className="h-64 w-64 drop-shadow-2xl sm:h-80 sm:w-80">
                {!hasVotes ? (
                    <circle cx={cx} cy={cy} r={radius} fill={dark ? '#334155' : '#e2e8f0'} />
                ) : (
                    slices.map((slice) =>
                        slice.path ? (
                            <path
                                key={slice.id}
                                d={slice.path}
                                fill={slice.color}
                                stroke={dark ? '#0f172a' : '#fff'}
                                strokeWidth={slice.isRising ? 4 : 2}
                                style={{
                                    transition: 'd 1s cubic-bezier(0.22, 1, 0.36, 1), stroke-width 0.4s ease',
                                    filter: slice.isRising ? 'brightness(1.18) drop-shadow(0 0 10px rgba(255,255,255,0.35))' : undefined,
                                }}
                            />
                        ) : null,
                    )
                )}
                <circle cx={cx} cy={cy} r={58} fill={dark ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.95)'} />
                <text
                    x={cx}
                    y={cy - 4}
                    textAnchor="middle"
                    style={{ fill: dark ? '#f8fafc' : '#0f172a', fontSize: 28, fontWeight: 700 }}
                >
                    {hasVotes ? `${Math.round(animatedLeading)}%` : '—'}
                </text>
                <text
                    x={cx}
                    y={cy + 18}
                    textAnchor="middle"
                    style={{ fill: dark ? '#94a3b8' : '#64748b', fontSize: 12, fontWeight: 600 }}
                >
                    {hasVotes ? 'líder' : 'sem dados'}
                </text>
            </svg>
            <ul className="w-full max-w-sm space-y-3">
                {slices.map((slice) => (
                    <li
                        key={slice.id}
                        className={`flex items-center justify-between gap-3 rounded-xl px-2 py-1.5 transition-all duration-500 ${
                            slice.isRising ? (dark ? 'bg-white/10' : 'bg-black/5') : ''
                        }`}
                    >
                        <span className="flex min-w-0 items-center gap-2.5">
                            <span
                                className={`h-3 w-3 shrink-0 rounded-full transition-transform duration-500 ${
                                    slice.isRising ? 'scale-125' : 'scale-100'
                                }`}
                                style={{ backgroundColor: slice.color }}
                            />
                            <span className={`truncate text-base font-semibold ${dark ? 'text-slate-100' : 'text-slate-900'}`}>
                                {slice.label}
                            </span>
                        </span>
                        <span className={`shrink-0 text-sm font-semibold tabular-nums ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
                            <AnimatedCount value={slice.percent} />%
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function BarRow({
    option,
    index,
    dark,
    isRising,
}: {
    option: PollResultOption;
    index: number;
    dark: boolean;
    isRising: boolean;
}) {
    const color = CHART_COLORS[index % CHART_COLORS.length];
    const width = option.percent > 0 ? Math.max(option.percent, 6) : 0;
    const animatedWidth = useAnimatedNumber(width, 1100);

    return (
        <li className="relative">
            <div className="mb-2 flex items-end justify-between gap-3">
                <span
                    className={`text-lg font-semibold transition-colors duration-500 sm:text-xl ${
                        dark ? 'text-slate-50' : 'text-slate-900'
                    } ${isRising ? (dark ? 'text-emerald-200' : 'text-emerald-700') : ''}`}
                >
                    {option.label}
                </span>
                <span
                    className={`text-base font-semibold tabular-nums transition-transform duration-500 sm:text-lg ${
                        dark ? 'text-slate-300' : 'text-slate-600'
                    } ${isRising ? 'scale-110 font-bold' : ''}`}
                >
                    <AnimatedCount value={option.percent} />%
                </span>
            </div>
            <div className={`relative h-5 overflow-hidden rounded-full sm:h-6 ${dark ? 'bg-slate-700/70' : 'bg-slate-200'}`}>
                <div
                    className="relative h-full rounded-full"
                    style={{
                        width: `${animatedWidth}%`,
                        background: `linear-gradient(90deg, ${color}cc 0%, ${color} 55%, ${color}ee 100%)`,
                        transition: `box-shadow 0.45s ease, filter 0.45s ease`,
                        boxShadow: isRising ? `0 0 22px ${color}99, 0 0 8px ${color}` : `0 0 0 transparent`,
                        filter: isRising ? 'brightness(1.15)' : 'brightness(1)',
                        willChange: 'width',
                    }}
                >
                    <div
                        className="pointer-events-none absolute inset-y-0 left-0 w-1/3 opacity-40"
                        style={{
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)',
                            animation: isRising ? 'poll-bar-shine 1.1s ease-out' : undefined,
                        }}
                    />
                </div>
            </div>
            {isRising && (
                <span
                    className={`pointer-events-none absolute -right-1 -top-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        dark ? 'bg-emerald-400/20 text-emerald-200' : 'bg-emerald-100 text-emerald-800'
                    }`}
                    style={{ animation: 'poll-vote-pop 0.7s ease-out' }}
                >
                    +
                </span>
            )}
        </li>
    );
}

function BarChart({ results, dark, rising }: { results: PollResults; dark: boolean; rising: Set<number> }) {
    return (
        <ul className="mx-auto w-full max-w-3xl space-y-6">
            {results.options.map((option, index) => (
                <BarRow
                    key={option.id}
                    option={option}
                    index={index}
                    dark={dark}
                    isRising={rising.has(option.id)}
                />
            ))}
        </ul>
    );
}

function ColumnBar({
    option,
    index,
    dark,
    isRising,
}: {
    option: PollResultOption;
    index: number;
    dark: boolean;
    isRising: boolean;
}) {
    const color = CHART_COLORS[index % CHART_COLORS.length];
    const heightPct = option.percent > 0 ? Math.max(option.percent, 8) : 0;
    const animatedHeight = useAnimatedNumber(heightPct, 1100);

    return (
        <li className="flex min-w-0 flex-1 flex-col items-center gap-3">
            <div
                className={`text-sm font-bold tabular-nums sm:text-base ${dark ? 'text-slate-200' : 'text-slate-700'} ${
                    isRising ? 'scale-110' : ''
                }`}
            >
                <AnimatedCount value={option.percent} />%
            </div>
            <div
                className={`relative flex h-48 w-full max-w-[4.5rem] items-end overflow-hidden rounded-2xl sm:h-64 sm:max-w-[5.5rem] ${
                    dark ? 'bg-slate-700/60' : 'bg-slate-200'
                }`}
            >
                <div
                    className="relative w-full rounded-t-2xl"
                    style={{
                        height: `${animatedHeight}%`,
                        background: `linear-gradient(180deg, ${color} 0%, ${color}bb 100%)`,
                        boxShadow: isRising ? `0 0 24px ${color}aa` : undefined,
                        filter: isRising ? 'brightness(1.12)' : undefined,
                        willChange: 'height',
                    }}
                />
            </div>
            <span
                className={`w-full truncate text-center text-sm font-semibold sm:text-base ${
                    dark ? 'text-slate-100' : 'text-slate-900'
                }`}
            >
                {option.label}
            </span>
        </li>
    );
}

function ColumnChart({ results, dark, rising }: { results: PollResults; dark: boolean; rising: Set<number> }) {
    return (
        <ul className="mx-auto flex w-full max-w-4xl items-end justify-center gap-3 sm:gap-5">
            {results.options.map((option, index) => (
                <ColumnBar
                    key={option.id}
                    option={option}
                    index={index}
                    dark={dark}
                    isRising={rising.has(option.id)}
                />
            ))}
        </ul>
    );
}

function RadialRing({
    option,
    index,
    dark,
    isRising,
}: {
    option: PollResultOption;
    index: number;
    dark: boolean;
    isRising: boolean;
}) {
    const color = CHART_COLORS[index % CHART_COLORS.length];
    const size = 128;
    const stroke = 12;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const animatedPercent = useAnimatedNumber(option.percent, 1100);
    const dash = (Math.min(100, Math.max(0, animatedPercent)) / 100) * c;

    return (
        <li
            className={`flex flex-col items-center gap-3 rounded-3xl px-4 py-5 transition-all duration-500 ${
                isRising ? (dark ? 'bg-white/10' : 'bg-black/5') : ''
            }`}
        >
            <svg viewBox={`0 0 ${size} ${size}`} className="h-28 w-28 sm:h-32 sm:w-32">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke={dark ? '#334155' : '#e2e8f0'}
                    strokeWidth={stroke}
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke={color}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={`${dash} ${c}`}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    style={{
                        filter: isRising ? `drop-shadow(0 0 8px ${color})` : undefined,
                        transition: 'filter 0.4s ease',
                    }}
                />
                <text
                    x={size / 2}
                    y={size / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    style={{ fill: dark ? '#f8fafc' : '#0f172a', fontSize: 22, fontWeight: 700 }}
                >
                    {Math.round(animatedPercent)}%
                </text>
            </svg>
            <span className={`max-w-[9rem] truncate text-center text-sm font-semibold sm:text-base ${dark ? 'text-slate-100' : 'text-slate-900'}`}>
                {option.label}
            </span>
        </li>
    );
}

function RadialChart({ results, dark, rising }: { results: PollResults; dark: boolean; rising: Set<number> }) {
    return (
        <ul className="mx-auto flex w-full max-w-5xl flex-wrap items-start justify-center gap-4 sm:gap-6">
            {results.options.map((option, index) => (
                <RadialRing
                    key={option.id}
                    option={option}
                    index={index}
                    dark={dark}
                    isRising={rising.has(option.id)}
                />
            ))}
        </ul>
    );
}

function RankingChart({ results, dark, rising }: { results: PollResults; dark: boolean; rising: Set<number> }) {
    const ranked = [...results.options].sort((a, b) => b.percent - a.percent || a.label.localeCompare(b.label));

    return (
        <ol className="mx-auto w-full max-w-3xl space-y-3">
            {ranked.map((option, rank) => {
                const color = CHART_COLORS[results.options.findIndex((o) => o.id === option.id) % CHART_COLORS.length];
                const isRising = rising.has(option.id);
                const width = option.percent > 0 ? Math.max(option.percent, 8) : 0;

                return (
                    <li
                        key={option.id}
                        className={`relative overflow-hidden rounded-2xl border px-4 py-3 transition-all duration-500 sm:px-5 sm:py-4 ${
                            dark ? 'border-white/10 bg-white/5' : 'border-black/5 bg-black/[0.03]'
                        } ${isRising ? 'scale-[1.02] shadow-lg' : ''}`}
                    >
                        <div
                            className="pointer-events-none absolute inset-y-0 left-0 opacity-25 transition-all duration-1000"
                            style={{ width: `${width}%`, backgroundColor: color }}
                        />
                        <div className="relative flex items-center gap-4">
                            <span
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-black sm:h-12 sm:w-12 sm:text-xl ${
                                    rank === 0
                                        ? 'bg-amber-400 text-amber-950'
                                        : rank === 1
                                          ? dark
                                              ? 'bg-slate-400 text-slate-900'
                                              : 'bg-slate-300 text-slate-800'
                                          : rank === 2
                                            ? 'bg-orange-700/80 text-orange-50'
                                            : dark
                                              ? 'bg-slate-700 text-slate-200'
                                              : 'bg-slate-200 text-slate-700'
                                }`}
                            >
                                {rank + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className={`truncate text-lg font-bold sm:text-xl ${dark ? 'text-white' : 'text-slate-900'}`}>
                                    {option.label}
                                </p>
                                <p className={`text-sm font-semibold tabular-nums ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
                                    <AnimatedCount value={option.percent} />%
                                </p>
                            </div>
                            {isRising && (
                                <span
                                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                        dark ? 'bg-emerald-400/20 text-emerald-200' : 'bg-emerald-100 text-emerald-800'
                                    }`}
                                    style={{ animation: 'poll-vote-pop 0.7s ease-out' }}
                                >
                                    +
                                </span>
                            )}
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}

function WaffleChart({ results, dark, rising }: { results: PollResults; dark: boolean; rising: Set<number> }) {
    const cells = 100;
    const filled: { color: string; optionId: number }[] = [];
    let used = 0;

    results.options.forEach((option, index) => {
        const color = CHART_COLORS[index % CHART_COLORS.length];
        const count =
            index === results.options.length - 1
                ? Math.max(0, cells - used)
                : Math.round((option.percent / 100) * cells);
        used += count;
        for (let i = 0; i < count; i++) {
            filled.push({ color, optionId: option.id });
        }
    });

    while (filled.length < cells) {
        filled.push({ color: dark ? '#334155' : '#e2e8f0', optionId: -1 });
    }

    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 lg:flex-row lg:items-center">
            <div className="mx-auto grid w-full max-w-md grid-cols-10 gap-1.5 sm:gap-2">
                {filled.slice(0, cells).map((cell, i) => (
                    <div
                        key={i}
                        className="aspect-square rounded-md transition-all duration-500"
                        style={{
                            backgroundColor: cell.color,
                            boxShadow: rising.has(cell.optionId) ? `0 0 10px ${cell.color}` : undefined,
                            transform: rising.has(cell.optionId) ? 'scale(1.08)' : undefined,
                        }}
                    />
                ))}
            </div>
            <ul className="w-full max-w-sm space-y-3">
                {results.options.map((option, index) => {
                    const color = CHART_COLORS[index % CHART_COLORS.length];
                    const isRising = rising.has(option.id);
                    return (
                        <li
                            key={option.id}
                            className={`flex items-center justify-between gap-3 rounded-xl px-2 py-1.5 ${
                                isRising ? (dark ? 'bg-white/10' : 'bg-black/5') : ''
                            }`}
                        >
                            <span className="flex min-w-0 items-center gap-2.5">
                                <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
                                <span className={`truncate font-semibold ${dark ? 'text-slate-100' : 'text-slate-900'}`}>
                                    {option.label}
                                </span>
                            </span>
                            <span className={`shrink-0 text-sm font-semibold tabular-nums ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
                                <AnimatedCount value={option.percent} />%
                            </span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

function PollDisplayChart({
    chart,
    results,
    dark,
    rising,
}: {
    chart: string;
    results: PollResults;
    dark: boolean;
    rising: Set<number>;
}) {
    switch (chart) {
        case 'pie':
            return <PieChart results={results} dark={dark} rising={rising} />;
        case 'column':
            return <ColumnChart results={results} dark={dark} rising={rising} />;
        case 'radial':
            return <RadialChart results={results} dark={dark} rising={rising} />;
        case 'ranking':
            return <RankingChart results={results} dark={dark} rising={rising} />;
        case 'waffle':
            return <WaffleChart results={results} dark={dark} rising={rising} />;
        case 'bar':
        default:
            return <BarChart results={results} dark={dark} rising={rising} />;
    }
}

export default function PollDisplay({ poll: initial }: Props) {
    const [poll, setPoll] = useState(initial);
    const [livePulse, setLivePulse] = useState(false);
    const dark = useMemo(() => isDarkBackground(poll.display_bg_color), [poll.display_bg_color]);
    const rising = useRisingHighlights(poll.results.options);
    const signatureRef = useRef(resultsSignature(initial.results));

    useEffect(() => {
        setPoll(initial);
        signatureRef.current = resultsSignature(initial.results);
    }, [initial]);

    useEffect(() => {
        let cancelled = false;
        let timer: number | null = null;

        const tick = async () => {
            try {
                const res = await fetch(poll.data_url, {
                    headers: { Accept: 'application/json' },
                    credentials: 'same-origin',
                    cache: 'no-store',
                });
                if (!res.ok || cancelled) {
                    return;
                }
                const json = (await res.json()) as {
                    question: string;
                    results: PollResults;
                    display_bg_color: string;
                    display_font: string;
                    display_chart: string;
                    display_logo: string;
                    display_logo_url: string | null;
                };

                const nextSig = resultsSignature(json.results);
                const resultsChanged = nextSig !== signatureRef.current;
                if (resultsChanged) {
                    signatureRef.current = nextSig;
                    setLivePulse(true);
                    window.setTimeout(() => setLivePulse(false), 900);
                }

                setPoll((prev) => {
                    if (
                        !resultsChanged &&
                        prev.question === json.question &&
                        prev.display_bg_color === json.display_bg_color &&
                        prev.display_font === json.display_font &&
                        prev.display_chart === json.display_chart &&
                        prev.display_logo === json.display_logo &&
                        prev.display_logo_url === json.display_logo_url
                    ) {
                        return prev;
                    }

                    return {
                        ...prev,
                        question: json.question,
                        results: json.results,
                        display_bg_color: json.display_bg_color,
                        display_font: json.display_font,
                        display_chart: json.display_chart,
                        display_logo: json.display_logo,
                        display_logo_url: json.display_logo_url,
                    };
                });
            } catch {
                // ignore transient network errors
            } finally {
                if (!cancelled) {
                    timer = window.setTimeout(tick, POLL_MS);
                }
            }
        };

        timer = window.setTimeout(tick, POLL_MS);
        return () => {
            cancelled = true;
            if (timer != null) {
                window.clearTimeout(timer);
            }
        };
    }, [poll.data_url]);

    return (
        <>
            <Head title={poll.question} />
            <style>{`
                @keyframes poll-bar-shine {
                    0% { transform: translateX(-120%); opacity: 0; }
                    35% { opacity: 0.7; }
                    100% { transform: translateX(280%); opacity: 0; }
                }
                @keyframes poll-vote-pop {
                    0% { transform: scale(0.6); opacity: 0; }
                    40% { transform: scale(1.08); opacity: 1; }
                    100% { transform: scale(1); opacity: 0; }
                }
                @keyframes poll-live-dot {
                    0%, 100% { opacity: 0.45; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.25); }
                }
            `}</style>
            <div
                className="min-h-screen px-6 py-10 sm:px-10 sm:py-14"
                style={{
                    backgroundColor: poll.display_bg_color,
                    fontFamily: fontFamily(poll.display_font),
                    color: dark ? '#f8fafc' : '#0f172a',
                }}
            >
                <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl flex-col justify-center">
                    {poll.display_logo_url && (
                        <div className="mb-8 flex justify-center sm:mb-10">
                            <div className="flex h-14 w-full max-w-[13rem] items-center justify-center sm:h-16 sm:max-w-[16rem]">
                                <img
                                    src={poll.display_logo_url}
                                    alt="Nova Semente"
                                    className="h-full w-full object-contain object-center"
                                />
                            </div>
                        </div>
                    )}
                    <h1
                        className={`mb-10 text-center text-3xl font-bold leading-tight tracking-tight sm:mb-14 sm:text-5xl ${
                            dark ? 'text-white' : 'text-slate-900'
                        }`}
                    >
                        {poll.question}
                    </h1>

                    <PollDisplayChart
                        chart={poll.display_chart}
                        results={poll.results}
                        dark={dark}
                        rising={rising}
                    />

                    <p
                        className={`mt-12 flex items-center justify-center gap-2 text-center text-sm ${
                            dark ? 'text-slate-500' : 'text-slate-400'
                        }`}
                    >
                        <span
                            className={`inline-block h-2 w-2 rounded-full ${livePulse ? 'bg-emerald-400' : dark ? 'bg-slate-600' : 'bg-slate-300'}`}
                            style={{ animation: livePulse ? 'poll-live-dot 0.9s ease' : undefined }}
                            aria-hidden
                        />
                        Ao vivo
                    </p>
                </div>
            </div>
        </>
    );
}
