<?php

namespace App\Http\Requests;

use App\Models\Member;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

class StoreVolunteerRequest extends FormRequest
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
            'enable_app_access' => ['boolean'],
            'app_password' => ['nullable', 'confirmed', Password::defaults()],
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
        if ($this->has('enable_app_access') && is_string($this->enable_app_access)) {
            $this->merge(['enable_app_access' => $this->enable_app_access === 'true' || $this->enable_app_access === '1']);
        }
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            if (! $this->boolean('enable_app_access')) {
                return;
            }

            $memberId = $this->input('member_id');
            $email = $memberId
                ? (Member::query()->find($memberId)?->email)
                : $this->input('email');
            $email = is_string($email) ? trim($email) : '';

            if ($email === '') {
                $validator->errors()->add('email', 'É necessário um e-mail para acesso ao app (cadastre no membro ou informe acima).');
            }

            $existingUser = null;
            if ($memberId) {
                $existingUser = User::query()->where('member_id', $memberId)->first();
            }
            if (! $existingUser && $email !== '') {
                $existingUser = User::query()->whereRaw('LOWER(email) = ?', [strtolower($email)])->first();
            }

            if (! $existingUser && ! $this->filled('app_password')) {
                $validator->errors()->add('app_password', 'Defina uma senha para criar a conta de acesso (ou use um membro que já tenha usuário).');
            }
        });
    }
}
