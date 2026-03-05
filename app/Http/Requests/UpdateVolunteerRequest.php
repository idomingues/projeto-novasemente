<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateVolunteerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'member_id' => ['nullable', 'exists:members,id'],
            'name' => ['required_if:member_id,null', 'nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'ministry_ids' => ['required', 'array', 'min:1'],
            'ministry_ids.*' => ['exists:ministries,id'],
            'role' => ['nullable', 'string', 'max:100'],
            'active' => ['boolean'],
            'photo_url' => ['nullable', 'string', 'url', 'max:500'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('active') && is_string($this->active)) {
            $this->merge(['active' => $this->active === 'true' || $this->active === '1']);
        }
        if ($this->has('photo_url') && $this->input('photo_url') === '') {
            $this->merge(['photo_url' => null]);
        }
    }
}
