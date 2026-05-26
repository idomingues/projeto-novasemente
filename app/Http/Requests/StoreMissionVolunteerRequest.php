<?php

namespace App\Http\Requests;

use App\Support\MissionVolunteerPayload;
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
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return MissionVolunteerPayload::validationRules();
    }
}
