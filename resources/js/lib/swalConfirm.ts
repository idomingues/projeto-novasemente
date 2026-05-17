import Swal from 'sweetalert2';

export type SwalConfirmOptions = {
    title?: string;
    text: string;
    icon?: 'question' | 'warning' | 'info' | 'error' | 'success';
    confirmButtonText?: string;
    cancelButtonText?: string;
};

/**
 * Diálogo de confirmação (substitui window.confirm). Retorna true se o usuário confirmou.
 */
export async function swalConfirm(opts: SwalConfirmOptions): Promise<boolean> {
    const result = await Swal.fire({
        title: opts.title ?? 'Confirmação',
        text: opts.text,
        icon: opts.icon ?? 'question',
        showCancelButton: true,
        confirmButtonColor: '#18181b',
        cancelButtonColor: '#71717a',
        confirmButtonText: opts.confirmButtonText ?? 'OK',
        cancelButtonText: opts.cancelButtonText ?? 'Cancelar',
        reverseButtons: true,
        focusCancel: true,
    });

    return result.isConfirmed;
}
