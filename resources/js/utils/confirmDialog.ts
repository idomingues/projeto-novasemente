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
 * Use em vez de `window.confirm()` para todas as perguntas ao usuário.
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

export type EncaminharOnLinkChoice = 'encaminhar' | 'vincular' | 'cancel';

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Ao vincular departamento(s) novos pelo check: pergunta se também registra encaminhamento
 * (mesmo processo do botão Encaminhar + histórico na ficha).
 */
export async function confirmEncaminharOnDepartmentLink(ministryNames: string[]): Promise<EncaminharOnLinkChoice> {
    const names = ministryNames.map((n) => escapeHtml(n)).join(', ');
    const dark = isDarkMode();

    const result = await Swal.fire({
        title: 'Encaminhar ao departamento?',
        html:
            `Você vinculou: <strong>${names}</strong>.<br><br>` +
            `O histórico na ficha será registrado em qualquer caso.<br>` +
            `Deseja também registrar o <strong>encaminhamento</strong> (igual ao botão Encaminhar) e mover a fase para Encaminhado?`,
        icon: 'question',
        showDenyButton: true,
        showCancelButton: true,
        focusCancel: true,
        reverseButtons: true,
        confirmButtonText: 'Sim, encaminhar',
        denyButtonText: 'Não, só vincular',
        cancelButtonText: 'Cancelar',
        buttonsStyling: true,
        background: dark ? '#18181b' : '#ffffff',
        color: dark ? '#fafafa' : '#18181b',
        confirmButtonColor: '#18181b',
        denyButtonColor: dark ? '#3f3f46' : '#a1a1aa',
        cancelButtonColor: dark ? '#52525b' : '#d4d4d8',
        heightAuto: false,
        customClass: {
            popup: 'swal-app-popup',
            confirmButton: 'swal-app-btn',
            denyButton: 'swal-app-btn',
            cancelButton: 'swal-app-btn',
        },
    });

    if (result.isConfirmed) {
        return 'encaminhar';
    }
    if (result.isDenied) {
        return 'vincular';
    }

    return 'cancel';
}
