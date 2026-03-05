<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateMinistryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('icon') && $this->input('icon') === '') {
            $this->merge(['icon' => null]);
        }
    }

    public function rules(): array
    {
        $iconKeys = ['building', 'musical_note', 'key', 'speaker', 'heart', 'user_group', 'inbox', 'film', 'megaphone'];
        return [
            'name' => ['required', 'string', 'max:255'],
            'icon' => ['nullable', 'string', 'in:' . implode(',', $iconKeys)],
        ];
    }
}
