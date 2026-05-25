import RecordDetailHeader from '@/Components/RecordDetail/RecordDetailHeader';
import type { PersonIdentity } from '@/Components/PersonListIdentity';

export default function PersonModalHeader({
    person,
    subtitle,
    badge,
    onClose,
}: {
    person: PersonIdentity;
    subtitle?: string | null;
    badge?: string | null;
    onClose: () => void;
}) {
    return (
        <RecordDetailHeader
            title={(person.name ?? '').trim() || '—'}
            subtitle={subtitle ?? undefined}
            photoUrl={person.photoUrl}
            badge={badge ?? undefined}
            onClose={onClose}
        />
    );
}
