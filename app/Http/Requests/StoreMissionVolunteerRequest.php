<?php

namespace App\Http\Requests;

use App\Models\Church;
use App\Support\MissionAppAccount;
use App\Support\MissionVolunteerPayload;
use App\Support\MissionVolunteerRegistration;
use Illuminate\Foundation\Http\FormRequest;

class StoreMissionVolunteerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $booleanFields = [
            'has_belief',
            'participates_religion',
            'baptized',
            'studied_bible_structured',
            'first_time_nova_semente',
        ];

        $merged = [];
        foreach ($booleanFields as $field) {
            if (! $this->has($field)) {
                continue;
            }
            $value = $this->input($field);
            if ($value === '' || $value === null) {
                continue;
            }
            $merged[$field] = filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? $value;
        }

        if ($merged !== []) {
            $this->merge($merged);
        }

        if ($this->has('lgpd_consent')) {
            $lgpd = $this->input('lgpd_consent');
            if (in_array($lgpd, [true, 1, '1', 'true', 'on', 'yes'], true)) {
                $this->merge(['lgpd_consent' => true]);
            }
        }

        if ($this->has('wants_app_account')) {
            $wants = $this->input('wants_app_account');
            if ($wants === '' || $wants === null) {
                $this->merge(['wants_app_account' => null]);
            } else {
                $this->merge([
                    'wants_app_account' => filter_var($wants, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? $wants,
                ]);
            }
        }
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $existing = null;
        $user = $this->user();
        $churchId = Church::resolveWorkingId($this);
        if ($user !== null && $churchId !== null) {
            $existing = MissionVolunteerRegistration::findCompletedForUser((int) $churchId, $user);
        }

        $rules = MissionVolunteerPayload::validationRules($existing);

        if ($this->user() === null) {
            $rules['wants_app_account'] = ['nullable', 'boolean'];
        }

        if ($this->user() === null && $this->boolean('wants_app_account')) {
            $status = MissionAppAccount::statusForRegistration(
                $churchId !== null ? (int) $churchId : null,
                (string) $this->input('phone', ''),
                (string) $this->input('app_email', ''),
                null,
            );

            if (! $status['already_in_app']) {
                $rules = array_merge($rules, MissionAppAccount::wizardValidationRules());
            }
        }

        return $rules;
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'profession.required' => 'Selecione sua profissão.',
            'profession.in' => 'Selecione uma profissão válida.',
            'profession_other.required' => 'Especifique sua profissão.',
        ];
    }
}
