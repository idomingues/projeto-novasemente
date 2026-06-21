import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';
import PageHeader from '@/Components/PageHeader';

type RecentEvent = {
    id: number;
    outcome: string;
    outcomeLabel: string;
    userName: string | null;
    userId: number | null;
    ip: string | null;
    userAgent: string | null;
    createdAt: string | null;
};

type PageViewPage = {
    routeName: string;
    label: string;
    views: number;
};

type PageViewsPayload = {
    enabled: boolean;
    note: string | null;
    selectedMonth: string;
    selectedMonthLabel: string;
    availableMonths: { key: string; label: string }[];
    totalViews: number;
    pages: PageViewPage[];
};

interface Props {
    activeTab?: 'security' | 'pages';
    churchName?: string | null;
    pageViews: PageViewsPayload;
    sessionDriver: string;
    sessionActiveWindowMinutes: number;
    sessionsTotalApprox: number;
    sessionsDistinctUsersApprox: number;
    sessionsNote: string | null;
    loginsSuccessToday: number;
    loginsFailedToday: number;
    lockoutsToday: number;
    distinctUsersSuccessToday: number;
    recentEvents: RecentEvent[];
    security: {
        maxAttemptsPerIdentity: number;
        decayMinutes: number;
        maxAttemptsPerIp: number;
        ipDecayMinutes: number;
    };
}

function StatCard({ title, value, hint }: { title: string; value: number | string; hint?: string | null }) {
    return (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{title}</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-zinc-900 dark:text-white">{value}</p>
            {hint ? <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{hint}</p> : null}
        </div>
    );
}

function tabButtonClass(active: boolean): string {
    return [
        'flex-1 min-w-[10rem] px-4 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px text-center',
        active
            ? 'border-teal-600 text-teal-800 dark:border-teal-400 dark:text-teal-200'
            : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200',
    ].join(' ');
}

export default function OperationsIndex({
    activeTab: initialTab = 'security',
    churchName = null,
    pageViews,
    sessionDriver,
    sessionActiveWindowMinutes,
    sessionsTotalApprox,
    sessionsDistinctUsersApprox,
    sessionsNote,
    loginsSuccessToday,
    loginsFailedToday,
    lockoutsToday,
    distinctUsersSuccessToday,
    recentEvents,
    security,
}: Props) {
    const tab = initialTab;

    const goToTab = (next: 'security' | 'pages') => {
        router.get(
            route('operations.index'),
            next === 'pages'
                ? { tab: 'pages', month: pageViews.selectedMonth }
                : { tab: 'security' },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const changeMonth = (monthKey: string) => {
        router.get(
            route('operations.index'),
            { tab: 'pages', month: monthKey },
            { preserveState: true, preserveScroll: true },
        );
    };

    return (
        <AdminLayout>
            <Head title="Operações & infra" />

            <div className="space-y-6">
                <PageHeader
                    title="Operações & segurança"
                    subtitle="Métricas de infraestrutura, tentativas de login e páginas mais acessadas no app e no painel. Acesso exclusivo de super administrador."
                />

                <nav
                    role="tablist"
                    aria-label="Seções de operações"
                    className="sticky top-0 z-10 -mx-1 flex flex-wrap border-b border-zinc-200 bg-zinc-50/95 px-1 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90"
                >
                    <button
                        type="button"
                        role="tab"
                        aria-selected={tab === 'security'}
                        className={tabButtonClass(tab === 'security')}
                        onClick={() => goToTab('security')}
                    >
                        Segurança e sessões
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={tab === 'pages'}
                        className={tabButtonClass(tab === 'pages')}
                        onClick={() => goToTab('pages')}
                    >
                        Páginas mais acessadas
                    </button>
                </nav>

                {tab === 'security' ? (
                    <div className="space-y-8">
                        {sessionsNote ? (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                                {sessionsNote}
                            </div>
                        ) : null}

                        <section>
                            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 mb-3">Sessões (aprox.)</h2>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                <StatCard
                                    title={`Sessões ativas (~${sessionActiveWindowMinutes} min)`}
                                    value={sessionsTotalApprox}
                                    hint={`Driver: ${sessionDriver}. Contagem de linhas em \`sessions\` com last_activity recente.`}
                                />
                                <StatCard
                                    title="Usuários com sessão (distinct)"
                                    value={sessionsDistinctUsersApprox}
                                    hint="Aproximação de usuários únicos com sessão na mesma janela."
                                />
                            </div>
                        </section>

                        <section>
                            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 mb-3">Logins hoje (audit)</h2>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                <StatCard title="Logins com sucesso" value={loginsSuccessToday} />
                                <StatCard title="Usuários distintos (sucesso)" value={distinctUsersSuccessToday} />
                                <StatCard title="Falhas de credenciais" value={loginsFailedToday} />
                                <StatCard title="Bloqueios (rate limit)" value={lockoutsToday} />
                            </div>
                        </section>

                        <section>
                            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 mb-3">Proteção de login</h2>
                            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/30 p-5 text-sm text-zinc-700 dark:text-zinc-300 space-y-2">
                                <p>
                                    • Honeypot no formulário (campo oculto que bots preenchem). • Limite por identidade:{' '}
                                    <strong>{security.maxAttemptsPerIdentity}</strong> tentativas inválidas /{' '}
                                    <strong>{security.decayMinutes}</strong> min. • Limite global por IP:{' '}
                                    <strong>{security.maxAttemptsPerIp}</strong> tentativas /{' '}
                                    <strong>{security.ipDecayMinutes}</strong> min. • Throttle HTTP no POST{' '}
                                    <code className="text-xs">/login</code>.
                                </p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    Comando de limpeza: <code className="text-xs">php artisan auth:prune-login-events</code>{' '}
                                    (agendado semanalmente).
                                </p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 mb-3">Últimos eventos</h2>
                            <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
                                <table className="min-w-full text-left text-sm">
                                    <thead className="bg-zinc-100 dark:bg-zinc-800/80 text-xs uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                                        <tr>
                                            <th className="px-4 py-3">Quando</th>
                                            <th className="px-4 py-3">Resultado</th>
                                            <th className="px-4 py-3">Usuário</th>
                                            <th className="px-4 py-3">IP</th>
                                            <th className="px-4 py-3">User-Agent</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-950/40">
                                        {recentEvents.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                                                    Ainda não há eventos registrados.
                                                </td>
                                            </tr>
                                        ) : (
                                            recentEvents.map((e) => (
                                                <tr key={e.id} className="text-zinc-800 dark:text-zinc-200">
                                                    <td className="px-4 py-2.5 whitespace-nowrap text-xs text-zinc-500">
                                                        {e.createdAt ? new Date(e.createdAt).toLocaleString('pt-BR') : '—'}
                                                    </td>
                                                    <td className="px-4 py-2.5 font-medium">{e.outcomeLabel}</td>
                                                    <td className="px-4 py-2.5">
                                                        {e.userName ?? (e.userId ? `#${e.userId}` : '—')}
                                                    </td>
                                                    <td className="px-4 py-2.5 font-mono text-xs">{e.ip ?? '—'}</td>
                                                    <td
                                                        className="px-4 py-2.5 text-xs text-zinc-500 max-w-xs truncate"
                                                        title={e.userAgent ?? ''}
                                                    >
                                                        {e.userAgent ?? '—'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/30 p-5 text-sm text-zinc-700 dark:text-zinc-300">
                            <p>
                                Visualizações de páginas (GET com resposta OK), agregadas por dia e igreja.
                                {churchName ? (
                                    <>
                                        {' '}
                                        Igreja em contexto: <strong className="text-zinc-900 dark:text-white">{churchName}</strong>.
                                    </>
                                ) : null}
                            </p>
                            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                                A contagem é feita após enviar a página ao usuário; rotas de login, arquivos, debug e itens de
                                abas da barra inferior (Início, Culto, Notícias, etc.) não entram no ranking.
                            </p>
                        </div>

                        {pageViews.note ? (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                                {pageViews.note}
                            </div>
                        ) : null}

                        {pageViews.enabled && !pageViews.note ? (
                            <>
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                                    <div>
                                        <label htmlFor="page-views-month" className="block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                            Mês
                                        </label>
                                        <select
                                            id="page-views-month"
                                            value={pageViews.selectedMonth}
                                            onChange={(e) => changeMonth(e.target.value)}
                                            className="mt-1.5 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                                        >
                                            {pageViews.availableMonths.map((m) => (
                                                <option key={m.key} value={m.key}>
                                                    {m.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <StatCard
                                        title={`Total em ${pageViews.selectedMonthLabel}`}
                                        value={pageViews.totalViews.toLocaleString('pt-BR')}
                                        hint="Soma das páginas de conteúdo no mês (sem hubs de navegação)."
                                    />
                                </div>

                                {pageViews.pages.length === 0 ? (
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                        Nenhuma visualização registrada neste mês para esta igreja.
                                    </p>
                                ) : (
                                    <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 overflow-hidden shadow-sm">
                                        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                            {pageViews.pages.map((page) => (
                                                <li
                                                    key={page.routeName}
                                                    className="flex items-center justify-between gap-4 px-5 py-3"
                                                >
                                                    <div className="min-w-0">
                                                        <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                                                            {page.label}
                                                        </p>
                                                        <p className="truncate font-mono text-xs text-zinc-500">{page.routeName}</p>
                                                    </div>
                                                    <span className="shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-sm font-semibold tabular-nums text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                                                        {page.views.toLocaleString('pt-BR')}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </section>
                                )}
                            </>
                        ) : null}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
