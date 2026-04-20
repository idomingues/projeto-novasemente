<?php

namespace App\Http\Requests;

use App\Models\Church;
use App\Models\Ministry;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMemberRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $member = $this->route('member');
        $merge = [
            'is_volunteer' => $this->boolean('is_volunteer'),
            'notify_via_app' => $this->boolean('notify_via_app'),
            'notify_via_email' => $this->boolean('notify_via_email'),
            'notify_via_whatsapp' => $this->boolean('notify_via_whatsapp'),
        ];
        if ($member instanceof User && $member->lgpd_accepted_at !== null) {
            $merge['lgpd_accepted'] = true;
        }
        $this->merge($merge);
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $member = $this->route('member');
        $memberId = $member instanceof User ? $member->id : null;

        $churchId = Church::resolveWorkingId($this);
        $ministryItemRules = ['integer'];
        if ($churchId !== null) {
            $ministryItemRules[] = Rule::exists('ministries', 'id')->where('church_id', $churchId);
        } else {
            $ministryItemRules[] = 'prohibited';
        }

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($memberId),
            ],
            'phone' => ['nullable', 'string', 'max:20'],
            'birth_date' => ['nullable', 'date'],
            'address' => ['nullable', 'string', 'max:1000'],
            'status' => ['required', 'in:active,inactive'],
            'is_volunteer' => ['sometimes', 'boolean'],
            'volunteer_ministry_ids' => ['nullable', 'array'],
            'volunteer_ministry_ids.*' => $ministryItemRules,
            'photo' => ['nullable', 'image', 'max:4096'],
            'notify_via_app' => ['sometimes', 'boolean'],
            'notify_via_email' => ['sometimes', 'boolean'],
            'notify_via_whatsapp' => ['sometimes', 'boolean'],
            'lgpd_accepted' => [
                Rule::requiredIf(function (): bool {
                    $member = $this->route('member');

                    return $member instanceof User && $member->lgpd_accepted_at === null;
                }),
                'accepted',
            ],
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
