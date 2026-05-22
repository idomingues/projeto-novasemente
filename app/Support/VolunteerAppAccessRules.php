<?php

namespace App\Support;

use App\Models\Church;
use App\Models\Ministry;
use Illuminate\Foundation\Http\FormRequest;

final class VolunteerAppAccessRules
{
    public static function prepareForValidation(FormRequest $request): void
    {
        $ids = $request->input('app_ministry_ids', []);
        $hasLed = is_array($ids) && count(array_filter($ids, fn ($v) => (int) $v > 0)) > 0;
        if ($hasLed) {
            $request->merge(['app_role' => 'lider_ministerio']);
        }
    }

    public static function validateLeaderProfile($validator, FormRequest $request): void
    {
        $role = trim((string) $request->input('app_role', ''));
        $ids = $request->input('app_ministry_ids', []);
        $n = is_array($ids) ? count(array_filter($ids, fn ($v) => (int) $v > 0)) : 0;

        if ($n >= 1 && $role !== 'lider_ministerio') {
            $validator->errors()->add(
                'app_role',
                'Quem gere departamentos deve ter o perfil Líder de ministério.'
            );
        }

        if ($role !== 'lider_ministerio') {
            return;
        }

        $churchId = Church::resolveWorkingId($request);
        if ($churchId === null || ! Ministry::query()->where('church_id', $churchId)->exists()) {
            return;
        }

        if ($n < 1) {
            $validator->errors()->add(
                'app_ministry_ids',
                'Selecione pelo menos um departamento que o líder irá gerir.'
            );
        }
    }
}
