<?php

namespace App\Http\Requests;

use App\Models\Church;
use App\Models\User;
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
        $churchId = (int) ($this->user()->church_id ?? 0);
        if ($churchId === 0) {
            $resolved = Church::resolveWorkingId($this);
            if ($resolved !== null) {
                $churchId = (int) $resolved;
            }
        }

        $ministryItemRules = ['integer'];
        if ($churchId > 0) {
            $ministryItemRules[] = Rule::exists('ministries', 'id')->where('church_id', $churchId);
        } else {
            $ministryItemRules[] = 'exists:ministries,id';
        }

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                Rule::unique(User::class)->ignore($this->user()->id),
            ],
            'photo_file' => ['nullable', 'image', 'max:4096'],
            'notify_via_app' => ['sometimes', 'boolean'],
            'notify_via_email' => ['sometimes', 'boolean'],
            'notify_via_whatsapp' => ['sometimes', 'boolean'],
            'volunteer_ministry_ids' => ['nullable', 'array'],
            'volunteer_ministry_ids.*' => $ministryItemRules,
        ];
    }
}
