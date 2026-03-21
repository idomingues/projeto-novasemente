<?php

namespace App\Http\Requests;

use App\Models\Member;
use App\Models\User;
use App\Models\Volunteer;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

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
            'is_member' => ['nullable', 'boolean'],
            'member_id' => ['nullable', 'exists:members,id'],
            'first_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['nullable', 'string', 'max:155'],
            'name' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'app_email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'ministry_ids' => ['required', 'array', 'min:1'],
            'ministry_ids.*' => ['exists:ministries,id'],
            'role' => ['nullable', 'string', 'max:100'],
            'active' => ['boolean'],
            'photo_file' => ['nullable', 'image', 'max:4096'],
            'enable_app_access' => ['boolean'],
            'app_role' => ['nullable', 'string', 'exists:roles,name'],
            'app_ministry_ids' => ['nullable', 'array'],
            'app_ministry_ids.*' => ['exists:ministries,id'],
            'app_password' => ['nullable', 'confirmed', Password::defaults()],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('active') && is_string($this->active)) {
            $this->merge(['active' => $this->active === 'true' || $this->active === '1']);
        }
        if ($this->has('enable_app_access') && is_string($this->enable_app_access)) {
            $this->merge(['enable_app_access' => $this->enable_app_access === 'true' || $this->enable_app_access === '1']);
        }

        $isMember = (int) $this->input('is_member', 1) === 1;
        $this->merge(['is_member' => $isMember]);

        $memberId = $this->input('member_id');
        if ($memberId === '' || $memberId === null) {
            $this->merge(['member_id' => null]);
        }

        if ($isMember) {
            $this->merge(['name' => null]);
        } else {
            $this->merge(['member_id' => null]);
            $first = trim((string) $this->input('first_name', ''));
            $last = trim((string) $this->input('last_name', ''));
            $this->merge(['name' => trim($first.' '.$last)]);
        }
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            if ($this->boolean('is_member')) {
                if (! $this->filled('member_id')) {
                    $validator->errors()->add('member_id', 'Selecione um membro na lista.');
                }
            } else {
                $first = trim((string) $this->input('first_name', ''));
                $last = trim((string) $this->input('last_name', ''));
                if ($first === '') {
                    $validator->errors()->add('first_name', 'Informe o nome.');
                }
                if ($last === '') {
                    $validator->errors()->add('last_name', 'Informe o sobrenome.');
                }
            }

            if ($this->boolean('is_member') && $this->filled('member_id')) {
                $member = Member::query()->find($this->input('member_id'));
                $hasPhoto = $member && is_string($member->photo_url) && trim($member->photo_url) !== '';
                if (! $hasPhoto && ! $this->hasFile('photo_file')) {
                    $validator->errors()->add(
                        'photo_file',
                        'Este membro ainda não tem foto. Envie uma imagem.'
                    );
                }
            }

            if (! $this->boolean('enable_app_access')) {
                return;
            }

            /** @var Volunteer|null $volunteer */
            $volunteer = $this->route('volunteer');
            if ($volunteer?->user_id) {
                return;
            }

            $memberId = $this->input('member_id');
            $preferredAppEmail = $this->input('app_email');
            $email = is_string($preferredAppEmail) && trim($preferredAppEmail) !== ''
                ? $preferredAppEmail
                : ($memberId
                    ? (Member::query()->find($memberId)?->email)
                    : $this->input('email'));
            $email = is_string($email) ? trim($email) : '';

            if ($email === '') {
                $validator->errors()->add('app_email', 'É necessário um e-mail para acesso ao app.');
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
