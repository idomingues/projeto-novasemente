import VolunteerAppInviteButton, {
    volunteerEncaminharButtonClass,
} from '@/Components/Volunteers/VolunteerAppInviteButton';
import { ArrowRightCircleIcon } from '@heroicons/react/24/outline';

type Props = {
    canEncaminhar: boolean;
    canInviteApp: boolean;
    invitingApp?: boolean;
    onEncaminhar: () => void;
    onInviteApp: () => void;
    /** Quando true, Encaminhar fica fora (ao lado de Salvar fase). */
    hideEncaminhar?: boolean;
};

/**
 * Ações da ficha alinhadas à lista. Encaminhar pode ir ao lado de «Salvar fase».
 */
export default function VolunteerDetailModalActions({
    canEncaminhar,
    canInviteApp,
    invitingApp = false,
    onEncaminhar,
    onInviteApp,
    hideEncaminhar = false,
}: Props) {
    const showEncaminhar = canEncaminhar && !hideEncaminhar;
    if (!showEncaminhar && !canInviteApp) {
        return null;
    }

    return (
        <div className="flex flex-wrap items-center gap-2">
            {canInviteApp ? (
                <VolunteerAppInviteButton disabled={invitingApp} onClick={onInviteApp} />
            ) : null}
            {showEncaminhar ? (
                <button
                    type="button"
                    onClick={onEncaminhar}
                    className={volunteerEncaminharButtonClass}
                    title="Escolher departamentos para encaminhar este voluntário"
                >
                    <ArrowRightCircleIcon className="h-4 w-4 shrink-0" aria-hidden />
                    Encaminhar
                </button>
            ) : null}
        </div>
    );
}
