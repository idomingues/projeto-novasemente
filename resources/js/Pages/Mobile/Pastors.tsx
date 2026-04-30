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

    return (
        <MobileLayout>
            <Head title="Nossos pastores" />
            <div className="space-y-6">
                <div>
                    <Link href={route('mobile.more')} className="text-sm text-brand-600 dark:text-brand-400 hover:underline">
                        ← Mais
                    </Link>
                    <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Nossos pastores</h1>
                    {churchName && <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{churchName}</p>}
                    <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                        Conheça um pouco da trajetória dos nossos pastores.
                    </p>
                </div>

                {pastors.length === 0 ? (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 py-8 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700">
                        Ainda não há informações disponíveis.
                    </p>
                ) : (
                    <div className="space-y-6">
                        {pastors.map((p) => (
                            <details
                                key={p.id}
                                className="group rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                            >
                                <summary className="list-none cursor-pointer select-none p-4 sm:p-5">
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <div className="relative w-full sm:w-40 h-48 sm:h-40 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0 flex items-center justify-center mx-auto sm:mx-0">
                                            {p.photoUrl ? (
                                                <img src={p.photoUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <UserCircleIcon className="w-20 h-20 text-zinc-400" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1 flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{p.name}</h2>
                                                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                                    Toque para {p.bio ? 'ler' : 'ver'} detalhes
                                                </p>
                                            </div>
                                            <ChevronDownIcon className="h-5 w-5 shrink-0 text-zinc-400 transition-transform group-open:rotate-180" />
                                        </div>
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
                                        <div className="mt-3 text-sm leading-relaxed text-zinc-700 whitespace-pre-wrap dark:text-zinc-300">
                                            {p.bio}
                                        </div>
                                    ) : (
                                        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Sem biografia disponível.</p>
                                    )}
                                </div>
                            </details>
                        ))}
                    </div>
                )}
            </div>
        </MobileLayout>
    );
}
