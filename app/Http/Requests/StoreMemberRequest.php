<?php

namespace App\Http\Requests;

use App\Models\Church;
use App\Models\Ministry;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class StoreMemberRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'is_volunteer' => $this->boolean('is_volunteer'),
            'notify_via_app' => $this->boolean('notify_via_app'),
            'notify_via_email' => $this->boolean('notify_via_email'),
            'notify_via_whatsapp' => $this->boolean('notify_via_whatsapp'),
        ]);
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $churchId = Church::resolveWorkingId($this);
        $ministryItemRules = ['integer'];
        if ($churchId !== null) {
            $ministryItemRules[] = Rule::exists('ministries', 'id')->where('church_id', $churchId);
        } else {
            $ministryItemRules[] = 'prohibited';
        }

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:20'],
            'birth_date' => ['nullable', 'date'],
            'address' => ['nullable', 'string', 'max:1000'],
            'status' => ['required', 'in:active,inactive'],
            'is_volunteer' => ['sometimes', 'boolean'],
            'volunteer_ministry_ids' => ['nullable', 'array'],
            'volunteer_ministry_ids.*' => $ministryItemRules,
            'password' => ['required', 'string', 'confirmed', Password::defaults()],
            'photo' => ['nullable', 'image', 'max:4096'],
            'notify_via_app' => ['required', 'boolean'],
            'notify_via_email' => ['required', 'boolean'],
            'notify_via_whatsapp' => ['required', 'boolean'],
            'lgpd_accepted' => ['required', 'accepted'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            if (! $this->boolean('is_volunteer')) {
                return;
            }
            $cid = Church::resolveWorkingId($this);
            if ($cid === null || ! Ministry::query()->where('church_id', $cid)->exists()) {
                return;
            }
            $ids = $this->input('volunteer_ministry_ids', []);
            $n = is_array($ids) ? count(array_filter($ids, fn ($v) => (int) $v > 0)) : 0;
            if ($n < 1) {
                $validator->errors()->add(
                    'volunteer_ministry_ids',
                    'Selecione pelo menos um departamento em que serve ou irá servir.'
                );
            }
        });
    }
}
