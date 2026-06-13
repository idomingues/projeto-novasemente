import { showMissionSignupComingSoon } from '@/utils/missionSignupComingSoon';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import PrimaryButton from '@/Components/PrimaryButton';

type Props = {
    variant?: 'hero' | 'primary';
    className?: string;
    fullWidth?: boolean;
};

export default function MissionParticipateButton({
    variant = 'primary',
    className = '',
    fullWidth = false,
}: Props) {
    const onClick = () => {
        void showMissionSignupComingSoon();
    };

    if (variant === 'hero') {
        return (
            <button
                type="button"
                onClick={onClick}
                className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-amber-950 shadow-md shadow-amber-950/30 transition hover:bg-amber-300 sm:w-auto ${
                    fullWidth ? 'w-full' : ''
                } ${className}`}
            >
                Quero participar
                <ArrowRightIcon className="h-4 w-4" aria-hidden />
            </button>
        );
    }

    return (
        <PrimaryButton
            type="button"
            onClick={onClick}
            className={`${fullWidth ? 'w-full ' : ''}${className}`}
        >
            Quero participar
        </PrimaryButton>
    );
}
