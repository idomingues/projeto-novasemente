import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link } from '@inertiajs/react';
import DeleteUserForm from '@/Pages/Profile/Partials/DeleteUserForm';
import UpdatePasswordForm from '@/Pages/Profile/Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from '@/Pages/Profile/Partials/UpdateProfileInformationForm';

interface Props {
    mustVerifyEmail: boolean;
    status?: string;
}

export default function MobileProfileEdit({ mustVerifyEmail, status }: Props) {
    return (
        <MobileLayout>
            <Head title="Editar perfil" />

            <div className="space-y-5">
                <div className="space-y-1">
                    <Link href={route('mobile.profile')} className="text-sm text-zinc-500 underline dark:text-zinc-400">
                        ← Meu perfil
                    </Link>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Editar perfil</h1>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">Atualize os seus dados e a sua senha.</p>
                </div>

                <div className="space-y-4">
                    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                        <UpdateProfileInformationForm mustVerifyEmail={mustVerifyEmail} status={status} className="max-w-xl" />
                    </div>

                    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                        <UpdatePasswordForm className="max-w-xl" />
                    </div>

                    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                        <DeleteUserForm className="max-w-xl" />
                    </div>
                </div>
            </div>
        </MobileLayout>
    );
}

