import { PlusIcon } from '@heroicons/react/24/outline';
import PrimaryButton from '@/Components/PrimaryButton';

interface AddButtonProps {
    onClick: () => void;
    children: React.ReactNode;
    className?: string;
}

/** Botão Adicionar: + redondo preto no mobile, completo no PC. */
export default function AddButton({ onClick, children, className = '' }: AddButtonProps) {
    return (
        <>
            <PrimaryButton
                type="button"
                onClick={onClick}
                className={`hidden md:inline-flex gap-2 ${className}`}
            >
                <PlusIcon className="w-5 h-5" />
                {children}
            </PrimaryButton>
            <button
                type="button"
                onClick={onClick}
                aria-label={typeof children === 'string' ? children : 'Adicionar'}
                className={`md:hidden w-12 h-12 rounded-full bg-zinc-900 dark:bg-zinc-900 text-white flex items-center justify-center shadow-lg hover:bg-zinc-800 dark:hover:bg-zinc-800 active:scale-95 transition-all ${className}`}
            >
                <PlusIcon className="w-6 h-6" strokeWidth={2.5} />
            </button>
        </>
    );
}
