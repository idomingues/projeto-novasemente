import Checkbox from '@/Components/Checkbox';
import {
    VOLUNTEER_SIGNUP_MULTI_SELECT_CONTINUE_HINT,
} from '@/utils/volunteerSignupAutosave';
import { formatMultiSelectSelectionCount, toggleMultiSelectValue } from '@/utils/volunteerSignupOptions';

export type VolunteerSignupMultiCheckboxOption = {
    value: string;
    label: string;
};

type Props = {
    options: VolunteerSignupMultiCheckboxOption[];
    selectedValues: string[];
    onChange: (next: string[]) => void;
    maxHeightClass?: string;
    hint?: string;
};

export default function VolunteerSignupMultiCheckboxField({
    options,
    selectedValues,
    onChange,
    maxHeightClass = 'max-h-64',
    hint = VOLUNTEER_SIGNUP_MULTI_SELECT_CONTINUE_HINT,
}: Props) {
    return (
        <>
            <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">{hint}</p>
            <div
                className={`${maxHeightClass} space-y-2 overflow-y-auto rounded-xl border border-zinc-200 p-3 dark:border-zinc-700`}
            >
                {options.map((opt) => (
                    <label key={opt.value} className="flex cursor-pointer items-start gap-2.5 rounded-lg py-1">
                        <Checkbox
                            checked={selectedValues.includes(opt.value)}
                            onChange={() => {
                                onChange(toggleMultiSelectValue(selectedValues, opt.value));
                            }}
                            className="mt-0.5"
                        />
                        <span className="text-sm text-zinc-900 dark:text-white">{opt.label}</span>
                    </label>
                ))}
            </div>
            {selectedValues.length > 0 ? (
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    {formatMultiSelectSelectionCount(selectedValues.length)}
                </p>
            ) : null}
        </>
    );
}
