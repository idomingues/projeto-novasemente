import type { MissionFormData } from '@/Components/Mission/MissionFormBody';
import {
    missionErrorStepIndex,
    validateMissionStep,
    visibleMissionSteps,
} from '@/utils/missionFormSteps';

export type MissionValidationIssue = {
    stepIndex: number;
    message: string;
};

/** @deprecated Use stepIndex — kept for callers expecting `page`. */
export type MissionValidationIssueLegacy = {
    page: number;
    message: string;
};

export function findMissionFormIssue(data: MissionFormData, offerAppAccount = false): MissionValidationIssue | null {
    const steps = visibleMissionSteps(data, offerAppAccount);

    for (let stepIndex = 0; stepIndex < steps.length; stepIndex++) {
        const message = validateMissionStep(steps[stepIndex], data);
        if (message) {
            return { stepIndex, message };
        }
    }

    return null;
}

export function missionErrorPage(
    errors: Partial<Record<keyof MissionFormData, string>>,
    data: MissionFormData,
): number | null {
    return missionErrorStepIndex(errors, data);
}
