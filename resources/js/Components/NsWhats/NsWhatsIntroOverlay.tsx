import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

const STORAGE_PREFIX = 'ns-conecta-intro-dismissed';

function storageKey(userId: number | null): string {
    return userId ? `${STORAGE_PREFIX}:u${userId}` : STORAGE_PREFIX;
}

function readDismissed(userId: number | null): boolean {
    try {
        return window.localStorage.getItem(storageKey(userId)) === '1';
    } catch {
        return false;
    }
}

function writeDismissed(userId: number | null): void {
    try {
        window.localStorage.setItem(storageKey(userId), '1');
    } catch {
        // ignore quota / private mode
    }
}

type AuthProps = {
    auth?: { user?: { id?: number } | null };
};

/**
 * Boas-vindas na primeira visita ao NS Conecta (por usuário, no aparelho).
 */
export default function NsWhatsIntroOverlay() {
    const { auth } = usePage().props as AuthProps;
    const userId = auth?.user?.id != null ? Number(auth.user.id) : null;
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        setVisible(!readDismissed(userId));
    }, [userId]);

    if (!visible) {
        return null;
    }

    const dismiss = () => {
        writeDismissed(userId);
        setVisible(false);
    };

    return (
        <div
            className="absolute inset-0 z-40 flex items-center justify-center bg-zinc-950/55 px-5 backdrop-blur-[2px] dark:bg-black/60"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ns-conecta-intro-title"
            style={{
                paddingTop: 'env(safe-area-inset-top, 0px)',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
        >
            <div
                className="relative w-full max-w-sm overflow-hidden rounded-3xl shadow-2xl shadow-black/40 ring-1 ring-white/10"
                style={{
                    background:
                        'radial-gradient(120% 90% at 0% 0%, rgba(65,177,68,0.28), transparent 55%), radial-gradient(90% 80% at 100% 100%, rgba(0,141,54,0.22), transparent 50%), linear-gradient(165deg, #0d2418 0%, #07140e 55%, #040a07 100%)',
                }}
            >
                <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-10"
                    style={{
                        backgroundImage:
                            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.55) 1px, transparent 0)',
                        backgroundSize: '14px 14px',
                    }}
                    aria-hidden
                />

                <div className="relative z-10 px-6 pb-6 pt-7">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                            <ChatBubbleLeftRightIcon className="h-5 w-5 text-[#7ece8d]" aria-hidden />
                        </div>
                        <h1
                            id="ns-conecta-intro-title"
                            className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9ad4a3]"
                        >
                            NS Conecta
                        </h1>
                    </div>

                    <p className="mt-5 text-[13.5px] leading-relaxed text-emerald-50/75">
                        Seu canal direto com a igreja — departamentos, líderes e voluntários, no ritmo de uma
                        conversa.
                    </p>

                    <ul className="mt-5 space-y-2.5">
                        {[
                            'Escolha com quem falar e envie a mensagem.',
                            'As respostas ficam na mesma conversa.',
                        ].map((line) => (
                            <li key={line} className="flex items-start gap-2.5">
                                <span
                                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#41b144]"
                                    aria-hidden
                                />
                                <span className="text-[13px] leading-snug text-emerald-50/80">{line}</span>
                            </li>
                        ))}
                    </ul>

                    <button
                        type="button"
                        onClick={dismiss}
                        className="mt-6 inline-flex w-full cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-[13px] font-medium text-white/90 transition hover:bg-white/15 hover:text-white active:scale-[0.98]"
                    >
                        Continuar
                    </button>
                </div>
            </div>
        </div>
    );
}
