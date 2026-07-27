import { confirmAction, type ConfirmDialogOptions } from '@/utils/confirmDialog';

export type SwalConfirmOptions = {
    title?: string;
    text: string;
    icon?: 'question' | 'warning' | 'info' | 'error' | 'success';
    confirmButtonText?: string;
    cancelButtonText?: string;
};

/**
 * @deprecated Preferir `confirmAction` de `@/utils/confirmDialog`.
 * Mantido como alias para o padrão visual único do sistema.
 */
export async function swalConfirm(opts: SwalConfirmOptions): Promise<boolean> {
    const options: ConfirmDialogOptions = {
        title: opts.title ?? 'Confirmação',
        text: opts.text,
        icon: opts.icon ?? 'question',
        confirmButtonText: opts.confirmButtonText ?? 'OK',
        cancelButtonText: opts.cancelButtonText ?? 'Cancelar',
    };

    return confirmAction(options);
}
