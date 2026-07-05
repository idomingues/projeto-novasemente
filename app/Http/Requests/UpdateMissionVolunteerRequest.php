<?php

namespace App\Http\Requests;

use App\Models\Church;
use App\Models\MissionVolunteer;
use App\Support\MissionVolunteerPayload;
use Illuminate\Foundation\Http\FormRequest;

class UpdateMissionVolunteerRequest extends FormRequest
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
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $existing = $this->route('missionVolunteer');
        abort_unless($existing instanceof MissionVolunteer, 404);

        return MissionVolunteerPayload::adminUpdateRules($existing);
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'profession.required' => 'Selecione a profissão.',
            'profession.in' => 'Selecione uma profissão válida.',
            'profession_other.required' => 'Especifique a profissão.',
        ];
    }
}
