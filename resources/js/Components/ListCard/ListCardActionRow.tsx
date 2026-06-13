import { ReactNode } from 'react';

type Props = {
    children: ReactNode;
    className?: string;
};

export default function ListCardActionRow({ children, className = '' }: Props) {
    return (
        <div
            className={`flex w-full flex-wrap items-center gap-1 sm:w-auto sm:justify-end sm:gap-2 ${className}`.trim()}
        >
            {children}
        </div>
    );
}
