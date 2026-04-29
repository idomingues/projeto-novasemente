<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreVolunteerRequestSolicitationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    protected function prepareForValidation(): void
    {
        $v = $this->input('schedule_role_id');
        if ($v === '' || $v === null) {
            $this->merge(['schedule_role_id' => null]);
        }

        $q = $this->input('quantity');
        if ($q === '' || $q === null) {
            $this->merge(['quantity' => 1]);
        }

        $m = $this->input('message');
        if ($m === null) {
            $this->merge(['message' => '']);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'ministry_id' => ['required', 'integer', 'min:1'],
            'schedule_role_id' => ['nullable', 'integer', 'exists:schedule_roles,id'],
            'message' => ['nullable', 'string', 'max:5000'],
            'quantity' => ['nullable', 'integer', 'min:1', 'max:50'],
        ];
    }
}
