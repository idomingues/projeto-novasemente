import FlashMessages from '@/Components/FlashMessages';
import { PropsWithChildren } from 'react';

export default function Guest({ children }: PropsWithChildren) {
    return (
        <div className="ns-app-shell fixed inset-0 z-0 h-[100dvh] max-h-[100dvh] overflow-x-clip overflow-y-auto overscroll-none bg-zinc-50 dark:bg-zinc-900">
            <div
                className="flex min-h-full w-full flex-col"
                style={{ paddingTop: 'var(--ns-get-app-banner-offset, 0px)' }}
            >
                {children}
            </div>
            <FlashMessages />
        </div>
    );
}
