import { downloadQrPng, downloadQrSvg, missionSignupQrFilename } from '@/utils/exportQrCode';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { useRef, useState } from 'react';
import QRCode from 'react-qr-code';

type Props = {
    value: string;
    className?: string;
    /** Exibe botões para baixar PNG/SVG (uso em artes e materiais). */
    exportable?: boolean;
    /** Tamanho de exibição do QR na tela. */
    displaySize?: number;
    /** Estilo compacto no hero escuro da página pública. */
    variant?: 'hero' | 'admin';
};

function toAbsoluteUrl(value: string): string {
    if (/^https?:\/\//i.test(value)) {
        return value;
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const path = value.startsWith('/') ? value : `/${value}`;

    return `${origin}${path}`;
}

export default function MissionSignupQrCode({
    value,
    className = '',
    exportable = false,
    displaySize = 88,
    variant = 'hero',
}: Props) {
    const qrRef = useRef<HTMLDivElement>(null);
    const [exporting, setExporting] = useState<'png' | 'svg' | null>(null);
    const qrValue = toAbsoluteUrl(value);
    const isAdmin = variant === 'admin';

    const getSvgElement = (): SVGSVGElement | null => qrRef.current?.querySelector('svg') ?? null;

    const exportSvg = () => {
        const svg = getSvgElement();
        if (!svg) return;

        setExporting('svg');
        try {
            downloadQrSvg(svg, missionSignupQrFilename('svg'), 512);
        } finally {
            setExporting(null);
        }
    };

    const exportPng = async () => {
        const svg = getSvgElement();
        if (!svg) return;

        setExporting('png');
        try {
            await downloadQrPng(svg, missionSignupQrFilename('png'), 2048);
        } finally {
            setExporting(null);
        }
    };

    return (
        <div className={`flex flex-col items-center gap-2 ${className}`}>
            <div
                ref={qrRef}
                className={
                    isAdmin
                        ? 'rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700'
                        : 'rounded-xl border border-white/20 bg-white p-2 shadow-sm'
                }
            >
                <QRCode
                    value={qrValue}
                    size={isAdmin ? 160 : displaySize}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#0f172a"
                    style={{
                        height: 'auto',
                        maxWidth: '100%',
                        width: isAdmin ? '160px' : `${displaySize}px`,
                    }}
                />
            </div>

            {isAdmin ? (
                <p className="max-w-[14rem] text-center text-xs text-zinc-500 dark:text-zinc-400">{qrValue}</p>
            ) : (
                <p className="max-w-[7rem] text-center text-[0.65rem] font-semibold uppercase tracking-wide text-teal-100/90">
                    QR code inscrição
                </p>
            )}

            {exportable ? (
                <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                        type="button"
                        onClick={() => void exportPng()}
                        disabled={exporting !== null}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                    >
                        <ArrowDownTrayIcon className="h-4 w-4" aria-hidden />
                        {exporting === 'png' ? 'Gerando PNG…' : 'Baixar PNG'}
                    </button>
                    <button
                        type="button"
                        onClick={exportSvg}
                        disabled={exporting !== null}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                    >
                        <ArrowDownTrayIcon className="h-4 w-4" aria-hidden />
                        {exporting === 'svg' ? 'Gerando SVG…' : 'Baixar SVG'}
                    </button>
                </div>
            ) : null}
        </div>
    );
}
