import MobileLayout from '@/Layouts/MobileLayout';
import Modal from '@/Components/Modal';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AcademicCapIcon,
    ArrowLeftIcon,
    BookOpenIcon,
    CheckCircleIcon,
    CalendarDaysIcon,
    ArrowPathIcon,
    Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { useEffect, useMemo, useState } from 'react';
import { inertiaListModalSave } from '@/utils/inertiaListModalSave';
import { confirmAction } from '@/utils/confirmDialog';

const primaryCtaClass =
    'inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-zinc-900 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-zinc-800 active:bg-zinc-950 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100';
const outlineCtaClass =
    'inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-zinc-900 px-4 py-3 text-sm font-bold text-zinc-900 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-300 dark:text-zinc-100 dark:hover:bg-zinc-800';
const primaryCtaSmClass =
    'inline-flex w-full cursor-pointer items-center justify-center rounded-full bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-zinc-800 active:bg-zinc-950 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100';

type Props =
    | {
          needsLogin: true;
          installed?: boolean;
      }
    | {
          needsLogin: false;
          installed: false;
          setup: { sqlPath: string; installCmd: string; generateCmd: string; scriptBlock: string };
      }
    | {
          needsLogin: false;
          installed: true;
          finished: boolean;
          day: number | null;
          display: string;
          chapters: { bookKey: string; bookName: string; bookId: number; chapter: number }[];
          startDate?: string | null;
          endDate?: string | null;
          status?: { kind: 'on_time' | 'late' | 'ahead' | 'done' | 'unknown'; days: number; label: string };
          readDate?: string | null;
          isToday?: boolean;
          remainingChapters?: number;
          challenge?: {
              enabled: boolean;
              active: { id: number; challengeId: number; name: string; description: string; type: string; scope: string } | null;
              mustChoose?: boolean;
              available?: { id: number; key: string; name: string; description: string; type: string; durationDays: number | null; scope: string }[];
          };
          progress: { done: number; remaining: number; percent: number; lastCompletedAt: string | null; pendingVerses: number };
      };

export default function MobileAnoBiblico(props: Props) {
    const { post, processing } = useForm<{ day: number }>({ day: (props as any).day ?? 1 });
    const { post: postStart, processing: starting } = useForm({});
    const { post: postReset, processing: resetting } = useForm({});
    const [reprogramming, setReprogramming] = useState(false);
    const { post: postRestartZero, processing: restartingZero } = useForm({});
    const { post: postRecalculateChallenge, processing: recalculatingChallenge } = useForm({});

    const [reprogramOpen, setReprogramOpen] = useState(false);
    const [challengeOpen, setChallengeOpen] = useState(false);
    const [challengeLoading, setChallengeLoading] = useState(false);
    const [challenges, setChallenges] = useState<
        { id: number; key: string; name: string; description: string; type: string; durationDays: number | null; scope: string }[]
    >([]);
    const [customEnd, setCustomEnd] = useState<string>('');
    const [resetReadings, setResetReadings] = useState(false);
    const [setupCopied, setSetupCopied] = useState(false);
    const [reprogramMode, setReprogramMode] = useState<'keep_end' | 'new_end' | 'start_today_keep_end'>('keep_end');
    const [newEndDate, setNewEndDate] = useState<string>('');

    const challengeMeta = props.needsLogin === false && props.installed === true ? props.challenge : undefined;
    const mustChooseChallenge = challengeMeta?.mustChoose === true;
    const activeChallenge = challengeMeta?.active ?? null;
    const canDismissChallengePicker = Boolean(activeChallenge) && !mustChooseChallenge;
    const availableFromProps = challengeMeta?.available;
    const availableKey = mustChooseChallenge
        ? (availableFromProps ?? []).map((c) => c.id).join(',')
        : '';

    useEffect(() => {
        if (!mustChooseChallenge) return;
        setChallenges(Array.isArray(availableFromProps) ? availableFromProps : []);
        setChallengeOpen(true);
    }, [mustChooseChallenge, availableKey]);

    const canComplete = props.needsLogin === false && props.installed === true && props.finished === false && typeof props.day === 'number';
    const canStartReading = props.needsLogin === false && props.installed === true && props.finished === false && typeof props.day === 'number';
    const isLate = props.needsLogin === false && props.installed === true && (props as any).status?.kind === 'late';
    const hidePlanWhileChoosing = mustChooseChallenge && challengeOpen;

    const closeChallengePicker = () => {
        if (!canDismissChallengePicker) return;
        setChallengeOpen(false);
    };

    const startChallenge = (challengeId: number, extra: Record<string, unknown> = {}) => {
        router.post(route('mobile.ano-biblico.challenges.start'), { challengeId, resetReadings, ...extra }, {
            ...inertiaListModalSave,
            onSuccess: () => setChallengeOpen(false),
        });
    };
    const loginRedirectHref = `${route('login')}?redirect=${encodeURIComponent(route('mobile.ano-biblico'))}`;

    const preview = useMemo(() => {
        const remaining = (props as any).remainingChapters as number | undefined;
        if (!remaining || remaining <= 0) return null;
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;

        const target = reprogramMode === 'new_end' ? newEndDate : ((props as any).endDate as string | undefined) ?? '';
        if (!target) return null;
        // dias restantes inclusivo (hoje..data_fim)
        const start = new Date(todayStr + 'T00:00:00');
        const end = new Date(target + 'T00:00:00');
        const diffMs = end.getTime() - start.getTime();
        const daysRemaining = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
        if (daysRemaining <= 0) return null;
        const perDay = Math.ceil(remaining / daysRemaining);
        return { remaining, daysRemaining, perDay, target };
    }, [newEndDate, props, reprogramMode]);

    const anoBiblicoTagline = 'Escolha um plano de leitura e acompanhe o seu progresso.';

    const activeChallengeName =
        props.needsLogin === false && props.installed === true && (props as any).challenge?.active?.name
            ? String((props as any).challenge.active.name).trim()
            : '';
    const subtitle =
        props.needsLogin === false && props.installed === false
            ? 'As tabelas deste módulo ainda não existem na base de dados — siga os passos abaixo no servidor.'
            : props.needsLogin === false && props.installed === true && activeChallengeName
              ? (props as any).startDate && (props as any).endDate
                  ? `Plano: ${new Date((props as any).startDate).toLocaleDateString('pt-BR')} → ${new Date((props as any).endDate).toLocaleDateString('pt-BR')}`
                  : anoBiblicoTagline
              : anoBiblicoTagline;
    const planChipLabel =
        props.needsLogin === false && props.installed === false
            ? 'Sem módulo na BD'
            : props.needsLogin === false && props.installed === true && activeChallengeName
              ? activeChallengeName
              : (props as any).challenge?.mustChoose === true
                ? 'Escolha um plano'
                : '365 dias';
    const planChipClass =
        props.needsLogin === false && props.installed === false
            ? 'inline-flex max-w-[55%] items-center gap-2 rounded-full bg-amber-100/90 dark:bg-amber-950/50 px-3 py-1 text-sm font-semibold text-amber-900 dark:text-amber-200'
            : 'inline-flex max-w-[55%] items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-sm font-semibold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200';

    return (
        <MobileLayout>
            <Head title="Ano Bíblico" />

            <div className="space-y-6">
                <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 pr-1">
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Ano Bíblico</h1>
                            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</p>
                        </div>
                        <span className={`${planChipClass} shrink-0`} title={planChipLabel}>
                            <AcademicCapIcon className="h-4 w-4 flex-shrink-0" aria-hidden />
                            <span className="truncate">{planChipLabel}</span>
                        </span>
                    </div>
                    {props.needsLogin === false && props.installed === true ? (
                        <div className="grid w-full min-w-0 grid-cols-2 gap-1.5 sm:max-w-md sm:gap-2">
                            <Link
                                href={route('mobile.ano-biblico.history')}
                                className="inline-flex min-h-[2.5rem] w-full min-w-0 cursor-pointer items-center justify-center rounded-full border border-zinc-200 bg-white px-2 py-2.5 text-[11px] font-bold leading-tight text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800/40 sm:min-h-[2.75rem] sm:px-4 sm:text-xs"
                            >
                                <span className="truncate text-center">Ver histórico</span>
                            </Link>
                            <button
                                type="button"
                                disabled={challengeLoading || challengeMeta?.enabled !== true}
                                onClick={async () => {
                                    if (challengeMeta?.enabled !== true) return;
                                    if (challengeOpen && canDismissChallengePicker) {
                                        closeChallengePicker();
                                        return;
                                    }
                                    if (mustChooseChallenge) {
                                        setChallengeOpen(true);
                                        return;
                                    }
                                    setChallengeLoading(true);
                                    try {
                                        const res = await fetch(route('mobile.ano-biblico.challenges'));
                                        const json = await res.json();
                                        setChallenges(Array.isArray(json?.items) ? json.items : []);
                                        setChallengeOpen(true);
                                    } finally {
                                        setChallengeLoading(false);
                                    }
                                }}
                                className={`inline-flex min-h-[2.5rem] w-full min-w-0 cursor-pointer items-center justify-center gap-1 rounded-full px-2 py-2.5 text-[11px] font-bold leading-tight disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[2.75rem] sm:gap-2 sm:px-4 sm:text-xs ${
                                    challengeOpen
                                        ? 'border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800'
                                        : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200/70 dark:bg-zinc-800/50 dark:text-zinc-200 dark:hover:bg-zinc-800'
                                }`}
                            >
                                {challengeOpen && canDismissChallengePicker ? (
                                    <ArrowLeftIcon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
                                ) : (
                                    <Squares2X2Icon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
                                )}
                                <span className="min-w-0 truncate text-center">
                                    {challengeOpen && canDismissChallengePicker
                                        ? 'Voltar'
                                        : activeChallenge
                                          ? 'Trocar desafio'
                                          : 'Escolher desafio'}
                                </span>
                            </button>
                        </div>
                    ) : null}
                </div>

                {props.needsLogin ? (
                    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                        <p className="font-semibold text-zinc-900 dark:text-white">Entre para usar o Ano Bíblico</p>
                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                            Para acompanhar leituras, histórico e progresso diário, faça login na sua conta.
                        </p>
                        <div className="mt-4">
                            <Link href={loginRedirectHref} className={primaryCtaClass}>
                                Fazer login
                            </Link>
                        </div>
                    </div>
                ) : props.installed === false ? (
                    <div className="rounded-2xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/90 dark:bg-amber-950/30 p-4">
                        <p className="font-semibold text-amber-950 dark:text-amber-100">Configuração necessária</p>
                        <p className="mt-1 text-sm text-amber-900/90 dark:text-amber-100/80">
                            As tabelas base do módulo (por exemplo <code className="text-xs">plano_leitura</code>) ainda não
                            existem no banco configurado no <code className="text-xs">.env</code> na raiz do projeto.
                        </p>
                        <div className="mt-3 space-y-3 text-sm text-amber-950 dark:text-amber-100">
                            <div>
                                <div className="font-semibold">1) Instalar tabelas</div>
                                <p className="mt-1 text-xs text-amber-900/85 dark:text-amber-100/75">
                                    Na raiz do projeto; o script aplica automaticamente{' '}
                                    <code className="text-xs">{props.setup.sqlPath}</code>.
                                </p>
                                <code className="mt-1 block text-xs">{props.setup.installCmd}</code>
                            </div>
                            <div>
                                <div className="font-semibold">2) Gerar o plano de 365 dias</div>
                                <p className="mt-1 text-xs text-amber-900/85 dark:text-amber-100/75">
                                    Requer <code className="text-xs">bible_books</code> e <code className="text-xs">bible_verses</code>{' '}
                                    já importados.
                                </p>
                                <code className="mt-1 block text-xs">{props.setup.generateCmd}</code>
                            </div>
                            <p className="text-xs text-amber-900/85 dark:text-amber-100/75">
                                Alternativa ao passo 1: importar manualmente o arquivo SQL no MySQL (phpMyAdmin ou cliente).
                            </p>
                            <div className="mt-4">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-semibold text-amber-950 dark:text-amber-100">
                                        Scripts (copiar para o servidor)
                                    </span>
                                    <button
                                        type="button"
                                        className="shrink-0 rounded-full border border-amber-300/80 bg-white/90 px-3 py-1 text-xs font-bold text-amber-950 hover:bg-amber-100/80 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-900/60"
                                        onClick={async () => {
                                            try {
                                                await navigator.clipboard.writeText(props.setup.scriptBlock);
                                                setSetupCopied(true);
                                                window.setTimeout(() => setSetupCopied(false), 2000);
                                            } catch {
                                                setSetupCopied(false);
                                            }
                                        }}
                                    >
                                        {setupCopied ? 'Copiado' : 'Copiar tudo'}
                                    </button>
                                </div>
                                <pre className="mt-2 max-h-64 overflow-auto rounded-xl border border-amber-200/70 bg-white/80 p-3 text-[11px] leading-relaxed text-amber-950 dark:border-amber-900/50 dark:bg-zinc-950/50 dark:text-amber-50 whitespace-pre-wrap break-all font-mono">
                                    {props.setup.scriptBlock}
                                </pre>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {challengeOpen ? (
                            <section
                                id="ano-biblico-desafios"
                                className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5"
                            >
                                <div className="flex items-start gap-3">
                                    {canDismissChallengePicker ? (
                                        <button
                                            type="button"
                                            onClick={closeChallengePicker}
                                            className="mt-0.5 inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                                            aria-label="Voltar ao plano"
                                        >
                                            <ArrowLeftIcon className="h-5 w-5" aria-hidden />
                                        </button>
                                    ) : null}
                                    <div className="min-w-0 flex-1">
                                        <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Desafios</div>
                                        <h2 className="mt-0.5 text-lg font-bold text-zinc-900 dark:text-white">
                                            {activeChallenge ? 'Trocar desafio' : 'Escolha um desafio'}
                                        </h2>
                                        {mustChooseChallenge ? (
                                            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                                Para começar, escolha um plano de leitura. Você pode trocar depois (o anterior fica
                                                arquivado com o histórico).
                                            </p>
                                        ) : activeChallenge ? (
                                            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                                Atual:{' '}
                                                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                                    {activeChallenge.name}
                                                </span>
                                                . Seu plano de hoje continua abaixo.
                                            </p>
                                        ) : null}
                                    </div>
                                </div>

                                <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800">
                                    <input
                                        type="checkbox"
                                        checked={resetReadings}
                                        onChange={(e) => setResetReadings(e.target.checked)}
                                        className="mt-0.5 cursor-pointer"
                                    />
                                    <span className="text-sm text-zinc-700 dark:text-zinc-200">
                                        Reiniciar leituras já feitas (não aproveitar histórico)
                                    </span>
                                </label>

                                {activeChallenge ? (
                                    <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
                                        <div className="text-sm font-semibold text-zinc-900 dark:text-white">Desafio atual</div>
                                        <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                                            Redistribui só o que falta ler até a data final, mantendo capítulos já concluídos. A
                                            meta por dia usa os versículos que ainda faltam.
                                        </p>
                                        <button
                                            type="button"
                                            disabled={recalculatingChallenge}
                                            onClick={async () => {
                                                const ok = await confirmAction({
                                                    title: 'Recalcular o desafio atual?',
                                                    text: 'As leituras pendentes serão reorganizadas a partir de hoje até a data final, sem apagar o que você já leu.',
                                                    confirmButtonText: 'Recalcular',
                                                    cancelButtonText: 'Cancelar',
                                                    icon: 'question',
                                                });
                                                if (!ok) return;
                                                postRecalculateChallenge(route('mobile.ano-biblico.challenges.recalculate'), {
                                                    ...inertiaListModalSave,
                                                });
                                            }}
                                            className="mt-3 inline-flex w-full cursor-pointer items-center justify-center rounded-full border border-zinc-300 px-4 py-2.5 text-sm font-bold text-zinc-800 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
                                        >
                                            {recalculatingChallenge ? 'Recalculando…' : 'Recalcular desafio atual'}
                                        </button>
                                    </div>
                                ) : null}

                                {challenges.length === 0 ? (
                                    <div className="mt-3 rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-600 dark:bg-zinc-800/40 dark:text-zinc-300">
                                        Nenhum desafio disponível.
                                    </div>
                                ) : (
                                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                                        {challenges.map((c) => {
                                            const isCurrent = activeChallenge?.challengeId === c.id;
                                            return (
                                                <div
                                                    key={c.id}
                                                    className={`rounded-2xl border p-4 ${
                                                        isCurrent
                                                            ? 'border-zinc-400 bg-zinc-50 dark:border-zinc-500 dark:bg-zinc-800/50'
                                                            : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
                                                    } ${c.type === 'data_personalizada' ? 'md:col-span-2' : ''}`}
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="font-bold text-zinc-900 dark:text-white">{c.name}</div>
                                                        {isCurrent ? (
                                                            <span className="shrink-0 rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100">
                                                                Atual
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{c.description}</p>

                                                    {c.type === 'data_personalizada' ? (
                                                        <div className="mt-3 space-y-2">
                                                            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                                                                Data final
                                                                <input
                                                                    type="date"
                                                                    value={customEnd}
                                                                    onChange={(e) => setCustomEnd(e.target.value)}
                                                                    className="mt-1 w-full cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                                                                />
                                                            </label>
                                                            <button
                                                                type="button"
                                                                disabled={!customEnd}
                                                                onClick={() => startChallenge(c.id, { dataFim: customEnd })}
                                                                className={primaryCtaSmClass}
                                                            >
                                                                Iniciar desafio
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="mt-3">
                                                            <button
                                                                type="button"
                                                                onClick={() => startChallenge(c.id)}
                                                                className={primaryCtaSmClass}
                                                            >
                                                                Iniciar desafio
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {canDismissChallengePicker ? (
                                    <button
                                        type="button"
                                        onClick={closeChallengePicker}
                                        className="mt-4 inline-flex w-full cursor-pointer items-center justify-center rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                    >
                                        Voltar ao plano
                                    </button>
                                ) : null}
                            </section>
                        ) : null}

                        {!hidePlanWhileChoosing ? (
                        <>
                        {isLate ? (
                            <div className="rounded-2xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/90 dark:bg-amber-950/30 p-4">
                                <div className="font-bold text-amber-950 dark:text-amber-100">
                                    Você está atrasado em {(props as any).status?.days ?? 0} dia(s)
                                </div>
                                <div className="mt-1 text-sm text-amber-900/90 dark:text-amber-100/80">
                                    Escolha como deseja ajustar seu plano.
                                </div>
                                <div className="mt-4 grid grid-cols-1 gap-2">
                                    <Link
                                        href={canStartReading && typeof props.day === 'number' ? route('mobile.ano-biblico.day', { day: props.day }) : route('mobile.ano-biblico')}
                                        className={primaryCtaClass}
                                    >
                                        Continuar de onde parei
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => setReprogramOpen(true)}
                                        className="inline-flex w-full cursor-pointer items-center justify-center rounded-full border border-amber-300/80 bg-white/70 px-4 py-3 text-sm font-bold text-amber-950 transition-colors hover:bg-white dark:border-amber-900/60 dark:bg-zinc-950/10 dark:text-amber-100"
                                    >
                                        Reprogramar meu plano
                                    </button>
                                    <button
                                        type="button"
                                        disabled={restartingZero}
                                        onClick={async () => {
                                            const ok = await confirmAction({
                                                title: 'Recomeçar do zero?',
                                                text: 'Isso vai zerar seu progresso e abrir a leitura inicial.',
                                                confirmButtonText: 'Recomeçar',
                                                cancelButtonText: 'Cancelar',
                                                icon: 'warning',
                                                danger: true,
                                            });
                                            if (!ok) return;
                                            postRestartZero(route('mobile.ano-biblico.restart-zero'));
                                        }}
                                        className="inline-flex w-full cursor-pointer items-center justify-center rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm font-bold text-zinc-900 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800/40"
                                    >
                                        Recomeçar do zero
                                    </button>
                                </div>
                            </div>
                        ) : null}

                        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Leia hoje</div>
                                    {props.finished ? (
                                        <div className="mt-1 text-lg font-bold text-zinc-900 dark:text-white">
                                            Parabéns! Você concluiu o plano.
                                        </div>
                                    ) : (
                                        <>
                                            <div className="mt-1 text-lg font-bold text-zinc-900 dark:text-white truncate">{props.display}</div>
                                            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                                                <CalendarDaysIcon className="h-4 w-4" aria-hidden />
                                                {(props as any).isToday ? 'Para hoje' : (props as any).readDate ? `Próxima leitura em ${new Date((props as any).readDate).toLocaleDateString('pt-BR')}` : 'Próxima leitura'}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Link
                                href={
                                    props.finished
                                        ? route('mobile.bible')
                                        : canStartReading && typeof props.day === 'number'
                                          ? route('mobile.ano-biblico.day', { day: props.day })
                                          : route('mobile.bible')
                                }
                                className={primaryCtaClass}
                            >
                                <BookOpenIcon className="h-5 w-5" aria-hidden />
                                {props.finished ? 'Abrir Bíblia' : 'Iniciar leitura'}
                            </Link>

                            <button
                                type="button"
                                disabled={!canComplete || processing}
                                onClick={() => {
                                    if (!canComplete || typeof props.day !== 'number') return;
                                    post(route('mobile.ano-biblico.complete'), { preserveScroll: true });
                                }}
                                className={outlineCtaClass}
                            >
                                <CheckCircleIcon className="h-5 w-5" aria-hidden />
                                Já li / Marcar como concluído
                            </button>
                            </div>
                        </div>
                        {props.needsLogin === false && props.installed === true && !(props as any).startDate ? (
                            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Configurar</div>
                                        <div className="mt-1 font-bold text-zinc-900 dark:text-white">Começar hoje</div>
                                        <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Defina a data de início para acompanhar se está em dia.</div>
                                    </div>
                                    <ArrowPathIcon className="h-5 w-5 text-zinc-400" aria-hidden />
                                </div>
                                <div className="mt-4">
                                    <button
                                        type="button"
                                        disabled={starting}
                                        onClick={() => postStart(route('mobile.ano-biblico.start'), { preserveScroll: true })}
                                        className={primaryCtaClass}
                                    >
                                        Iniciar plano
                                    </button>
                                </div>
                            </div>
                        ) : null}

                        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                            <div className="flex items-center justify-between text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                                <span>Progresso</span>
                                <span>{props.progress.percent}%</span>
                            </div>
                            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                                <div
                                    className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100"
                                    style={{ width: `${props.progress.percent}%` }}
                                />
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 p-3">
                                    <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Dias atrasados</div>
                                    <div className="mt-1 text-xl font-bold text-zinc-900 dark:text-white">
                                        {(props as any).status?.kind === 'late' ? Number((props as any).status?.days) || 0 : 0}
                                    </div>
                                </div>
                                <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 p-3">
                                    <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Versículos restantes</div>
                                    <div className="mt-1 text-xl font-bold text-zinc-900 dark:text-white">
                                        {typeof props.progress.pendingVerses === 'number' ? props.progress.pendingVerses : 0}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 p-3">
                                    <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Dias concluídos</div>
                                    <div className="mt-1 text-xl font-bold text-zinc-900 dark:text-white">{props.progress.done}</div>
                                </div>
                                <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 p-3">
                                    <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Dias restantes</div>
                                    <div className="mt-1 text-xl font-bold text-zinc-900 dark:text-white">{props.progress.remaining}</div>
                                </div>
                            </div>
                            {props.progress.lastCompletedAt ? (
                                <div className="mt-3">
                                    <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                                        Última conclusão às {new Date(props.progress.lastCompletedAt).toLocaleString('pt-BR')}
                                    </span>
                                </div>
                            ) : null}
                        </div>
                        </>
                        ) : null}
                    </div>
                )}
            </div>

            <Modal show={reprogramOpen} onClose={() => setReprogramOpen(false)} maxWidth="lg">
                <div className="p-4 sm:p-6">
                    <div className="pr-10">
                        <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Reprogramar</div>
                        <div className="mt-1 text-lg font-bold text-zinc-900 dark:text-white">Reprogramar Ano Bíblico</div>
                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                            Vamos redistribuir apenas os capítulos que faltam, mantendo o que você já concluiu.
                        </p>
                    </div>

                    <div className="mt-5 space-y-3">
                        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800">
                            <input
                                type="radio"
                                name="mode"
                                checked={reprogramMode === 'keep_end'}
                                onChange={() => setReprogramMode('keep_end')}
                                className="mt-1 cursor-pointer"
                            />
                            <div>
                                <div className="font-bold text-zinc-900 dark:text-white">Manter data final original</div>
                                <div className="text-sm text-zinc-600 dark:text-zinc-400">Redistribui o restante até a data final atual.</div>
                            </div>
                        </label>

                        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800">
                            <input
                                type="radio"
                                name="mode"
                                checked={reprogramMode === 'new_end'}
                                onChange={() => setReprogramMode('new_end')}
                                className="mt-1 cursor-pointer"
                            />
                            <div className="flex-1">
                                <div className="font-bold text-zinc-900 dark:text-white">Escolher nova data final</div>
                                <div className="text-sm text-zinc-600 dark:text-zinc-400">Você define até quando quer terminar.</div>
                                {reprogramMode === 'new_end' ? (
                                    <div className="mt-2">
                                        <input
                                            type="date"
                                            value={newEndDate}
                                            onChange={(e) => setNewEndDate(e.target.value)}
                                            className="w-full cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                                        />
                                    </div>
                                ) : null}
                            </div>
                        </label>

                        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800">
                            <input
                                type="radio"
                                name="mode"
                                checked={reprogramMode === 'start_today_keep_end'}
                                onChange={() => setReprogramMode('start_today_keep_end')}
                                className="mt-1 cursor-pointer"
                            />
                            <div>
                                <div className="font-bold text-zinc-900 dark:text-white">Recomeçar a partir de hoje</div>
                                <div className="text-sm text-zinc-600 dark:text-zinc-400">Mantém a data final e reorganiza o restante a partir de hoje.</div>
                            </div>
                        </label>
                    </div>

                    {preview ? (
                        <div className="mt-4 rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-800/40">
                            <div className="text-sm font-bold text-zinc-900 dark:text-white">Resumo</div>
                            <div className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">
                                Faltam <span className="font-bold">{preview.remaining}</span> capítulos em{' '}
                                <span className="font-bold">{preview.daysRemaining}</span> dia(s). Você precisará ler cerca de{' '}
                                <span className="font-bold">{preview.perDay}</span> capítulo(s) por dia.
                            </div>
                        </div>
                    ) : null}

                    <div className="mt-5">
                        <button
                            type="button"
                            disabled={reprogramming || (reprogramMode === 'new_end' && !newEndDate)}
                            onClick={() => {
                                setReprogramming(true);
                                router.post(
                                    route('mobile.ano-biblico.reprogram'),
                                    reprogramMode === 'new_end'
                                        ? { mode: 'new_end', data_fim: newEndDate }
                                        : { mode: reprogramMode },
                                    {
                                        onSuccess: () => setReprogramOpen(false),
                                        onFinish: () => setReprogramming(false),
                                    },
                                );
                            }}
                            className={primaryCtaClass}
                        >
                            Salvar reprogramação
                        </button>
                    </div>
                </div>
            </Modal>
        </MobileLayout>
    );
}

