import FlashMessages from '@/Components/FlashMessages';
import { PropsWithChildren } from 'react';

export default function Guest({ children }: PropsWithChildren) {
    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
            <div className="flex min-h-screen w-full flex-col">{children}</div>
            <FlashMessages />
        </div>
    );
}
