import { ImgHTMLAttributes } from 'react';
import { usePage } from '@inertiajs/react';

type ApplicationLogoProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
    src?: string | null;
};

export default function ApplicationLogo({ src, className = '', ...props }: ApplicationLogoProps) {
    const defaultBrandLogoUrl = (usePage().props as { defaultBrandLogoUrl?: string }).defaultBrandLogoUrl;
    const resolvedSrc = src || defaultBrandLogoUrl || '/logo-ns.png';

    return (
        <img
            src={resolvedSrc}
            alt="Nova Semente"
            className={`rounded-full ${className}`.trim()}
            {...props}
        />
    );
}
