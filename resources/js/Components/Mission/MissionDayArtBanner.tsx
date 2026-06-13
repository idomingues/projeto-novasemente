import { MISSION_DAY_ALT, MISSION_DAY_ART } from '@/constants/missionDayArt';

type Layout = 'default' | 'card' | 'modal';

type Props = {
    className?: string;
    layout?: Layout;
};

const imgBase = 'block h-auto w-full select-none';

export default function MissionDayArtBanner({ className = '', layout = 'default' }: Props) {
    const isModal = layout === 'modal';
    const isCard = layout === 'card';

    if (isCard) {
        return (
            <figure className={`overflow-hidden ${className}`}>
                <img
                    src={MISSION_DAY_ART.stories}
                    alt={MISSION_DAY_ALT}
                    className="block aspect-[16/10] w-full object-cover object-[center_35%] lg:hidden"
                    loading="lazy"
                    decoding="async"
                />
                <img
                    src={MISSION_DAY_ART.total}
                    alt={MISSION_DAY_ALT}
                    className="hidden aspect-[21/9] w-full object-cover object-center lg:block"
                    loading="lazy"
                    decoding="async"
                />
            </figure>
        );
    }

    return (
        <figure
            className={`overflow-hidden ${isModal ? 'rounded-none' : 'rounded-2xl shadow-md ring-1 ring-amber-900/10 dark:ring-amber-500/20'} ${className}`}
        >
            {/* Mobile: formato stories (9:16) */}
            <img
                src={MISSION_DAY_ART.stories}
                alt={MISSION_DAY_ALT}
                className={`${imgBase} max-lg:block lg:hidden`}
                loading={isModal ? 'eager' : 'lazy'}
                decoding="async"
            />

            {/* Desktop: banner panorâmico completo */}
            <img
                src={MISSION_DAY_ART.total}
                alt={MISSION_DAY_ALT}
                className={`${imgBase} hidden lg:block 2xl:hidden`}
                loading="lazy"
                decoding="async"
            />

            {/* Telas muito largas: composição esquerda + central + direita */}
            <div
                className="hidden w-full 2xl:flex"
                role="img"
                aria-label={MISSION_DAY_ALT}
            >
                <img
                    src={MISSION_DAY_ART.left}
                    alt=""
                    aria-hidden
                    className="block h-auto w-[18.75%] shrink-0 object-cover object-right"
                    loading="lazy"
                    decoding="async"
                />
                <img
                    src={MISSION_DAY_ART.central}
                    alt=""
                    aria-hidden
                    className="block h-auto w-[62.2%] shrink-0 object-cover"
                    loading="lazy"
                    decoding="async"
                />
                <img
                    src={MISSION_DAY_ART.right}
                    alt=""
                    aria-hidden
                    className="block h-auto w-[19.05%] shrink-0 object-cover object-left"
                    loading="lazy"
                    decoding="async"
                />
            </div>
        </figure>
    );
}
