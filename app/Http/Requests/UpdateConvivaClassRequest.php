<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateConvivaClassRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('conviva.manage') ?? false;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('is_active')) {
            $this->merge([
                'is_active' => filter_var($this->input('is_active'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? true,
            ]);
        }
        if ($this->has('sort_order') && $this->input('sort_order') === '') {
            $this->merge(['sort_order' => 0]);
        }
    }

    public function rules(): array
    {
        return [
            'room_name' => ['required', 'string', 'max:255'],
            'teacher_name' => ['required', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
        ];
    }
}
