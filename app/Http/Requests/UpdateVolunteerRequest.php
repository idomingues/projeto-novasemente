<?php

namespace App\Http\Requests;

use App\Models\User;
use App\Models\Volunteer;
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
            'phone' => ['nullable', 'string', 'max:50'],
            'ministry_ids' => ['nullable', 'array'],
            'ministry_ids.*' => ['exists:ministries,id'],
            'role' => ['nullable', 'string', 'max:100'],
            'active' => ['boolean'],
            'app_role' => ['nullable', 'string', Rule::notIn(['super_admin']), 'exists:roles,name'],
            'app_ministry_ids' => ['nullable', 'array'],
            'app_ministry_ids.*' => ['exists:ministries,id'],
            'app_password' => ['nullable', 'string', 'max:255', 'confirmed'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('active') && is_string($this->active)) {
            $this->merge(['active' => $this->active === 'true' || $this->active === '1']);
        }
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
        });
    }
}
