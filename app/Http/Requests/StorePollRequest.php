<?php

namespace App\Http\Requests;

use App\Models\Poll;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePollRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('polls.manage') ?? false;
    }

    public function rules(): array
    {
        $isText = ($this->input('response_type') ?: Poll::RESPONSE_CHOICE) === Poll::RESPONSE_TEXT;

        return [
            'question' => ['required', 'string', 'max:500'],
            'allow_multiple' => ['nullable', 'boolean'],
            'response_type' => ['required', 'string', Rule::in(array_keys(Poll::RESPONSE_TYPES))],
            'status' => ['required', 'string', Rule::in(array_keys(Poll::STATUSES))],
            'options' => [$isText ? 'nullable' : 'required', 'array', $isText ? 'max:20' : 'min:2', 'max:20'],
            'options.*.label' => [$isText ? 'nullable' : 'required', 'string', 'max:255'],
            'options.*.id' => ['nullable', 'integer'],
            'display_bg_color' => ['nullable', 'string', 'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/'],
            'display_font' => ['nullable', 'string', Rule::in(array_keys(Poll::DISPLAY_FONTS))],
            'display_chart' => ['nullable', 'string', Rule::in(array_keys(Poll::DISPLAY_CHARTS))],
            'display_logo' => ['nullable', 'string', Rule::in(array_keys(Poll::DISPLAY_LOGOS))],
            'display_enabled' => ['nullable', 'boolean'],
            'publish_to_feed' => ['nullable', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'question.required' => 'Informe a pergunta.',
            'options.required' => 'Adicione pelo menos duas opções.',
            'options.min' => 'Adicione pelo menos duas opções.',
            'options.*.label.required' => 'Preencha o texto da opção.',
        ];
    }

    protected function prepareForValidation(): void
    {
        if (! $this->filled('response_type')) {
            $this->merge(['response_type' => Poll::RESPONSE_CHOICE]);
        }

        if ($this->has('allow_multiple')) {
            $this->merge([
                'allow_multiple' => filter_var($this->input('allow_multiple'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? false,
            ]);
        }

        if ($this->has('display_enabled')) {
            $this->merge([
                'display_enabled' => filter_var($this->input('display_enabled'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? true,
            ]);
        }

        if ($this->has('publish_to_feed')) {
            $this->merge([
                'publish_to_feed' => filter_var($this->input('publish_to_feed'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? true,
            ]);
        } else {
            $this->merge(['publish_to_feed' => true]);
        }

        if ($this->filled('display_bg_color')) {
            $this->merge([
                'display_bg_color' => strtolower(trim((string) $this->input('display_bg_color'))),
            ]);
        }

        if (($this->input('response_type') ?: Poll::RESPONSE_CHOICE) === Poll::RESPONSE_TEXT) {
            $this->merge([
                'options' => [],
                'display_enabled' => false,
            ]);

            return;
        }

        if (is_array($this->input('options'))) {
            $options = collect($this->input('options'))
                ->map(function ($option) {
                    if (! is_array($option)) {
                        return null;
                    }
                    $label = trim((string) ($option['label'] ?? ''));
                    if ($label === '') {
                        return null;
                    }

                    return [
                        'id' => isset($option['id']) ? (int) $option['id'] : null,
                        'label' => $label,
                    ];
                })
                ->filter()
                ->values()
                ->all();

            $this->merge(['options' => $options]);
        }
    }
}
