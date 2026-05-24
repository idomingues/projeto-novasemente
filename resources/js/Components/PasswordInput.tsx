import TextInput from '@/Components/TextInput';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { forwardRef, InputHTMLAttributes, useState } from 'react';

type PasswordInputProps = InputHTMLAttributes<HTMLInputElement> & {
    isFocused?: boolean;
};

export default forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
    { className = '', ...props },
    ref,
) {
    const [visible, setVisible] = useState(false);

    return (
        <div className="relative">
            <TextInput
                {...props}
                ref={ref}
                type={visible ? 'text' : 'password'}
                className={`pr-11 ${className}`.trim()}
            />
            <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-zinc-500 transition hover:text-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 dark:text-zinc-400 dark:hover:text-zinc-200 dark:focus-visible:ring-white/20"
                aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={visible}
            >
                {visible ? (
                    <EyeSlashIcon className="h-5 w-5 shrink-0" aria-hidden />
                ) : (
                    <EyeIcon className="h-5 w-5 shrink-0" aria-hidden />
                )}
            </button>
        </div>
    );
});
