<?php

namespace App\Http\Requests;

/** Mesmas regras que {@see StoreVolunteerRequestSolicitationRequest}, exceto `quantity` (só na criação). */
class UpdateVolunteerRequestSolicitationRequest extends StoreVolunteerRequestSolicitationRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $rules = parent::rules();
        unset($rules['quantity']);

        return $rules;
    }
}
