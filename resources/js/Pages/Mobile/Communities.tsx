import MobileLayout from '@/Layouts/MobileLayout';
import { WhatsAppBrandIcon } from '@/Components/SocialBrandIcons';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowTopRightOnSquareIcon, UserGroupIcon } from '@heroicons/react/24/outline';

type CommunityCard = {
    id: number;
    name: string;
    description: string;
    whatsappUrl: string;
    coverUrl: string | null;
};

interface Props {
    communities: CommunityCard[];
}

function imageSrc(url: string | null, appUrl: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = appUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    return `${base}${url}`;
}

export default function MobileCommunities({ communities }: Props) {
    const appUrl = (usePage().props as { appUrl?: string }).appUrl ?? '';
    return (
        <MobileLayout>
            <Head title="Comunidades" />
            <div className="mx-auto w-full max-w-3xl space-y-6 lg:max-w-6xl">
                <div>
                    <Link
                        href={route('mobile.more')}
                        className="cursor-pointer text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
                    >
                        ← Mais
                    </Link>
                    <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white lg:text-3xl">
                        Comunidades
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400 lg:text-base">
                        Encontre grupos de interesse da igreja e entre no WhatsApp para se conectar com quem compartilha
                        os mesmos gostos e propósitos.
                    </p>
                </div>

                {communities.length === 0 ? (
                    <p className="rounded-2xl border border-zinc-200 bg-zinc-50 py-10 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                        Nenhuma comunidade disponível no momento. Volte em breve!
                    </p>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-5">
                        {communities.map((community) => (
                            <article
                                key={community.id}
                                className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200/80 dark:bg-zinc-900 dark:ring-zinc-800"
                            >
                                {community.coverUrl ? (
                                    <img
                                        src={imageSrc(community.coverUrl, appUrl)}
                                        alt=""
                                        className="aspect-[16/9] w-full object-cover"
                                    />
                                ) : (
                                    <div className="flex aspect-[16/9] w-full items-center justify-center bg-teal-50 dark:bg-teal-950/40">
                                        <UserGroupIcon className="h-14 w-14 text-teal-600 dark:text-teal-400" aria-hidden />
                                    </div>
                                )}

                                <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
                                    <div>
                                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                                            {community.name}
                                        </h2>
                                        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                                            {community.description}
                                        </p>
                                    </div>

                                    <a
                                        href={community.whatsappUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group mt-auto inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 active:bg-emerald-800"
                                    >
                                        <WhatsAppBrandIcon className="h-5 w-5 shrink-0" />
                                        Entrar no grupo
                                        <ArrowTopRightOnSquareIcon className="h-4 w-4 opacity-80 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                    </a>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </MobileLayout>
    );
}
