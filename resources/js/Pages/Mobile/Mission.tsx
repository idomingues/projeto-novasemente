import MissionForm from '@/Pages/Mission/Form';
import type { MissionOptions } from '@/Components/Mission/MissionFormBody';

interface Props {
    churchName: string;
    options: MissionOptions;
    storeUrl: string;
}

export default function MobileMission(props: Props) {
    return <MissionForm {...props} layout="mobile" />;
}
