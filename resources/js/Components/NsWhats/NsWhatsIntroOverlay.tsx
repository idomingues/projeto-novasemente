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
            className="absolute inset-0 z-40 flex flex-col overflow-y-auto overscroll-contain bg-[#0b1f14] text-white"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ns-conecta-intro-title"
        >
            <div
                className="pointer-events-none absolute inset-0 opacity-90"
                style={{
                    background:
                        'radial-gradient(120% 80% at 10% -10%, rgba(65,177,68,0.35), transparent 55%), radial-gradient(90% 70% at 100% 20%, rgba(0,141,54,0.45), transparent 50%), linear-gradient(180deg, #0b1f14 0%, #06140d 55%, #030a07 100%)',
                }}
                aria-hidden
            />
            <div
                className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-10"
                style={{
                    backgroundImage:
                        'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.55) 1px, transparent 0)',
                    backgroundSize: '18px 18px',
                }}
                aria-hidden
            />

            <div
                className="relative z-10 mx-auto flex min-h-full w-full max-w-lg flex-col px-6 sm:px-8"
                style={{
                    paddingTop: 'calc(1.75rem + env(safe-area-inset-top, 0px))',
                    paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
                }}
            >
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur-sm">
                        <ChatBubbleLeftRightIcon className="h-6 w-6 text-[#7ece8d]" aria-hidden />
                    </div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9ad4a3]">
                        Nova Semente
                    </p>
                </div>

                <div className="mt-10 flex flex-1 flex-col justify-center">
                    <h1
                        id="ns-conecta-intro-title"
                        className="text-[2.15rem] font-semibold leading-tight tracking-tight text-white sm:text-[2.5rem]"
                    >
                        NS Conecta
                    </h1>
                    <p className="mt-4 max-w-md text-[15px] leading-relaxed text-emerald-50/80 sm:text-base">
                        Seu canal direto com a igreja. Fale com departamentos, líderes e voluntários
                        com histórico salvo na sua conta, no ritmo de uma conversa.
                    </p>

                    <ul className="mt-9 space-y-4">
                        {[
                            {
                                title: 'Comece uma conversa',
                                body: 'Escolha um departamento, líder ou voluntário e envie a primeira mensagem.',
                            },
                            {
                                title: 'Acompanhe as respostas',
                                body: 'Tudo fica no mesmo fio: você e a equipe conversam com clareza.',
                            },
                            {
                                title: 'Organize o que importa',
                                body: 'Arquive conversas quando quiser e volte a elas quando precisar.',
                            },
                        ].map((item) => (
                            <li key={item.title} className="flex gap-3">
                                <span
                                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#41b144]"
                                    aria-hidden
                                />
                                <div className="min-w-0">
                                    <p className="text-[14px] font-semibold text-white">{item.title}</p>
                                    <p className="mt-0.5 text-[13px] leading-relaxed text-emerald-50/65">
                                        {item.body}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="mt-10 shrink-0">
                    <button
                        type="button"
                        onClick={dismiss}
                        className="inline-flex w-full cursor-pointer items-center justify-center rounded-full bg-white px-5 py-3.5 text-[14px] font-semibold text-zinc-900 shadow-lg shadow-black/25 transition hover:bg-emerald-50 active:scale-[0.98]"
                    >
                        Não mostrar mais esta tela
                    </button>
                    <p className="mt-3 text-center text-[11px] leading-relaxed text-emerald-50/45">
                        Você pode usar o NS Conecta a qualquer momento pelo menu do app.
                    </p>
                </div>
            </div>
        </div>
    );
}
