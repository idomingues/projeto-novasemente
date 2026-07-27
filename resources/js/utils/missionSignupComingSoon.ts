import { showAppAlert } from '@/utils/confirmDialog';

export const MISSION_SIGNUP_COMING_SOON_MESSAGE =
    'Estaremos liberando o cadastro de inscrição em algumas horas.';

export async function showMissionSignupComingSoon(): Promise<void> {
    await showAppAlert({
        title: 'Inscrições em breve',
        text: MISSION_SIGNUP_COMING_SOON_MESSAGE,
        icon: 'info',
        confirmButtonText: 'Entendi',
    });
}
