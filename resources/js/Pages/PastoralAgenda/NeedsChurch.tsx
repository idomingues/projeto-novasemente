import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';
import PastoralAgendaModuleShell from '@/Components/PastoralAgenda/PastoralAgendaModuleShell';

interface Props {
    canManageChurches: boolean;
    churchesIndexUrl: string | null;
    pastoralModuleNavUrl: string | null;
}

export default function PastoralAgendaNeedsChurch({ canManageChurches, churchesIndexUrl, pastoralModuleNavUrl }: Props) {
    return (
        <AdminLayout>
            <Head title="Agenda pastoral" />
            <PastoralAgendaModuleShell
                pastoralModuleNavUrl={pastoralModuleNavUrl}
                eyebrow="Módulo agenda pastoral"
                title="Antes de continuar"
                description="Para configurar a agenda pastoral, primeiro é necessário ter pelo menos uma igreja cadastrada no sistema."
            >
                <div className="max-w-2xl space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 text-sm leading-relaxed text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                    <p>
                        Nenhuma igreja foi encontrada. Sem uma igreja ativa, não é possível definir disponibilidade semanal nem
                        carregar os perfis de pastor.
                    </p>
                    {canManageChurches ? (
                        <p>
                            Cadastre uma igreja em <span className="font-medium text-zinc-900 dark:text-white">Igrejas</span> e
                            depois volte aqui.
                        </p>
                    ) : (
                        <p>
                            Peça a um administrador para cadastrar a igreja e, em seguida, associar os perfis de pastor conforme
                            necessário.
                        </p>
                    )}
                </div>
                {canManageChurches && churchesIndexUrl ? (
                    <Link
                        href={churchesIndexUrl}
                        className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                    >
                        Ir para Igrejas
                    </Link>
                ) : null}
            </PastoralAgendaModuleShell>
        </AdminLayout>
    );
}

