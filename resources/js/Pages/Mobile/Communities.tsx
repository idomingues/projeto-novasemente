import MobileLayout from '@/Layouts/MobileLayout';
import { WhatsAppBrandIcon } from '@/Components/SocialBrandIcons';
import { Head, Link, usePage } from '@inertiajs/react';
import { UserGroupIcon } from '@heroicons/react/24/outline';

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
            <div className="mx-auto w-full max-w-3xl space-y-5 lg:max-w-6xl">
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
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 lg:text-base">
                        Grupos de interesse da igreja — toque para entrar no WhatsApp.
                    </p>
                </div>

                {communities.length === 0 ? (
                    <p className="rounded-2xl border border-zinc-200 bg-zinc-50 py-10 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                        Nenhuma comunidade disponível no momento. Volte em breve!
                    </p>
                ) : (
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 lg:gap-5">
                        {communities.map((community) => (
                            <a
                                key={community.id}
                                href={community.whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200/80 transition hover:-translate-y-0.5 hover:ring-teal-300/80 active:bg-zinc-50 dark:bg-zinc-900 dark:ring-zinc-800 dark:hover:ring-teal-700/60 dark:active:bg-zinc-800"
                            >
                                {community.coverUrl ? (
                                    <img
                                        src={imageSrc(community.coverUrl, appUrl)}
                                        alt=""
                                        className="aspect-[3/4] w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                                    />
                                ) : (
                                    <div className="flex aspect-[3/4] w-full items-center justify-center bg-teal-50 dark:bg-teal-950/40">
                                        <UserGroupIcon
                                            className="h-10 w-10 text-teal-600 dark:text-teal-400"
                                            aria-hidden
                                        />
                                    </div>
                                )}

                                <div className="flex flex-1 flex-col gap-2 p-3 sm:p-3.5">
                                    <h2 className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-900 dark:text-white">
                                        {community.name}
                                    </h2>
                                    <p className="line-clamp-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                                        {community.description}
                                    </p>
                                    <span className="mt-auto inline-flex items-center gap-1.5 pt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                        <WhatsAppBrandIcon className="h-4 w-4 shrink-0" />
                                        Entrar no grupo
                                    </span>
                                </div>
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </MobileLayout>
    );
}
