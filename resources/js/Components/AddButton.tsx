import { PlusIcon } from '@heroicons/react/24/outline';
import PrimaryButton from '@/Components/PrimaryButton';

/** Classes do botão + ao lado do título (reutilizável em `<Link>` quando não for `button`). */
export const titleBarAddIconClass =
    'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white shadow-md ring-1 ring-inset ring-white/10 transition hover:bg-zinc-800 active:scale-95 dark:bg-zinc-100 dark:text-zinc-900 dark:ring-black/10 dark:hover:bg-white disabled:pointer-events-none disabled:opacity-40';

interface AddButtonProps {
    onClick: () => void;
    children: React.ReactNode;
    className?: string;
    disabled?: boolean;
    title?: string;
    /** `icon`: só o + redondo (padrão ao lado do título). `default`: texto no desktop e + no mobile. */
    variant?: 'default' | 'icon';
}

export default function AddButton({
    onClick,
    children,
    className = '',
    disabled = false,
    title,
    variant = 'default',
}: AddButtonProps) {
    if (variant === 'icon') {
        return (
            <button
                type="button"
                onClick={onClick}
                disabled={disabled}
                title={title}
                aria-label={typeof children === 'string' ? children : title ?? 'Adicionar'}
                className={`${titleBarAddIconClass} ${className}`}
            >
                <PlusIcon className="h-6 w-6" strokeWidth={2.25} />
            </button>
        );
    }

    return (
        <>
            <div className="hidden md:block flex-shrink-0">
                <PrimaryButton
                    type="button"
                    onClick={onClick}
                    disabled={disabled}
                    title={title}
                    className={`gap-2 ${className}`}
                >
                    <PlusIcon className="w-5 h-5" />
                    {children}
                </PrimaryButton>
            </div>
            <button
                type="button"
                onClick={onClick}
                disabled={disabled}
                title={title}
                aria-label={typeof children === 'string' ? children : 'Adicionar'}
                className={`md:hidden ${titleBarAddIconClass} ${className}`}
            >
                <PlusIcon className="w-6 h-6" strokeWidth={2.5} />
            </button>
        </>
    );
}
