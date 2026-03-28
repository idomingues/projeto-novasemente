import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

export type ConfirmDialogOptions = {
    title: string;
    text?: string;
    html?: string;
    confirmButtonText?: string;
    cancelButtonText?: string;
    icon?: 'warning' | 'question' | 'info' | 'error' | 'success';
    /** Ação destrutiva — botão principal em vermelho */
    danger?: boolean;
};

function isDarkMode(): boolean {
    return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
}

/**
 * Diálogo de confirmação (SweetAlert2), alinhado ao tema claro/escuro da app.
 * Use em vez de `window.confirm()` para todas as perguntas ao utilizador.
 */
export async function confirmAction(options: ConfirmDialogOptions): Promise<boolean> {
    const {
        title,
        text,
        html,
        confirmButtonText = 'Confirmar',
        cancelButtonText = 'Cancelar',
        icon = 'question',
        danger = false,
    } = options;

    const dark = isDarkMode();

    const result = await Swal.fire({
        title,
        text,
        html,
        icon,
        showCancelButton: true,
        focusCancel: true,
        reverseButtons: true,
        confirmButtonText,
        cancelButtonText,
        buttonsStyling: true,
        background: dark ? '#18181b' : '#ffffff',
        color: dark ? '#fafafa' : '#18181b',
        confirmButtonColor: danger ? '#dc2626' : '#18181b',
        cancelButtonColor: dark ? '#52525b' : '#d4d4d8',
        heightAuto: false,
        customClass: {
            popup: 'swal-app-popup',
            confirmButton: 'swal-app-btn',
            cancelButton: 'swal-app-btn',
        },
    });

    return result.isConfirmed;
}
