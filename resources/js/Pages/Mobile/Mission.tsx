import MissionForm from '@/Pages/Mission/Form';
import type { MissionOptions } from '@/Components/Mission/MissionFormBody';

import type { MissionSubmissionResult } from '@/Components/Mission/MissionSubmissionSuccess';

interface Props {
    churchName: string;
    options: MissionOptions;
    storeUrl: string;
    appAccountStoreUrl: string;
    submission?: MissionSubmissionResult | null;
}

export default function MobileMission(props: Props) {
    return <MissionForm {...props} layout="mobile" />;
}
