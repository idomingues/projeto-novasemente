import { PropsWithChildren } from 'react';

export default function Guest({ children }: PropsWithChildren) {
    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex">
            {children}
        </div>
    );
}
