import RecordDetailHeader from '@/Components/RecordDetail/RecordDetailHeader';
import type { PersonIdentity } from '@/Components/PersonListIdentity';

export default function PersonModalHeader({
    person,
    subtitle,
    badge,
}: {
    person: PersonIdentity;
    subtitle?: string | null;
    badge?: string | null;
}) {
    return (
        <RecordDetailHeader
            title={(person.name ?? '').trim() || '—'}
            subtitle={subtitle ?? undefined}
            email={person.email}
            phone={person.phone}
            photoUrl={person.photoUrl}
            badge={badge ?? undefined}
        />
    );
}
