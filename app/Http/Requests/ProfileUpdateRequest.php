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
        return array_merge([
            'redirect_to' => ['nullable', 'string', 'max:120'],
            'name' => ['required', 'string', 'max:255'],
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
}
