import { Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/20/solid';
import { InertiaLinkProps, Link, router } from '@inertiajs/react';
import {
    createContext,
    Dispatch,
    PropsWithChildren,
    SetStateAction,
    useContext,
    useEffect,
    useState,
} from 'react';

const DropDownContext = createContext<{
    open: boolean;
    setOpen: Dispatch<SetStateAction<boolean>>;
    toggleOpen: () => void;
}>({
    open: false,
    setOpen: () => {},
    toggleOpen: () => {},
});

const Dropdown = ({ children }: PropsWithChildren) => {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        return router.on('start', () => setOpen(false));
    }, []);

    const toggleOpen = () => {
        setOpen((previousState) => !previousState);
    };

    return (
        <DropDownContext.Provider value={{ open, setOpen, toggleOpen }}>
            <div className="relative">{children}</div>
        </DropDownContext.Provider>
    );
};

const Trigger = ({ children }: PropsWithChildren) => {
    const { open, setOpen, toggleOpen } = useContext(DropDownContext);

    return (
        <>
            <div onClick={toggleOpen}>{children}</div>

            {open && (
                <div
                    className="fixed inset-0 z-[55] bg-black/20 dark:bg-black/40"
                    onClick={() => setOpen(false)}
                    aria-hidden
                />
            )}
        </>
    );
};

const Content = ({
    align = 'right',
    width = '48',
    contentClasses = 'py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300',
    /** Ancora ao viewport (evita painel a sair da tela quando o gatilho é estreito, ex.: sino no mobile). */
    viewport = false,
    children,
}: PropsWithChildren<{
    align?: 'left' | 'right';
    width?: '48' | '80' | '96';
    contentClasses?: string;
    viewport?: boolean;
}>) => {
    const { open } = useContext(DropDownContext);

    let alignmentClasses = 'origin-top';

    if (! viewport) {
        if (align === 'left') {
            alignmentClasses = 'ltr:origin-top-left rtl:origin-top-right start-0';
        } else if (align === 'right') {
            alignmentClasses = 'ltr:origin-top-right rtl:origin-top-left end-0';
        }
    }

    const widthClasses = width === '96' ? 'w-96' : width === '80' ? 'w-80' : 'w-48';

    const positionClasses = viewport
        ? 'fixed z-[70] left-3 right-3 top-[4.25rem] w-auto max-w-none md:left-auto md:right-6 md:top-[6.75rem] md:w-[min(24rem,calc(100vw-3rem))]'
        : `absolute z-[70] mt-2 ${alignmentClasses} ${widthClasses}`;

    return (
        <>
            <Transition
                show={open}
                enter="transition ease-out duration-200"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
            >
                <div className={`rounded-xl shadow-lg ${positionClasses}`}>
                    <div
                        className={
                            `rounded-xl ring-1 ring-black ring-opacity-5 overflow-hidden ` +
                            contentClasses
                        }
                    >
                        {children}
                    </div>
                </div>
            </Transition>
        </>
    );
};

const CloseButton = ({ className = '' }: { className?: string }) => {
    const { setOpen } = useContext(DropDownContext);

    return (
        <button
            type="button"
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
            }}
            className={
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white ' +
                className
            }
            aria-label="Fechar"
        >
            <XMarkIcon className="h-5 w-5" />
        </button>
    );
};

const DropdownLink = ({
    className = '',
    children,
    ...props
}: InertiaLinkProps) => {
    return (
        <Link
            {...props}
            className={
                'block w-full px-4 py-2 text-start text-sm leading-5 text-zinc-700 dark:text-zinc-300 transition duration-150 ease-in-out hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white focus:bg-zinc-100 dark:focus:bg-zinc-800 focus:outline-none ' +
                className
            }
        >
            {children}
        </Link>
    );
};

Dropdown.Trigger = Trigger;
Dropdown.Content = Content;
Dropdown.Link = DropdownLink;
Dropdown.CloseButton = CloseButton;

export default Dropdown;
