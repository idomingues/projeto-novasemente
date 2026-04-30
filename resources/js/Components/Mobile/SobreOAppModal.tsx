import Modal from '@/Components/Modal';
import SobreOAppPanel from '@/Components/Mobile/SobreOAppPanel';

export default function SobreOAppModal({
    show,
    onClose,
}: {
    show: boolean;
    onClose: () => void;
}) {
    return (
        <Modal
            show={show}
            onClose={onClose}
            maxWidth="md"
            footer={
                <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex w-full min-h-[48px] items-center justify-center rounded-full border border-zinc-900 bg-white px-6 text-xs font-semibold uppercase tracking-wide text-zinc-900 transition-colors active:scale-[0.99] dark:border-zinc-200 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 sm:min-h-0 sm:w-auto sm:py-3"
                >
                    Fechar
                </button>
            }
        >
            <div className="px-5 pt-6 pb-2 sm:px-7 sm:pt-7">
                <h2 className="text-lg font-bold leading-tight tracking-tight text-zinc-900 dark:text-white">Sobre o APP</h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Informações técnicas do app e links oficiais.</p>
            </div>
            <div className="px-5 pb-6 sm:px-7">
                <SobreOAppPanel />
            </div>
        </Modal>
    );
}
