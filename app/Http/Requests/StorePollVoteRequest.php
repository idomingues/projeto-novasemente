<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePollVoteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'option_ids' => ['required', 'array', 'size:1'],
            'option_ids.*' => ['integer', 'distinct'],
        ];
    }

    public function messages(): array
    {
        return [
            'option_ids.required' => 'Selecione uma opção.',
            'option_ids.size' => 'Selecione apenas uma opção.',
        ];
    }
}
