import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link } from '@inertiajs/react';

interface Props {
    linked: boolean;
}

/**
 * Só utilizado quando a conta ainda não está ligada a um pastor (caso contrário o servidor redireciona para Agenda Pastoral no painel).
 */
export default function PastorMyAvailability({ linked }: Props) {
    return (
        <MobileLayout>
            <Head title="Agenda Pastoral" />
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Link href={route('mobile.home')} className="text-sm text-zinc-500 underline">
                        ← Início
                    </Link>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Agenda Pastoral</h1>

                {!linked ? (
                    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 text-sm text-zinc-600 dark:text-zinc-400">
                        <p>
                            A sua conta ainda não está associada a um registro de pastor nesta igreja. Peça à secretaria ou a um
                            administrador para ligar o seu usuário ao seu perfil em{' '}
                            <span className="font-medium text-zinc-800 dark:text-zinc-200">Pastores</span> (campo «Conta da
                            app»).
                        </p>
                        <p className="mt-2">
                            Depois disso, poderá definir a agenda semanal em <span className="font-medium">Agenda Pastoral</span>{' '}
                            no menu lateral (ou em Mais na app).
                        </p>
                    </div>
                ) : null}
            </div>
        </MobileLayout>
    );
}
