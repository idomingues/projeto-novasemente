import { ImgHTMLAttributes } from 'react';

interface ApplicationLogoProps extends ImgHTMLAttributes<HTMLImageElement> {
    src?: string | null;
}

export default function ApplicationLogo({ src, className = '', ...props }: ApplicationLogoProps) {
    return (
        <img
            src={src || '/logo-ns.png'}
            alt="Nova Semente"
            className={`rounded-full ${className}`.trim()}
            {...props}
        />
    );
}
