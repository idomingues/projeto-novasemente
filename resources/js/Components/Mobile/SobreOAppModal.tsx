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
        <Modal show={show} onClose={onClose} maxWidth="md">
            <div className="px-5 pt-6 pb-2 sm:px-7 sm:pt-7">
                <h2 className="pr-10 text-lg font-bold leading-tight tracking-tight text-zinc-900 dark:text-white">Sobre o APP</h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Informações técnicas do app e links oficiais.</p>
            </div>
            <div className="px-5 pb-6 sm:px-7">
                <SobreOAppPanel />
            </div>
        </Modal>
    );
}
