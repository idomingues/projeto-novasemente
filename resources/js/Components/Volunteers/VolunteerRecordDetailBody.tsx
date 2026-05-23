import RecordDetailHeader from '@/Components/RecordDetail/RecordDetailHeader';
import RecordDetailSections from '@/Components/RecordDetail/RecordDetailSections';
import { volunteerDetailSections, type VolunteerDetailData } from '@/utils/volunteerDetailRows';
import type { ReactNode } from 'react';

export default function VolunteerRecordDetailBody({
    volunteer,
    badge,
    subtitle,
    onClose,
    footer,
}: {
    volunteer: VolunteerDetailData;
    badge?: string | null;
    subtitle?: string | null;
    onClose: () => void;
    footer?: ReactNode;
}) {
    const title = volunteer.name?.trim() || volunteer.user?.name?.trim() || 'Voluntário';
    const photoUrl = volunteer.photo_url ?? volunteer.user?.photo_url ?? null;
    const sections = volunteerDetailSections(volunteer);
    const resolvedSubtitle =
        subtitle ?? 'Cadastro de voluntário e conta no app (mesma pessoa).';

    return (
        <div className="space-y-4">
            <RecordDetailHeader
                title={title}
                subtitle={resolvedSubtitle}
                photoUrl={photoUrl}
                badge={badge}
                onClose={onClose}
            />
            <RecordDetailSections sections={sections} />
            {footer}
        </div>
    );
}
