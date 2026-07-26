import { Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/20/solid';
import { InertiaLinkProps, Link, router } from '@inertiajs/react';
import {
    createContext,
    CSSProperties,
    Dispatch,
    PropsWithChildren,
    RefObject,
    SetStateAction,
    useContext,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';
import { createPortal } from 'react-dom';

const DropDownContext = createContext<{
    open: boolean;
    setOpen: Dispatch<SetStateAction<boolean>>;
    toggleOpen: () => void;
    rootRef: RefObject<HTMLDivElement | null>;
}>({
    open: false,
    setOpen: () => {},
    toggleOpen: () => {},
    rootRef: { current: null },
});

const Dropdown = ({ children }: PropsWithChildren) => {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        return router.on('start', () => setOpen(false));
    }, []);

    const toggleOpen = () => {
        setOpen((previousState) => !previousState);
    };

    return (
        <DropDownContext.Provider value={{ open, setOpen, toggleOpen, rootRef }}>
            <div className="relative" ref={rootRef}>
                {children}
            </div>
        </DropDownContext.Provider>
    );
};

const Trigger = ({ children }: PropsWithChildren) => {
    const { open, setOpen, toggleOpen } = useContext(DropDownContext);

    const backdrop =
        open && typeof document !== 'undefined'
            ? createPortal(
                  <div
                      className="fixed inset-0 z-[55] bg-black/20 dark:bg-black/40"
                      onClick={() => setOpen(false)}
                      data-dropdown-backdrop="true"
                      aria-hidden
                  />,
                  document.body,
              )
            : null;

    return (
        <>
            <div onClick={toggleOpen}>{children}</div>
            {backdrop}
        </>
    );
};

function dropdownWidthPx(width: '48' | '80' | '96'): number {
    if (width === '96') {
        return 384;
    }
    if (width === '80') {
        return 320;
    }
    return 192;
}

const Content = ({
    align = 'right',
    width = '48',
    contentClasses = 'py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300',
    /** Ancora ao viewport (evita painel a sair da tela quando o gatilho é estreito, ex.: sino no mobile). */
    viewport = false,
    /**
     * Renderiza o menu no `document.body` com posição fixa (evita corte por overflow
     * em tabelas / painéis com scroll — ex.: lista com um único item).
     */
    portal = false,
    children,
}: PropsWithChildren<{
    align?: 'left' | 'right';
    width?: '48' | '80' | '96';
    contentClasses?: string;
    viewport?: boolean;
    portal?: boolean;
}>) => {
    const { open, rootRef } = useContext(DropDownContext);
    const panelRef = useRef<HTMLDivElement>(null);
    const [portalStyle, setPortalStyle] = useState<CSSProperties | null>(null);

    useLayoutEffect(() => {
        if (!open || !portal || viewport) {
            setPortalStyle(null);
            return;
        }

        const update = () => {
            const anchor = rootRef.current;
            if (!anchor) {
                return;
            }

            const rect = anchor.getBoundingClientRect();
            const gap = 8;
            const panelWidth = dropdownWidthPx(width);
            const panelHeight = panelRef.current?.offsetHeight ?? 48;
            const spaceBelow = window.innerHeight - rect.bottom - gap;
            const spaceAbove = rect.top - gap;
            const openUp = spaceBelow < panelHeight && spaceAbove > spaceBelow;

            let top = openUp ? rect.top - gap - panelHeight : rect.bottom + gap;
            top = Math.max(8, Math.min(top, window.innerHeight - panelHeight - 8));

            let left = align === 'right' ? rect.right - panelWidth : rect.left;
            left = Math.max(8, Math.min(left, window.innerWidth - panelWidth - 8));

            setPortalStyle({
                position: 'fixed',
                top,
                left,
                width: panelWidth,
                zIndex: 70,
            });
        };

        update();
        const frame = requestAnimationFrame(update);
        window.addEventListener('resize', update);
        window.addEventListener('scroll', update, true);

        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('resize', update);
            window.removeEventListener('scroll', update, true);
        };
    }, [open, portal, viewport, align, width, rootRef]);

    let alignmentClasses = 'origin-top';

    if (!viewport && !portal) {
        if (align === 'left') {
            alignmentClasses = 'ltr:origin-top-left rtl:origin-top-right start-0';
        } else if (align === 'right') {
            alignmentClasses = 'ltr:origin-top-right rtl:origin-top-left end-0';
        }
    }

    const widthClasses = width === '96' ? 'w-96' : width === '80' ? 'w-80' : 'w-48';

    const positionClasses = viewport
        ? 'fixed z-[70] left-3 right-3 top-[4.25rem] w-auto max-w-none md:left-auto md:right-6 md:top-[6.75rem] md:w-[min(26rem,calc(100vw-3rem))]'
        : portal
          ? 'z-[70]'
          : `absolute z-[70] mt-2 ${alignmentClasses} ${widthClasses}`;

    const panel = (
        <Transition
            show={open}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
        >
            <div
                ref={panelRef}
                className={`rounded-xl shadow-lg ${positionClasses}`}
                style={portal ? (portalStyle ?? { position: 'fixed', visibility: 'hidden', zIndex: 70 }) : undefined}
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    className={
                        `rounded-xl ring-1 ring-zinc-900/5 dark:ring-white/10 overflow-hidden ` + contentClasses
                    }
                >
                    {children}
                </div>
            </div>
        </Transition>
    );

    // Viewport e portal precisam ir ao body: o backdrop do Trigger também é portal
    // (z-55). Se o painel ficar no header (z-40), cliques/scroll caem no backdrop.
    if ((portal || viewport) && typeof document !== 'undefined') {
        return createPortal(panel, document.body);
    }

    return <>{panel}</>;
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
                'flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white ' +
                className
            }
            aria-label="Fechar"
        >
            <XMarkIcon className="h-5 w-5" />
        </button>
    );
};

const DropdownLink = ({ className = '', children, ...props }: InertiaLinkProps) => {
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
