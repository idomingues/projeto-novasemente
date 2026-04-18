import { PlusIcon } from '@heroicons/react/24/outline';
import PrimaryButton from '@/Components/PrimaryButton';

interface AddButtonProps {
    onClick: () => void;
    children: React.ReactNode;
    className?: string;
    disabled?: boolean;
    title?: string;
}

/** Mobile: apenas o botão +. PC: apenas o botão com texto (ex.: "+ Adicionar link"). */
export default function AddButton({ onClick, children, className = '', disabled = false, title }: AddButtonProps) {
    return (
        <>
            {/* PC: botão completo (wrapper esconde no mobile para o PrimaryButton não sobrescrever hidden) */}
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
            {/* Mobile: só o + */}
            <button
                type="button"
                onClick={onClick}
                disabled={disabled}
                title={title}
                aria-label={typeof children === 'string' ? children : 'Adicionar'}
                className={`md:hidden flex w-12 h-12 rounded-full bg-zinc-900 dark:bg-zinc-900 text-white items-center justify-center shadow-lg hover:bg-zinc-800 dark:hover:bg-zinc-800 active:scale-95 transition-all flex-shrink-0 disabled:pointer-events-none disabled:opacity-40 ${className}`}
            >
                <PlusIcon className="w-6 h-6" strokeWidth={2.5} />
            </button>
        </>
    );
}
