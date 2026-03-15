import { PlusIcon } from '@heroicons/react/24/outline';
import PrimaryButton from '@/Components/PrimaryButton';

interface AddButtonProps {
    onClick: () => void;
    children: React.ReactNode;
    className?: string;
}

/** Mobile: apenas o botão +. PC: apenas o botão com texto (ex.: "+ Adicionar link"). */
export default function AddButton({ onClick, children, className = '' }: AddButtonProps) {
    return (
        <>
            {/* PC: botão completo com texto */}
            <PrimaryButton
                type="button"
                onClick={onClick}
                className={`hidden md:inline-flex gap-2 flex-shrink-0 ${className}`}
            >
                <PlusIcon className="w-5 h-5" />
                {children}
            </PrimaryButton>
            {/* Mobile: só o + */}
            <button
                type="button"
                onClick={onClick}
                aria-label={typeof children === 'string' ? children : 'Adicionar'}
                className={`md:hidden flex w-12 h-12 rounded-full bg-zinc-900 dark:bg-zinc-900 text-white items-center justify-center shadow-lg hover:bg-zinc-800 dark:hover:bg-zinc-800 active:scale-95 transition-all flex-shrink-0 ${className}`}
            >
                <PlusIcon className="w-6 h-6" strokeWidth={2.5} />
            </button>
        </>
    );
}
