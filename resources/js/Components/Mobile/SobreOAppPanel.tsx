import AppVersionHistoryModal from '@/Components/AppVersionHistoryModal';
import { useAppFeatures } from '@/hooks/useAppFeatures';
import { useAppVersionLabels } from '@/hooks/useAppVersionLabels';
import { Link, usePage } from '@inertiajs/react';
import {
    ArrowTopRightOnSquareIcon,
    ChevronRightIcon,
    GlobeAltIcon,
    LifebuoyIcon,
} from '@heroicons/react/24/outline';
import { useState, type ReactNode } from 'react';

const OFFICIAL_LINKS: { title: string; subtitle: string; href: string }[] = [
    {
        title: 'Aplicação web',
        subtitle: 'app.novasemente.com.br',
        href: 'https://app.novasemente.com.br/',
    },
];

const LINK_ICON_WRAP =
    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-zinc-200/80 dark:bg-zinc-900 dark:ring-zinc-700';

function AppleLogo({ className = 'h-5 w-5' }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M16.365 1.43c0 1.14-.42 2.2-1.18 3.02-.8.86-2.1 1.52-3.22 1.43-.14-1.1.4-2.25 1.16-3.06.82-.88 2.22-1.53 3.24-1.39zM20.5 17.18c-.58 1.3-.86 1.88-1.61 3.03-1.05 1.6-2.53 3.59-4.36 3.61-1.62.02-2.04-1.06-4.25-1.05-2.2.01-2.66 1.07-4.28 1.05-1.83-.02-3.23-1.82-4.28-3.41C-.1 17.3-.9 12.9.96 9.9c1.17-1.9 3.03-3.1 4.78-3.1 1.78 0 2.9 1.1 4.37 1.1 1.43 0 2.3-1.11 4.37-1.11 1.56 0 3.21.85 4.38 2.31-3.85 2.11-3.23 7.6.64 8.08z" />
        </svg>
    );
}

function PlayStoreLogo({ className = 'h-5 w-5' }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden>
            <path fill="#EA4335" d="M3.6 2.3c-.3.2-.5.6-.5 1.1v17.2c0 .5.2.9.5 1.1l9.4-9.7L3.6 2.3z" />
            <path fill="#FBBC04" d="M16.3 15.1 13.1 11.9 3.6 21.7c.2.1.4.2.7.2.3 0 .7-.1 1-.4l11-6.4z" />
            <path fill="#4285F4" d="M20.7 10.7 16.3 8.1 13.1 11.9l3.2 3.2 4.4-2.5c.9-.5.9-1.4 0-1.9z" />
            <path fill="#34A853" d="M13.1 11.9 16.3 8.1 5.3 1.7c-.3-.2-.7-.3-1-.3-.3 0-.5.1-.7.2l9.5 10.3z" />
        </svg>
    );
}

function StoreLinkCard({
    href,
    title,
    subtitle,
    icon,
}: {
    href: string;
    title: string;
    subtitle: string;
    icon: ReactNode;
}) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex cursor-pointer items-center gap-3 rounded-2xl bg-zinc-50/90 px-3.5 py-3 transition hover:bg-zinc-100 active:scale-[0.99] dark:bg-zinc-950/40 dark:hover:bg-zinc-800/70"
        >
            <span className={LINK_ICON_WRAP}>{icon}</span>
            <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-zinc-900 dark:text-white">{title}</span>
                <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</span>
            </span>
            <ArrowTopRightOnSquareIcon
                className="h-4 w-4 shrink-0 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-zinc-600 dark:group-hover:text-zinc-300"
                aria-hidden
            />
        </a>
    );
}

export default function SobreOAppPanel({ className = '' }: { className?: string }) {
    const { webLabel: webVersionLabel, installedLabel } = useAppVersionLabels();
    const { isEnabled } = useAppFeatures();
    const showSupport = isEnabled('support');
    const { iosAppStoreUrl = null, androidPlayStoreUrl = null } = usePage().props as {
        iosAppStoreUrl?: string | null;
        androidPlayStoreUrl?: string | null;
    };
    const appleUrl = (iosAppStoreUrl ?? '').trim();
    const playUrl = (androidPlayStoreUrl ?? '').trim();
    const hasStores = Boolean(appleUrl || playUrl);
    const [versionsOpen, setVersionsOpen] = useState(false);

    return (
        <div className={`space-y-4 ${className}`.trim()}>
            <button
                type="button"
                onClick={() => setVersionsOpen(true)}
                aria-label="Abrir histórico de versões e ver o que mudou"
                className="group relative flex w-full cursor-pointer overflow-hidden rounded-3xl bg-gradient-to-br from-white via-white to-brand-50/70 p-4 text-left shadow-sm ring-1 ring-brand-900/8 transition duration-200 hover:shadow-md hover:ring-brand-600/20 active:scale-[0.99] dark:from-zinc-900 dark:via-zinc-900 dark:to-brand-950/40 dark:ring-white/8 dark:hover:ring-brand-400/25"
            >
                <span
                    className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-brand-400/10 blur-2xl transition duration-300 group-hover:bg-brand-400/20 dark:bg-brand-500/10"
                    aria-hidden
                />
                <span className="relative min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-900 dark:text-white">Versões</span>
                        <span className="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-800 ring-1 ring-inset ring-brand-200/80 dark:bg-brand-950/50 dark:text-brand-200 dark:ring-brand-800/70">
                            Ver alterações
                        </span>
                    </span>
                    <span className="mt-3 block space-y-2">
                        <span className="flex items-baseline justify-between gap-3">
                            <span className="text-sm text-zinc-600 dark:text-zinc-400">Web</span>
                            <span className="font-mono text-sm font-semibold tabular-nums text-zinc-900 dark:text-white">
                                {webVersionLabel}
                            </span>
                        </span>
                        <span className="flex items-baseline justify-between gap-3">
                            <span className="text-sm text-zinc-600 dark:text-zinc-400">App instalada</span>
                            <span className="font-mono text-sm font-semibold tabular-nums text-zinc-900 dark:text-white">
                                {installedLabel}
                            </span>
                        </span>
                    </span>
                    <span className="mt-3 flex items-center gap-1.5 text-xs font-medium text-brand-700 dark:text-brand-300">
                        Toque para ver o que mudou e o histórico completo
                        <ChevronRightIcon
                            className="h-3.5 w-3.5 transition group-hover:translate-x-0.5"
                            aria-hidden
                        />
                    </span>
                </span>
                <ChevronRightIcon
                    className="relative mt-1 h-5 w-5 shrink-0 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600 dark:text-zinc-600 dark:group-hover:text-brand-400"
                    aria-hidden
                />
            </button>

            <AppVersionHistoryModal
                show={versionsOpen}
                onClose={() => setVersionsOpen(false)}
                highlightLabel={webVersionLabel}
            />

            {showSupport ? (
                <Link
                    href={route('mobile.support.index')}
                    className="group flex cursor-pointer items-center gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-zinc-200/90 transition hover:bg-zinc-50 dark:bg-zinc-900 dark:ring-zinc-800 dark:hover:bg-zinc-800/60"
                >
                    <span className={`${LINK_ICON_WRAP} text-teal-700 dark:text-teal-300`}>
                        <LifebuoyIcon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-zinc-900 dark:text-white">Suporte</span>
                        <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                            Problema, sugestão ou elogio sobre o app
                        </span>
                    </span>
                    <ChevronRightIcon
                        className="h-5 w-5 shrink-0 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-teal-600 dark:text-zinc-600 dark:group-hover:text-teal-300"
                        aria-hidden
                    />
                </Link>
            ) : null}

            {hasStores ? (
                <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-zinc-200/90 dark:bg-zinc-900 dark:ring-zinc-800">
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Baixe o app</h2>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                        Instale na App Store ou na Google Play e acompanhe a comunidade no celular.
                    </p>

                    <div className="mt-4 grid gap-2.5">
                        {appleUrl ? (
                            <StoreLinkCard
                                href={appleUrl}
                                title="App Store"
                                subtitle="Baixar para iPhone"
                                icon={<AppleLogo className="h-5 w-5 text-zinc-900 dark:text-white" />}
                            />
                        ) : null}
                        {playUrl ? (
                            <StoreLinkCard
                                href={playUrl}
                                title="Google Play"
                                subtitle="Baixar para Android"
                                icon={<PlayStoreLogo className="h-5 w-5" />}
                            />
                        ) : null}
                    </div>
                </section>
            ) : null}

            <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-zinc-200/90 dark:bg-zinc-900 dark:ring-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Links oficiais</h2>
                <ul className="mt-3 space-y-2">
                    {OFFICIAL_LINKS.map((row) => (
                        <li key={row.href}>
                            <a
                                href={row.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex cursor-pointer items-center gap-3 rounded-2xl bg-zinc-50/90 px-3.5 py-3 transition hover:bg-zinc-100 dark:bg-zinc-950/40 dark:hover:bg-zinc-800/70"
                            >
                                <span className={`${LINK_ICON_WRAP} text-teal-700 dark:text-teal-300`}>
                                    <GlobeAltIcon className="h-5 w-5" aria-hidden />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-semibold text-zinc-900 dark:text-white">
                                        {row.title}
                                    </span>
                                    <span className="mt-0.5 block truncate text-xs text-zinc-500 dark:text-zinc-400">
                                        {row.subtitle}
                                    </span>
                                </span>
                                <ArrowTopRightOnSquareIcon
                                    className="h-4 w-4 shrink-0 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-teal-600 dark:group-hover:text-teal-300"
                                    aria-hidden
                                />
                            </a>
                        </li>
                    ))}
                </ul>
            </section>

            <p className="pt-1 text-center text-xs text-zinc-500 dark:text-zinc-400">
                Criado por{' '}
                <a
                    href="https://iresult.com.br"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cursor-pointer font-medium text-zinc-700 hover:underline dark:text-zinc-200"
                >
                    iResult.com.br
                </a>
            </p>
        </div>
    );
}
