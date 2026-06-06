import { useAppVersionLabels } from '@/hooks/useAppVersionLabels';

export default function InstalledAppVersion({
    className = '',
    fallbackLabel = null,
}: {
    className?: string;
    /** Mantido por compatibilidade; o hook já resolve o fallback a partir dos props da página. */
    fallbackLabel?: string | null;
}) {
    void fallbackLabel;
    const { installedLabel } = useAppVersionLabels();

    return (
        <span className={className} aria-label="Versão instalada">
            {installedLabel}
        </span>
    );
}

