import { Link } from '@inertiajs/react';
import { DevicePhoneMobileIcon } from '@heroicons/react/24/outline';

type Props = {
    volunteerName?: string | null;
    volunteersAdminUrl?: string | null;
};

export default function VolunteerNoAppAccountCard({ volunteerName, volunteersAdminUrl }: Props) {
    const who = volunteerName?.trim() || 'Esta pessoa';

    return (
        <section className="rounded-2xl border border-zinc-200 bg-zinc-50/90 p-5 dark:border-zinc-700 dark:bg-zinc-900/50">
            <div className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-200/80 dark:bg-zinc-800">
                    <DevicePhoneMobileIcon className="h-6 w-6 text-zinc-500 dark:text-zinc-400" aria-hidden />
                </div>
                <div className="min-w-0 space-y-2">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">Sem conta no aplicativo</p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-300">
                        {who} ainda não tem e-mail de login cadastrado, então não existe usuário no app para editar
                        aqui.
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Cadastre um e-mail válido em <strong className="font-medium">Voluntários</strong> (edição do
                        cadastro). Depois volte nesta aba para definir senha, perfil e preferências da conta.
                    </p>
                    {volunteersAdminUrl ? (
                        <Link
                            href={volunteersAdminUrl}
                            className="inline-flex cursor-pointer text-sm font-medium text-teal-700 underline dark:text-teal-300"
                        >
                            Abrir lista de voluntários
                        </Link>
                    ) : null}
                </div>
            </div>
        </section>
    );
}
