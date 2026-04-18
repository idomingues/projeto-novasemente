import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import PastoralAgendaModuleShell from '@/Components/PastoralAgenda/PastoralAgendaModuleShell';

interface PastorRow {
    id: number;
    name: string;
}

interface Props {
    pastors: PastorRow[];
    intro?: string | null;
    pastoralModuleNavUrl: string | null;
}

export default function PastoralAgendaAdminSelectPastor({ pastors, intro = null, pastoralModuleNavUrl }: Props) {
    const defaultIntro =
        'Escolha o perfil pastoral para configurar as faixas semanais. Os membros veem estas opções em «Agendar com pastor» na app.';

    return (
        <AdminLayout>
            <Head title="Agenda pastoral — escolher perfil" />
            <PastoralAgendaModuleShell
                pastoralModuleNavUrl={pastoralModuleNavUrl}
                eyebrow="Módulo agenda pastoral"
                title="Quem deseja configurar?"
                description={intro ?? defaultIntro}
            >
                <ul className="grid gap-3 sm:grid-cols-2">
                    {pastors.map((p) => (
                        <li key={p.id}>
                            <Link
                                href={route('pastoral-agenda.index', { pastor: p.id })}
                                className="group flex min-h-[4.5rem] items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-4 shadow-sm transition hover:border-primary-400/60 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-primary-500/40"
                            >
                                <span className="min-w-0 truncate text-base font-semibold text-zinc-900 dark:text-white">{p.name}</span>
                                <ChevronRightIcon
                                    className="h-5 w-5 shrink-0 text-zinc-400 transition group-hover:text-primary-600 dark:group-hover:text-primary-400"
                                    aria-hidden
                                />
                            </Link>
                        </li>
                    ))}
                </ul>
                {pastoralModuleNavUrl ? (
                    <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
                        Os perfis são geridos em{' '}
                        <Link href={pastoralModuleNavUrl} className="font-semibold text-primary-600 underline-offset-2 hover:underline dark:text-primary-400">
                            Pastores
                        </Link>
                        .
                    </p>
                ) : null}
            </PastoralAgendaModuleShell>
        </AdminLayout>
    );
}
