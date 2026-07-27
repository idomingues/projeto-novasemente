import { useEffect, useId, useState } from 'react';
import PrayingHandsIcon from '@/Components/PrayingHandsIcon';

interface Props {
    prayerId: number;
    count: number;
}

type BlessingParticle = {
    id: number;
    kind: 'smoke' | 'star';
    left: number;
    delayMs: number;
    durationMs: number;
    driftPx: number;
    sizePx: number;
};

const COOLDOWN_MS = 60 * 60 * 1000;
const cooldownStorageKey = (prayerId: number) => `prayer_amen_until:${prayerId}`;

function readCooldownUntil(prayerId: number): number | null {
    try {
        const raw = sessionStorage.getItem(cooldownStorageKey(prayerId));
        if (!raw) {
            return null;
        }
        const until = Number(raw);
        if (!Number.isFinite(until) || until <= Date.now()) {
            sessionStorage.removeItem(cooldownStorageKey(prayerId));
            return null;
        }
        return until;
    } catch {
        return null;
    }
}

function writeCooldownUntil(prayerId: number, until: number): void {
    try {
        sessionStorage.setItem(cooldownStorageKey(prayerId), String(until));
    } catch {
        // ignore quota / private mode
    }
}

function createBlessingBurst(seed: number): BlessingParticle[] {
    const particles: BlessingParticle[] = [];

    for (let i = 0; i < 5; i++) {
        particles.push({
            id: seed + i,
            kind: 'smoke',
            left: 18 + i * 14 + (i % 2 === 0 ? -4 : 4),
            delayMs: i * 55,
            durationMs: 1100 + i * 90,
            driftPx: (i % 2 === 0 ? -1 : 1) * (10 + i * 4),
            sizePx: 10 + (i % 3) * 4,
        });
    }

    for (let i = 0; i < 5; i++) {
        particles.push({
            id: seed + 50 + i,
            kind: 'star',
            left: 22 + i * 13,
            delayMs: 40 + i * 70,
            durationMs: 900 + i * 80,
            driftPx: (i % 2 === 0 ? 1 : -1) * (8 + i * 5),
            sizePx: 5 + (i % 3) * 2,
        });
    }

    return particles;
}

const WAIT_HINT =
    'Você já contabilizou uma oração neste pedido. Pode adicionar novamente em 1 hora.';

export default function PrayerAmenButton({ prayerId, count }: Props) {
    const styleId = useId().replace(/:/g, '');
    const [busy, setBusy] = useState(false);
    const [celebrating, setCelebrating] = useState(false);
    const [localCount, setLocalCount] = useState(count);
    const [hint, setHint] = useState<string | null>(null);
    const [particles, setParticles] = useState<BlessingParticle[]>([]);
    const [cooldownUntil, setCooldownUntil] = useState<number | null>(() =>
        typeof window === 'undefined' ? null : readCooldownUntil(prayerId),
    );

    useEffect(() => {
        setLocalCount(count);
    }, [count]);

    useEffect(() => {
        setCooldownUntil(readCooldownUntil(prayerId));
        setHint(null);
    }, [prayerId]);

    const playBlessing = () => {
        const seed = Date.now();
        const burst = createBlessingBurst(seed);
        setParticles((current) => [...current, ...burst]);
        setCelebrating(true);

        window.setTimeout(() => {
            setParticles((current) => current.filter((p) => p.id < seed || p.id >= seed + 100));
        }, 1700);

        window.setTimeout(() => {
            setCelebrating(false);
        }, 500);
    };

    const onPray = async () => {
        if (busy) {
            return;
        }

        const now = Date.now();
        const activeUntil = cooldownUntil ?? readCooldownUntil(prayerId);
        if (activeUntil && activeUntil > now) {
            setHint(WAIT_HINT);
            return;
        }

        setBusy(true);
        setHint(null);

        try {
            const csrf =
                document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
            const res = await fetch(route('prayer.amen', prayerId), {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrf,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
                body: JSON.stringify({}),
            });

            const data = (await res.json().catch(() => null)) as
                | { ok?: boolean; prayer_amen_count?: number; message?: string }
                | null;

            if (res.status === 429) {
                const until = Date.now() + COOLDOWN_MS;
                writeCooldownUntil(prayerId, until);
                setCooldownUntil(until);
                setHint(data?.message ?? WAIT_HINT);
                return;
            }

            if (!res.ok) {
                setHint(
                    data?.message ??
                        'Não foi possível salvar. Tente novamente em instantes.',
                );
                return;
            }

            if (typeof data?.prayer_amen_count === 'number') {
                setLocalCount(data.prayer_amen_count);
            } else {
                setLocalCount((current) => current + 1);
            }

            const until = Date.now() + COOLDOWN_MS;
            writeCooldownUntil(prayerId, until);
            setCooldownUntil(until);
            setHint(null);
            playBlessing();
        } catch {
            setHint('Não foi possível salvar. Verifique a conexão e tente de novo.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="inline-flex flex-col items-start gap-1">
            <style>{`
                @keyframes prayer-blessing-rise-${styleId} {
                    0% {
                        opacity: 0;
                        transform: translate3d(0, 8px, 0) scale(0.7);
                    }
                    18% {
                        opacity: 0.85;
                    }
                    100% {
                        opacity: 0;
                        transform: translate3d(var(--prayer-drift), -72px, 0) scale(1.15);
                    }
                }
                @keyframes prayer-amen-pop-${styleId} {
                    0% { transform: scale(1); }
                    40% { transform: scale(1.06); }
                    100% { transform: scale(1); }
                }
                .prayer-amen-pop-${styleId} {
                    animation: prayer-amen-pop-${styleId} 480ms ease-out;
                }
                .prayer-blessing-particle-${styleId} {
                    position: absolute;
                    bottom: 70%;
                    pointer-events: none;
                    animation-name: prayer-blessing-rise-${styleId};
                    animation-timing-function: cubic-bezier(0.22, 0.61, 0.36, 1);
                    animation-fill-mode: forwards;
                    will-change: transform, opacity;
                }
            `}</style>

            <div className="relative inline-flex overflow-visible">
                <div
                    className="pointer-events-none absolute inset-x-0 bottom-full h-20 overflow-visible"
                    aria-hidden
                >
                    {particles.map((particle) =>
                        particle.kind === 'smoke' ? (
                            <span
                                key={particle.id}
                                className={`prayer-blessing-particle-${styleId} rounded-full bg-brand-300/70 blur-[1.5px] dark:bg-brand-400/50`}
                                style={{
                                    left: `${particle.left}%`,
                                    width: particle.sizePx,
                                    height: particle.sizePx * 1.35,
                                    animationDuration: `${particle.durationMs}ms`,
                                    animationDelay: `${particle.delayMs}ms`,
                                    ['--prayer-drift' as string]: `${particle.driftPx}px`,
                                }}
                            />
                        ) : (
                            <span
                                key={particle.id}
                                className={`prayer-blessing-particle-${styleId} text-amber-400 dark:text-amber-300`}
                                style={{
                                    left: `${particle.left}%`,
                                    fontSize: particle.sizePx,
                                    lineHeight: 1,
                                    animationDuration: `${particle.durationMs}ms`,
                                    animationDelay: `${particle.delayMs}ms`,
                                    ['--prayer-drift' as string]: `${particle.driftPx}px`,
                                }}
                            >
                                ✦
                            </span>
                        ),
                    )}
                </div>

                <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                        void onPray();
                    }}
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-full border border-brand-200/90 bg-brand-50/80 px-3.5 py-1.5 text-sm font-medium text-brand-800 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-brand-800/70 dark:bg-brand-950/40 dark:text-brand-200 dark:hover:border-brand-700 dark:hover:bg-brand-950/60 dark:hover:text-brand-100 ${celebrating ? `prayer-amen-pop-${styleId}` : ''}`}
                >
                    <PrayingHandsIcon className="h-4 w-4 shrink-0 text-brand-600 opacity-90 dark:text-brand-400" />
                    <span>Orar</span>
                    {localCount > 0 && (
                        <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-brand-700 dark:bg-brand-900/60 dark:text-brand-200">
                            {localCount}
                        </span>
                    )}
                </button>
            </div>
            {hint ? (
                <p className="max-w-xs text-xs text-amber-700 dark:text-amber-300">{hint}</p>
            ) : null}
        </div>
    );
}
