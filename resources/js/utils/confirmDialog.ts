import Swal, { type SweetAlertIcon, type SweetAlertOptions, type SweetAlertResult } from 'sweetalert2';
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

export type AppAlertOptions = {
    title: string;
    text?: string;
    html?: string;
    confirmButtonText?: string;
    icon?: 'warning' | 'question' | 'info' | 'error' | 'success';
};

export type EncaminharOnLinkChoice = 'encaminhar' | 'vincular' | 'cancel';

function isDarkMode(): boolean {
    return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
}

const ICON_COLORS: Record<SweetAlertIcon, { border: string; color: string }> = {
    question: { border: '#41b144', color: '#008d36' },
    info: { border: '#2dd4bf', color: '#0f766e' },
    success: { border: '#41b144', color: '#008d36' },
    warning: { border: '#f59e0b', color: '#b45309' },
    error: { border: '#f87171', color: '#dc2626' },
};

/**
 * Opções visuais compartilhadas: popup compacto, premium, claro/escuro.
 * Use via `confirmAction` / `showAppAlert` — não chamar `Swal.fire` solto.
 */
export function appSwalBaseOptions(icon: SweetAlertIcon = 'question'): Pick<
    SweetAlertOptions,
    | 'background'
    | 'color'
    | 'iconColor'
    | 'buttonsStyling'
    | 'heightAuto'
    | 'width'
    | 'padding'
    | 'customClass'
> {
    const dark = isDarkMode();
    const iconTone = ICON_COLORS[icon] ?? ICON_COLORS.question;

    return {
        background: dark ? '#18181b' : '#ffffff',
        color: dark ? '#fafafa' : '#18181b',
        iconColor: dark && (icon === 'question' || icon === 'success') ? '#41b144' : iconTone.color,
        buttonsStyling: true,
        heightAuto: false,
        width: 'min(92vw, 22rem)',
        padding: '1.15rem 1.15rem 1rem',
        customClass: {
            popup: 'swal-app-popup',
            icon: 'swal-app-icon',
            title: 'swal-app-title',
            htmlContainer: 'swal-app-html',
            actions: 'swal-app-actions',
            confirmButton: 'swal-app-btn swal-app-btn-confirm',
            cancelButton: 'swal-app-btn swal-app-btn-cancel',
            denyButton: 'swal-app-btn swal-app-btn-deny',
        },
    };
}

function confirmButtonColor(danger: boolean): string {
    if (danger) {
        return '#dc2626';
    }

    return isDarkMode() ? '#008d36' : '#18181b';
}

function cancelButtonColor(): string {
    return isDarkMode() ? '#3f3f46' : '#e4e4e7';
}

function denyButtonColor(): string {
    return isDarkMode() ? '#52525b' : '#a1a1aa';
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

    const result = await Swal.fire({
        ...appSwalBaseOptions(icon),
        title,
        text,
        html,
        icon,
        showCancelButton: true,
        focusCancel: true,
        reverseButtons: true,
        confirmButtonText,
        cancelButtonText,
        confirmButtonColor: confirmButtonColor(danger),
        cancelButtonColor: cancelButtonColor(),
    });

    return result.isConfirmed;
}

/**
 * Alerta informativo (um botão) — sucesso, erro, aviso ou info.
 * Use em vez de `Swal.fire` / `alert()` soltos.
 */
export async function showAppAlert(options: AppAlertOptions): Promise<SweetAlertResult> {
    const { title, text, html, confirmButtonText = 'Entendi', icon = 'info' } = options;

    return Swal.fire({
        ...appSwalBaseOptions(icon),
        title,
        text,
        html,
        icon,
        showCancelButton: false,
        confirmButtonText,
        confirmButtonColor: confirmButtonColor(icon === 'error'),
    });
}

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

    const result = await Swal.fire({
        ...appSwalBaseOptions('question'),
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
        confirmButtonColor: confirmButtonColor(false),
        denyButtonColor: denyButtonColor(),
        cancelButtonColor: cancelButtonColor(),
    });

    if (result.isConfirmed) {
        return 'encaminhar';
    }
    if (result.isDenied) {
        return 'vincular';
    }

    return 'cancel';
}
