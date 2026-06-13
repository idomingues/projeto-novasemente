import QRCode from 'react-qr-code';

type Props = {
    value: string;
    className?: string;
};

function toAbsoluteUrl(value: string): string {
    if (/^https?:\/\//i.test(value)) {
        return value;
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const path = value.startsWith('/') ? value : `/${value}`;

    return `${origin}${path}`;
}

export default function MissionSignupQrCode({ value, className = '' }: Props) {
    const qrValue = toAbsoluteUrl(value);

    return (
        <div className={`flex flex-col items-center gap-2 ${className}`}>
            <div
                className="rounded-xl border border-white/20 bg-white p-2 shadow-sm"
                aria-hidden
            >
                <QRCode
                    value={qrValue}
                    size={88}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#0f172a"
                    style={{ height: 'auto', maxWidth: '100%', width: '88px' }}
                />
            </div>
            <p className="max-w-[7rem] text-center text-[0.65rem] font-semibold uppercase tracking-wide text-teal-100/90">
                QR code inscrição
            </p>
        </div>
    );
}
