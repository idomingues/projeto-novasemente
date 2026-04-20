import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import ImageDownloadButton from '@/Components/ImageDownloadButton';
import { UserCircleIcon } from '@heroicons/react/24/outline';

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
                </div>

                {pastors.length === 0 ? (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 py-8 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700">
                        Ainda não há informações disponíveis.
                    </p>
                ) : (
                    <div className="space-y-6">
                        {pastors.map((p) => (
                            <article
                                key={p.id}
                                className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm"
                            >
                                <div className="flex flex-col sm:flex-row gap-4 p-4 sm:p-5">
                                    <div className="relative w-full sm:w-40 h-48 sm:h-40 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0 flex items-center justify-center mx-auto sm:mx-0">
                                        {p.photoUrl ? (
                                            <img src={p.photoUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <UserCircleIcon className="w-20 h-20 text-zinc-400" />
                                        )}
                                        {p.photoUrl ? (
                                            <ImageDownloadButton
                                                src={p.photoUrl}
                                                appUrl={appUrl}
                                                filenameBase={`pastor-${p.id}`}
                                                className="absolute bottom-2 right-2 z-10"
                                                size="sm"
                                            />
                                        ) : null}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{p.name}</h2>
                                        {p.bio && (
                                            <div className="mt-3 text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                                                {p.bio}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </MobileLayout>
    );
}
