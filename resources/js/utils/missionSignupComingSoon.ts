import Swal from 'sweetalert2';

export const MISSION_SIGNUP_COMING_SOON_MESSAGE =
    'Estaremos liberando o cadastro de inscrição em algumas horas.';

function isDarkMode(): boolean {
    return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
}

export async function showMissionSignupComingSoon(): Promise<void> {
    const dark = isDarkMode();

    await Swal.fire({
        title: 'Inscrições em breve',
        text: MISSION_SIGNUP_COMING_SOON_MESSAGE,
        icon: 'info',
        confirmButtonText: 'Entendi',
        showCancelButton: false,
        buttonsStyling: true,
        background: dark ? '#18181b' : '#ffffff',
        color: dark ? '#fafafa' : '#18181b',
        confirmButtonColor: dark ? '#18181b' : '#18181b',
        heightAuto: false,
        customClass: {
            popup: 'swal-app-popup',
            confirmButton: 'swal-app-btn',
        },
    });
}
