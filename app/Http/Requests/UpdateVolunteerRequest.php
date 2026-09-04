<?php

namespace App\Http\Requests;

use App\Models\User;
use App\Models\Volunteer;
use App\Support\VolunteerAppAccessRules;
use App\Support\VolunteerContactDuplicateChecker;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['required', 'string', 'max:50'],
            'ministry_ids' => ['nullable', 'array'],
            'ministry_ids.*' => ['exists:ministries,id'],
            'role' => ['nullable', 'string', 'max:100'],
            'active' => ['boolean'],
            'app_role' => ['nullable', 'string', Rule::notIn(['super_admin', 'lider_ministerio', 'financeiro']), 'exists:roles,name'],
            'is_ministry_leader' => ['sometimes', 'boolean'],
            'app_ministry_ids' => ['nullable', 'array'],
            'app_ministry_ids.*' => ['exists:ministries,id'],
            'app_password' => ['nullable', 'string', 'max:255', 'confirmed'],
            'user_status' => ['nullable', 'in:active,inactive'],
            'birth_date' => ['required', 'date', 'before:today'],
            'notify_via_app' => ['sometimes', 'boolean'],
            'notify_via_email' => ['sometimes', 'boolean'],
            'notify_via_whatsapp' => ['sometimes', 'boolean'],
            'photo' => ['nullable', 'image', 'max:4096'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('active') && is_string($this->active)) {
            $this->merge(['active' => $this->active === 'true' || $this->active === '1']);
        }

        $this->merge([
            'notify_via_app' => $this->boolean('notify_via_app'),
            'notify_via_email' => $this->boolean('notify_via_email'),
            'notify_via_whatsapp' => $this->boolean('notify_via_whatsapp'),
            'is_ministry_leader' => $this->boolean('is_ministry_leader'),
            'app_role' => trim((string) $this->input('app_role', '')) ?: null,
        ]);

        VolunteerAppAccessRules::prepareForValidation($this);
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'phone.required' => 'Informe um telefone de contato.',
            'email.required' => 'Informe um e-mail de contato.',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            /** @var Volunteer|null $volunteer */
            $volunteer = $this->route('volunteer');
            $excludeVolunteerId = $volunteer?->id;
            $excludeUserId = $volunteer?->user_id;
            $excludeMemberId = $volunteer?->user_id;
            $emailNorm = VolunteerContactDuplicateChecker::normalizeEmail(trim((string) $this->input('email')));
            if ($emailNorm !== null) {
                if ($msg = VolunteerContactDuplicateChecker::emailConflicts($this, $emailNorm, $excludeVolunteerId, $excludeMemberId, $excludeUserId)) {
                    $validator->errors()->add('email', $msg);
                }
            }

            $phoneNorm = VolunteerContactDuplicateChecker::normalizePhone(is_string($this->input('phone')) ? $this->input('phone') : null);
            if ($phoneNorm !== null) {
                if ($msg = VolunteerContactDuplicateChecker::phoneConflicts($this, $phoneNorm, $excludeVolunteerId, $excludeMemberId)) {
                    $validator->errors()->add('phone', $msg);
                }
            }

            if ($volunteer?->user_id) {
                return;
            }

            $email = trim((string) $this->input('email', ''));
            $existingUser = null;
            if ($email !== '') {
                $existingUser = User::query()->whereRaw('LOWER(email) = ?', [strtolower($email)])->first();
            }

            if ($existingUser !== null && (int) $existingUser->id !== (int) ($excludeUserId ?? 0)) {
                if ($msg = VolunteerContactDuplicateChecker::privilegedAccountVolunteerLinkMessage($existingUser, $this->user()?->id)) {
                    $validator->errors()->add('email', $msg);
                }
            }

            if (! $existingUser && ! $this->filled('app_password')) {
                $validator->errors()->add('app_password', 'Defina uma senha para criar a conta de acesso.');
            }

            VolunteerAppAccessRules::validateLeaderProfile($validator, $this);
        });
    }
}
