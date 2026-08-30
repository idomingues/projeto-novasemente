import { PlusIcon } from '@heroicons/react/24/outline';
import PrimaryButton from '@/Components/PrimaryButton';

const titleBarAddBaseClass =
    'inline-flex h-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-zinc-900 text-white shadow-md ring-1 ring-inset ring-white/10 transition hover:bg-zinc-800 active:scale-95 dark:bg-zinc-100 dark:text-zinc-900 dark:ring-black/10 dark:hover:bg-white disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-40';

/** Classes do botão + ao lado do título (reutilizável em `<Link>` quando não for `button`). */
export const titleBarAddIconClass = `${titleBarAddBaseClass} w-11`;

/** Pílula compacta com ícone + texto, mesma linguagem visual do + redondo. */
export const titleBarAddLabelClass = `${titleBarAddBaseClass} gap-1.5 whitespace-nowrap px-3.5 text-sm font-semibold`;

interface AddButtonProps {
    onClick: () => void;
    children: React.ReactNode;
    className?: string;
    disabled?: boolean;
    title?: string;
    /** `icon`: só o + redondo. `label`: + e texto em todos os tamanhos. `default`: texto no desktop e + no mobile. */
    variant?: 'default' | 'icon' | 'label';
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

    if (variant === 'label') {
        return (
            <button
                type="button"
                onClick={onClick}
                disabled={disabled}
                title={title}
                className={`${titleBarAddLabelClass} ${className}`}
            >
                <PlusIcon className="h-5 w-5" strokeWidth={2.25} />
                {children}
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
