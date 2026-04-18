import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';
import PastoralAgendaModuleShell from '@/Components/PastoralAgenda/PastoralAgendaModuleShell';

interface Props {
    variant: 'pastor' | 'staff';
    pastorsIndexUrl: string;
    pastoralModuleNavUrl: string | null;
}

export default function PastoralAgendaNeedsAccountLink({ variant, pastorsIndexUrl, pastoralModuleNavUrl }: Props) {
    const description =
        variant === 'pastor'
            ? 'Para publicar horários neste módulo, a sua conta tem de estar ligada a um perfil de pastor nesta igreja.'
            : 'Ainda não há perfis com conta associada, ou precisa de permissões para os gerir. A disponibilidade semanal configura-se no módulo Agenda pastoral após associar utilizadores em Pastores.';

    return (
        <AdminLayout>
            <Head title="Agenda pastoral" />
            <PastoralAgendaModuleShell
                pastoralModuleNavUrl={pastoralModuleNavUrl}
                eyebrow="Módulo agenda pastoral"
                title="Antes de continuar"
                description={description}
            >
                <div className="max-w-2xl space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 text-sm leading-relaxed text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                    {variant === 'pastor' ? (
                        <>
                            <p>
                                Peça à secretaria ou a um administrador para ligar o seu utilizador ao seu perfil em{' '}
                                <span className="font-medium text-zinc-900 dark:text-white">Pastores</span> (campo «Conta da
                                app»).
                            </p>
                            <p>
                                Depois dessa ligação, volte a <span className="font-medium text-zinc-900 dark:text-white">Agenda pastoral</span>{' '}
                                no menu para definir as faixas que os membros escolhem em «Agendar com pastor».
                            </p>
                        </>
                    ) : (
                        <>
                            <p>
                                A agenda de disponibilidade é normalmente editada pelo pastor na conta ligada ao perfil, ou por
                                quem tem permissão de gestão, no módulo dedicado.
                            </p>
                            <p>
                                Em <span className="font-medium text-zinc-900 dark:text-white">Pastores</span>, associe a «Conta
                                da app» e, se precisar, indique «Delegados da agenda» para a secretaria poder editar as mesmas
                                faixas aqui.
                            </p>
                        </>
                    )}
                </div>
                <Link
                    href={pastorsIndexUrl}
                    className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                >
                    Ir para Pastores
                </Link>
            </PastoralAgendaModuleShell>
        </AdminLayout>
    );
}
