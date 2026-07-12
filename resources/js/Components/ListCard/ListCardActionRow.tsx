import { ReactNode } from 'react';

type Props = {
    children: ReactNode;
    className?: string;
};

export default function ListCardActionRow({ children, className = '' }: Props) {
    return (
        <div
            className={`flex w-auto shrink-0 flex-wrap items-center justify-end gap-1 sm:gap-2 ${className}`.trim()}
        >
            {children}
        </div>
    );
}
