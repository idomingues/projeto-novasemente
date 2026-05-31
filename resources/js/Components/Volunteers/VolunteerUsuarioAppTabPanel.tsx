import VolunteerNoAppAccountCard from '@/Components/Volunteers/VolunteerNoAppAccountCard';
import VolunteerUserEditForm from '@/Components/Volunteers/VolunteerUserEditForm';
import type { VolunteerDetailData } from '@/utils/volunteerDetailRows';
import { volunteerCanUseUsuarioAppForm } from '@/utils/volunteerEditForm';

type Props = {
    volunteer: VolunteerDetailData;
    appRoles: Array<{ id: number; name: string }>;
    submitUrl: string;
    volunteersAdminUrl?: string | null;
    onSuccess?: () => void;
    idPrefix?: string;
};

export default function VolunteerUsuarioAppTabPanel({
    volunteer,
    appRoles,
    submitUrl,
    volunteersAdminUrl,
    onSuccess,
    idPrefix = 'vol-app-tab',
}: Props) {
    if (!volunteerCanUseUsuarioAppForm(volunteer)) {
        return (
            <VolunteerNoAppAccountCard
                volunteerName={volunteer.user?.name ?? volunteer.name}
                volunteersAdminUrl={volunteersAdminUrl}
            />
        );
    }

    return (
        <VolunteerUserEditForm
            key={volunteer.id}
            volunteer={volunteer}
            appRoles={appRoles}
            submitUrl={submitUrl}
            onSuccess={onSuccess}
            idPrefix={idPrefix}
        />
    );
}
