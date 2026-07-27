<?php

namespace App\Http\Requests;

use App\Models\User;
use App\Support\UserProfilePhotoResolver;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProfileUpdateRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $this->merge([
            'notify_via_app' => $this->boolean('notify_via_app'),
            'notify_via_email' => $this->boolean('notify_via_email'),
            'notify_via_whatsapp' => $this->boolean('notify_via_whatsapp'),
        ]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $minBirthDate = now()->subYears(10)->toDateString();

        return array_merge([
            'redirect_to' => ['nullable', 'string', 'max:120'],
            'name' => ['required', 'string', 'max:255'],
            'birth_date' => ['required', 'date', 'before:today', 'before_or_equal:'.$minBirthDate],
            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                Rule::unique(User::class)->ignore($this->user()->id),
            ],
            'notify_via_app' => ['sometimes', 'boolean'],
            'notify_via_email' => ['sometimes', 'boolean'],
            'notify_via_whatsapp' => ['sometimes', 'boolean'],
        ], UserProfilePhotoResolver::validationRules(required: false));
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'email.unique' => 'Este e-mail já está cadastrado em outra conta.',
            'email.email' => 'Informe um endereço de e-mail válido.',
            'photo_file.image' => 'A foto deve ser uma imagem (JPG, PNG ou similar).',
            'photo_file.max' => 'A foto deve ter no máximo 4 MB.',
            'birth_date.required' => 'Informe a data de nascimento.',
            'birth_date.before' => 'Informe uma data de nascimento válida.',
            'birth_date.before_or_equal' => 'O cadastro exige pelo menos 10 anos de idade.',
        ];
    }
}
