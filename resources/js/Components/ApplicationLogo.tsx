import { ImgHTMLAttributes } from 'react';

export default function ApplicationLogo({ className = '', ...props }: ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <img
            src="/logo-ns.png"
            alt="Nova Semente"
            className={className}
            {...props}
        />
    );
}
