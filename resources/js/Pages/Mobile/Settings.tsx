import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link } from '@inertiajs/react';
import { SunIcon, MoonIcon, UserCircleIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { useTheme } from '@/Contexts/ThemeContext';

interface ChurchInfo {
    name: string;
    logo_url: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    description: string | null;
}

interface UserInfo {
    name: string;
    email: string;
}

interface Props {
    church: ChurchInfo | null;
    user: UserInfo | null;
}

export default function MobileSettings({ church, user }: Props) {
    const { theme, toggleTheme } = useTheme();

    return (
        <MobileLayout>
            <Head title="Configurações" />
            <div className="space-y-6">
                <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Configurações</h1>

                <section className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                    <h2 className="px-4 py-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                        Aparência
                    </h2>
                    <button
                        type="button"
                        onClick={toggleTheme}
                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 active:bg-zinc-100 dark:active:bg-zinc-800"
                    >
                        <span className="flex items-center gap-3">
                            {theme === 'dark' ? (
                                <SunIcon className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                            ) : (
                                <MoonIcon className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                            )}
                            <span className="text-zinc-900 dark:text-white">Tema</span>
                        </span>
                        <span className="text-sm text-zinc-500 dark:text-zinc-400">
                            {theme === 'dark' ? 'Escuro' : 'Claro'}
                        </span>
                    </button>
                </section>

                {church && (
                    <section className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                        <h2 className="px-4 py-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
                            <BuildingOfficeIcon className="w-4 h-4" />
                            Igreja
                        </h2>
                        <div className="p-4 space-y-2">
                            <div className="flex items-center gap-3">
                                {church.logo_url ? (
                                    <img
                                        src={church.logo_url}
                                        alt=""
                                        className="w-12 h-12 rounded-xl object-cover"
                                    />
                                ) : (
                                    <div className="w-12 h-12 rounded-xl bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-500 dark:text-zinc-400 font-bold">
                                        {church.name.charAt(0)}
                                    </div>
                                )}
                                <div>
                                    <p className="font-semibold text-zinc-900 dark:text-white">
                                        {church.name}
                                    </p>
                                    {(church.city || church.state) && (
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                            {[church.city, church.state, church.country]
                                                .filter(Boolean)
                                                .join(', ')}
                                        </p>
                                    )}
                                </div>
                            </div>
                            {church.description && (
                                <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-2">
                                    {church.description}
                                </p>
                            )}
                        </div>
                    </section>
                )}

                {user && (
                    <section className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                        <h2 className="px-4 py-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
                            <UserCircleIcon className="w-4 h-4" />
                            Conta
                        </h2>
                        <div className="p-4">
                            <p className="font-medium text-zinc-900 dark:text-white">{user.name}</p>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">{user.email}</p>
                            <Link
                                href={route('profile.edit')}
                                className="inline-block mt-3 text-sm font-medium text-primary-600 dark:text-primary-400"
                            >
                                Editar perfil
                            </Link>
                        </div>
                    </section>
                )}

                <section className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                    <Link
                        href={route('dashboard')}
                        className="block px-4 py-3 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 active:bg-zinc-100 dark:active:bg-zinc-800"
                    >
                        Acessar painel administrativo
                    </Link>
                </section>
            </div>
        </MobileLayout>
    );
}
