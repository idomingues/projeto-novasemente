<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMissionTripRegistrationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $merged = [];

        foreach (['has_passport', 'participated_foreign_mission_before'] as $field) {
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
        $professions = config('mission.trip_professions', []);

        return [
            'full_name' => ['required', 'string', 'max:255'],
            'instagram' => ['nullable', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:50'],
            'email' => ['required', 'email', 'max:255'],
            'has_passport' => ['required', 'boolean'],
            'participated_foreign_mission_before' => ['required', 'boolean'],
            'profession' => ['required', 'string', Rule::in($professions)],
            'profession_other' => [
                Rule::requiredIf(fn () => $this->input('profession') === 'Outro'),
                'nullable',
                'string',
                'max:255',
            ],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'full_name.required' => 'Informe seu nome completo.',
            'phone.required' => 'Informe seu telefone.',
            'email.required' => 'Informe seu e-mail.',
            'email.email' => 'Informe um e-mail válido.',
            'has_passport.required' => 'Informe se possui passaporte.',
            'participated_foreign_mission_before.required' => 'Informe se já participou de missão no exterior.',
            'profession.required' => 'Selecione sua profissão ou área de atuação.',
            'profession.in' => 'Selecione uma profissão válida.',
            'profession_other.required' => 'Especifique sua profissão ou área de atuação.',
        ];
    }
}
