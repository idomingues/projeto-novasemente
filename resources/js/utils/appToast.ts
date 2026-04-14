import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

function isDarkMode(): boolean {
    return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
}

/** Toast curto (SweetAlert2), alinhado ao tema claro/escuro. */
export function appToast(title: string, icon: 'success' | 'error' | 'info' = 'success'): void {
    const dark = isDarkMode();
    void Swal.fire({
        toast: true,
        position: 'bottom',
        icon,
        title,
        showConfirmButton: false,
        timer: icon === 'error' ? 4200 : 2600,
        timerProgressBar: true,
        background: dark ? '#18181b' : '#ffffff',
        color: dark ? '#fafafa' : '#18181b',
    });
}
