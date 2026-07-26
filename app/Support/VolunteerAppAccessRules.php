<?php

namespace App\Support;

use App\Models\Church;
use App\Models\Ministry;
use Illuminate\Foundation\Http\FormRequest;

final class VolunteerAppAccessRules
{
    public static function prepareForValidation(FormRequest $request): void
    {
        // Departamentos liderados definem a propriedade Líder — não um perfil Spatie.
        $ids = $request->input('app_ministry_ids', []);
        $hasLed = is_array($ids) && count(array_filter($ids, fn ($v) => (int) $v > 0)) > 0;
        if ($hasLed && ! $request->boolean('is_ministry_leader')) {
            $request->merge(['is_ministry_leader' => true]);
        }
    }

    public static function validateLeaderProfile($validator, FormRequest $request): void
    {
        $ids = $request->input('app_ministry_ids', []);
        $n = is_array($ids) ? count(array_filter($ids, fn ($v) => (int) $v > 0)) : 0;
        $isLeader = $request->boolean('is_ministry_leader') || $n >= 1;

        $churchId = Church::resolveWorkingId($request);
        if ($churchId === null || ! Ministry::query()->where('church_id', $churchId)->exists()) {
            return;
        }

        if ($isLeader && $n < 1) {
            $validator->errors()->add(
                'app_ministry_ids',
                'Selecione pelo menos um departamento que o líder irá gerir.'
            );
        }
    }
}
