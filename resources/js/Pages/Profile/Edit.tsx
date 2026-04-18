import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

function canAccessPastorsCadastro(permissions: string[] | undefined): boolean {
    const p = permissions ?? [];
    return p.includes('pastors.view') || p.includes('pastors.manage');
}

export default function Edit({
    mustVerifyEmail,
    status,
}: PageProps<{ mustVerifyEmail: boolean; status?: string }>) {
    const { auth } = usePage().props as { auth?: { permissions?: string[] } };
    const supportRouteName = route().has('support.index') ? 'support.index' : 'mobile.support.index';
    const showPastorsCadastro = canAccessPastorsCadastro(auth?.permissions);

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                    Perfil
                </h2>
            }
        >
            <Head title="Perfil" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-zinc-800 p-4 shadow sm:rounded-lg sm:p-8">
                        <UpdateProfileInformationForm
                            mustVerifyEmail={mustVerifyEmail}
                            status={status}
                            className="max-w-xl"
                        />
                    </div>

                    <div className="bg-white dark:bg-zinc-800 p-4 shadow sm:rounded-lg sm:p-8">
                        <UpdatePasswordForm className="max-w-xl" />
                    </div>

                    {showPastorsCadastro && (
                        <div className="bg-white dark:bg-zinc-800 p-4 shadow sm:rounded-lg sm:p-8">
                            <div className="max-w-xl">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                    Pastores
                                </h3>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                    Fotos e textos da equipe pastoral exibidos em Mais → Nossos pastores.
                                </p>
                                <Link
                                    href={route('pastors.index')}
                                    className="mt-4 inline-flex text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
                                >
                                    Gerir pastores
                                </Link>
                            </div>
                        </div>
                    )}

                    <div className="bg-white dark:bg-zinc-800 p-4 shadow sm:rounded-lg sm:p-8">
                        <div className="max-w-xl">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Suporte do app</h3>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                Envie pedidos de ajuda ou acompanhe os seus tickets.
                            </p>
                            <Link
                                href={route(supportRouteName)}
                                className="mt-4 inline-flex text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
                            >
                                Abrir suporte do app
                            </Link>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-800 p-4 shadow sm:rounded-lg sm:p-8">
                        <DeleteUserForm className="max-w-xl" />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
