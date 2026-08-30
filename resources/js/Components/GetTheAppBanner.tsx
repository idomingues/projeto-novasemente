import { XMarkIcon } from '@heroicons/react/20/solid';
import { useGetTheAppBanner } from '@/hooks/useGetTheAppBanner';

/**
 * Faixa compacta no topo (padrão App Store / Instagram / YouTube) oferecendo
 * o app nativo — só no celular, no navegador, e dispensável.
 */
export default function GetTheAppBanner() {
    const { visible, dismiss, storeUrl, appName, logoUrl } = useGetTheAppBanner();

    if (!visible || !storeUrl) {
        return null;
    }

    return (
        <div
            className="fixed inset-x-0 top-0 z-[45] border-b border-zinc-200/90 bg-white/95 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md md:hidden dark:border-zinc-800 dark:bg-zinc-950/95"
            role="region"
            aria-label="Baixar o aplicativo"
        >
            <div className="flex h-[3.25rem] items-center gap-1.5 px-1.5 sm:px-2">
                <button
                    type="button"
                    onClick={dismiss}
                    className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                    aria-label="Dispensar aviso de baixar o app"
                >
                    <XMarkIcon className="h-5 w-5" aria-hidden />
                </button>

                <a
                    href={storeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5"
                >
                    <img
                        src={logoUrl}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-[10px] object-cover object-center ring-1 ring-zinc-200/90 dark:ring-zinc-700 dark:invert"
                    />
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold leading-tight text-zinc-900 dark:text-white">
                            {appName}
                        </span>
                        <span className="block truncate text-[11px] leading-tight text-zinc-500 dark:text-zinc-400">
                            Baixe o app
                        </span>
                    </span>
                    <span className="mr-1 inline-flex h-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 px-3.5 text-[13px] font-semibold text-white dark:bg-white dark:text-zinc-900">
                        Abrir
                    </span>
                </a>
            </div>
        </div>
    );
}
