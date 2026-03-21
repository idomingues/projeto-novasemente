import { HandRaisedIcon } from '@heroicons/react/24/solid';

/** Duas mãos erguidas — gesto de oração / “amém”. */
export default function PrayingHandsIcon({ className = 'h-6 w-6' }: { className?: string }) {
    return (
        <span className={`inline-flex items-center justify-center ${className}`} aria-hidden>
            <HandRaisedIcon className="h-[1em] w-[1em] -rotate-12 text-current" />
            <HandRaisedIcon className="h-[1em] w-[1em] rotate-12 scale-x-[-1] text-current -ml-1.5" />
        </span>
    );
}
