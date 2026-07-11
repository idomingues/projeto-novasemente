<?php

namespace App\Http\Requests;

use App\Models\WeeklyProgram;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreWeeklyProgramRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $lines = $this->input('lines');
        if (is_string($lines)) {
            $parsed = array_values(array_filter(array_map(
                static fn (string $line) => trim($line),
                preg_split('/\r\n|\r|\n/', $lines) ?: []
            ), static fn (string $line) => $line !== ''));
            $this->merge(['lines' => $parsed === [] ? null : $parsed]);
        }

        foreach (['title', 'body', 'display_time', 'home_message', 'image_url', 'start_time', 'end_time'] as $field) {
            if ($this->has($field) && $this->input($field) === '') {
                $this->merge([$field => null]);
            }
        }

        $this->merge([
            'show_on_home' => $this->boolean('show_on_home'),
            'is_active' => $this->boolean('is_active', true),
        ]);
    }

    public function rules(): array
    {
        return [
            'day_of_week' => ['required', 'integer', 'between:0,6'],
            'when_label' => ['required', 'string', 'max:64'],
            'title' => ['nullable', 'string', 'max:255'],
            'body' => ['nullable', 'string', 'max:5000'],
            'lines' => ['nullable', 'array', 'max:12'],
            'lines.*' => ['string', 'max:255'],
            'time_mode' => ['required', 'string', Rule::in(WeeklyProgram::TIME_MODES)],
            'start_time' => ['nullable', 'date_format:H:i'],
            'end_time' => ['nullable', 'date_format:H:i'],
            'display_time' => ['nullable', 'string', 'max:64'],
            'home_message' => ['nullable', 'string', 'max:255'],
            'image_url' => ['nullable', 'string', 'max:512'],
            'show_on_home' => ['boolean'],
            'is_active' => ['boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            if ($this->input('time_mode') === WeeklyProgram::TIME_MODE_FIXED
                && ! $this->filled('start_time')
                && ! $this->filled('display_time')
            ) {
                $validator->errors()->add(
                    'start_time',
                    'Informe o horário ou o texto de exibição do horário.'
                );
            }
        });
    }

    public function messages(): array
    {
        return [
            'when_label.required' => 'Informe o rótulo do horário (ex.: SÁB 9H30).',
            'day_of_week.required' => 'Selecione o dia da semana.',
            'time_mode.required' => 'Selecione o tipo de horário.',
        ];
    }
}
