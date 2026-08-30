import FlashMessages from '@/Components/FlashMessages';
import { PropsWithChildren } from 'react';

export default function Guest({
    children,
    fitViewport = false,
}: PropsWithChildren<{ fitViewport?: boolean }>) {
    return (
        <div
            className={`ns-app-shell fixed inset-0 z-0 overflow-x-clip overscroll-none bg-zinc-50 dark:bg-zinc-900 ${
                fitViewport
                    ? 'h-[100svh] max-h-[100svh] overflow-hidden md:h-[100dvh] md:max-h-[100dvh]'
                    : 'h-[100dvh] max-h-[100dvh] overflow-y-auto'
            }`}
        >
            <div
                className={`flex w-full flex-col ${
                    fitViewport ? 'h-full min-h-0 overflow-hidden' : 'min-h-full'
                }`}
                style={{ paddingTop: 'var(--ns-get-app-banner-offset, 0px)' }}
            >
                {children}
            </div>
            <FlashMessages />
        </div>
    );
}
