import MobileLayout from '@/Layouts/MobileLayout';
import { Head, usePage } from '@inertiajs/react';
import { NewspaperIcon } from '@heroicons/react/24/outline';

function imageSrc(url: string | null, appUrl: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = appUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    return `${base}${url}`;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface Post {
    id: number;
    title: string;
    slug: string;
    excerpt: string | null;
    body: string;
    image_url: string | null;
    published_at: string | null;
}

interface Props {
    posts: {
        data: Post[];
        links: PaginationLink[];
        current_page: number;
        last_page: number;
    };
}

function formatDate(iso: string | null): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

export default function MobileNews({ posts }: Props) {
    const appUrl = (usePage().props as { appUrl?: string }).appUrl ?? '';
    return (
        <MobileLayout>
            <Head title="Notícias" />
            <div className="space-y-6">
                {posts.data.length === 0 ? (
                    <div className="py-12 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                            <NewspaperIcon className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
                        </div>
                        <p className="text-zinc-600 dark:text-zinc-400 font-medium">Nenhuma notícia publicada</p>
                        <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-1">As novidades aparecerão aqui.</p>
                    </div>
                ) : (
                    <ul className="space-y-5">
                        {posts.data.map((p) => (
                            <li
                                key={p.id}
                                className="rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm active:scale-[0.99] transition-transform"
                            >
                                {p.image_url ? (
                                    <div className="relative aspect-[16/10] overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                                        <img
                                            src={imageSrc(p.image_url, appUrl)}
                                            alt=""
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                            decoding="async"
                                            onError={(e) => {
                                                const el = e.currentTarget;
                                                el.style.display = 'none';
                                                const next = el.nextElementSibling as HTMLElement | null;
                                                if (next) next.style.display = 'flex';
                                            }}
                                        />
                                        <div className="absolute inset-0 hidden items-center justify-center bg-zinc-200 dark:bg-zinc-700" style={{ display: 'none' }} aria-hidden>
                                            <NewspaperIcon className="w-12 h-12 text-zinc-400" />
                                        </div>
                                        <span className="absolute bottom-2 left-3 px-2.5 py-1 rounded-lg bg-black/60 text-white text-xs font-medium backdrop-blur-sm">
                                            {formatDate(p.published_at)}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="h-32 bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 flex items-center justify-center">
                                        <NewspaperIcon className="w-12 h-12 text-zinc-400 dark:text-zinc-500" />
                                    </div>
                                )}
                                <div className="p-4">
                                    <h2 className="font-semibold text-zinc-900 dark:text-white text-lg leading-snug line-clamp-2">
                                        {p.title}
                                    </h2>
                                    {!p.image_url && (
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5">
                                            {formatDate(p.published_at)}
                                        </p>
                                    )}
                                    <div
                                        className="mt-3 text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed line-clamp-3"
                                        dangerouslySetInnerHTML={{
                                            __html: p.excerpt || p.body.slice(0, 280) + (p.body.length > 280 ? '…' : ''),
                                        }}
                                    />
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </MobileLayout>
    );
}
