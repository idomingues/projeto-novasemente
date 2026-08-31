import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import ImageDownloadButton from '@/Components/ImageDownloadButton';
import { UserCircleIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

interface PastorPublic {
    id: number;
    name: string;
    bio: string | null;
    photoUrl: string | null;
}

interface Props {
    pastors: PastorPublic[];
    churchName: string | null;
}

export default function MobilePastors({ pastors, churchName }: Props) {
    const appUrl = (usePage().props as { appUrl?: string }).appUrl ?? '';
    const authUser = (usePage().props as { auth?: { user?: unknown } | null }).auth?.user;
    const canBook =
        Boolean(authUser) && route().has('mobile.solicitations.hub');

    return (
        <MobileLayout>
            <Head title="Pastores" />
            <div className="mx-auto w-full max-w-lg space-y-6 pb-4 sm:max-w-xl md:max-w-2xl">
                <div>
                    <Link href={route('mobile.conheca')} className="cursor-pointer text-sm text-brand-600 hover:underline dark:text-brand-400">
                        ← Conheça a Nova Semente
                    </Link>
                    <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">Pastores</h1>
                    {churchName && <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{churchName}</p>}
                    <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                        Conheça um pouco da trajetória dos nossos pastores.
                    </p>
                </div>

                {pastors.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-zinc-200 py-8 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
                        Ainda não há informações disponíveis.
                    </p>
                ) : (
                    <div className="space-y-6">
                        {pastors.map((p) => (
                            <div
                                key={p.id}
                                className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                            >
                            <details className="group">
                                {p.photoUrl ? (
                                    <div className="relative w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                                        <img
                                            src={p.photoUrl}
                                            alt=""
                                            className="block h-auto w-full object-contain object-center"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex aspect-square w-full items-center justify-center bg-zinc-100 dark:bg-zinc-800">
                                        <UserCircleIcon className="h-20 w-20 text-zinc-400" />
                                    </div>
                                )}

                                <summary className="list-none cursor-pointer select-none p-4 sm:p-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{p.name}</h2>
                                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                                Toque para {p.bio ? 'ler' : 'ver'} detalhes
                                            </p>
                                        </div>
                                        <ChevronDownIcon className="h-5 w-5 shrink-0 text-zinc-400 transition-transform group-open:rotate-180" />
                                    </div>
                                </summary>

                                <div className="border-t border-zinc-100 px-4 py-4 dark:border-zinc-800 sm:px-5">
                                    {p.photoUrl ? (
                                        <div className="flex justify-end">
                                            <ImageDownloadButton
                                                src={p.photoUrl}
                                                appUrl={appUrl}
                                                filenameBase={`pastor-${p.id}`}
                                                size="sm"
                                            />
                                        </div>
                                    ) : null}

                                    {p.bio ? (
                                        <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                                            {p.bio}
                                        </div>
                                    ) : (
                                        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Sem biografia disponível.</p>
                                    )}
                                </div>
                            </details>
                            {canBook ? (
                                <div className="border-t border-zinc-100 px-4 py-3 dark:border-zinc-800 sm:px-5">
                                    <Link
                                        href={route('mobile.solicitations.hub', {
                                            novo: 1,
                                            tipo: 'pastoral',
                                            pastor: p.id,
                                        })}
                                        className="inline-flex w-full cursor-pointer items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                                    >
                                        Agendar horário
                                    </Link>
                                </div>
                            ) : null}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </MobileLayout>
    );
}
