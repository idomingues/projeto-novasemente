import { useLayoutEffect, useState } from 'react';

/** Corresponde ao breakpoint `md` do Tailwind (768px). */
export function useMinWidthMd(): boolean {
    const [matches, setMatches] = useState(false);

    useLayoutEffect(() => {
        const mq = window.matchMedia('(min-width: 768px)');
        setMatches(mq.matches);
        const onChange = () => setMatches(mq.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    return matches;
}
