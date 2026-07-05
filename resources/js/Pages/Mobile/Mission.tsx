import MissionForm from '@/Pages/Mission/Form';
import type { MissionOptions } from '@/Components/Mission/MissionFormBody';

import type { MissionSubmissionResult } from '@/Components/Mission/MissionSubmissionSuccess';

interface Props {
    churchName: string;
    options: MissionOptions;
    storeUrl: string;
    saveStepUrl?: string;
    appAccountStoreUrl: string;
    submission?: MissionSubmissionResult | null;
    canResume?: boolean;
    draft?: {
        id: number;
        stepIndex: number;
        stepId: string | null;
        photoUrl: string | null;
        fields: Record<string, unknown>;
    } | null;
    isEditing?: boolean;
    offerAppAccount?: boolean;
}

export default function MobileMission(props: Props) {
    return <MissionForm {...props} layout="mobile" />;
}
