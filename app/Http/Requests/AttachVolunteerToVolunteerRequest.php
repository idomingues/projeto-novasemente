<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AttachVolunteerToVolunteerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'volunteer_id' => ['required', 'integer', 'exists:volunteers,id'],
        ];
    }
}
