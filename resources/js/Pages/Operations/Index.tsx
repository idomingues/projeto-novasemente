import AdminLayout from '@/Layouts/AdminLayout';
import { Head } from '@inertiajs/react';
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

interface Props {
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

export default function OperationsIndex({
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
    return (
        <AdminLayout>
            <Head title="Operações & infra" />

            <div className="space-y-8">
                <PageHeader
                    title="Operações & segurança"
                    subtitle="Métricas aproximadas para dimensionar infra e rever tentativas de login. Acesso exclusivo de super administrador."
                />

                {sessionsNote ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                        {sessionsNote}
                    </div>
                ) : null}

                <section>
                    <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 mb-3">Sessões (aprox.)</h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <StatCard
                            title={`Sessões activas (~${sessionActiveWindowMinutes} min)`}
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
                    <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 mb-3">Protecção de login</h2>
                    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/30 p-5 text-sm text-zinc-700 dark:text-zinc-300 space-y-2">
                        <p>
                            • Honeypot no formulário (campo oculto que bots preenchem). • Limite por identidade:{' '}
                            <strong>{security.maxAttemptsPerIdentity}</strong> falhas /{' '}
                            <strong>{security.decayMinutes}</strong> min. • Limite global por IP:{' '}
                            <strong>{security.maxAttemptsPerIp}</strong> tentativas /{' '}
                            <strong>{security.ipDecayMinutes}</strong> min. • Throttle HTTP no POST <code className="text-xs">/login</code>.
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Comando de limpeza: <code className="text-xs">php artisan auth:prune-login-events</code> (agendado semanalmente).
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
                                                {e.createdAt ? new Date(e.createdAt).toLocaleString() : '—'}
                                            </td>
                                            <td className="px-4 py-2.5 font-medium">{e.outcomeLabel}</td>
                                            <td className="px-4 py-2.5">
                                                {e.userName ?? (e.userId ? `#${e.userId}` : '—')}
                                            </td>
                                            <td className="px-4 py-2.5 font-mono text-xs">{e.ip ?? '—'}</td>
                                            <td className="px-4 py-2.5 text-xs text-zinc-500 max-w-xs truncate" title={e.userAgent ?? ''}>
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
        </AdminLayout>
    );
}
