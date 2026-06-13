<?php

namespace App\Support;

use App\Models\MissionTripRegistration;

class MissionTripRegistrationPresenter
{
    public static function yesNoLabel(?bool $value): string
    {
        if ($value === null) {
            return '—';
        }

        return $value ? 'Sim' : 'Não';
    }

    /**
     * @return array<string, mixed>
     */
    public static function row(MissionTripRegistration $registration): array
    {
        $professionLabel = $registration->profession === 'Outro' && filled($registration->profession_other)
            ? 'Outro: '.$registration->profession_other
            : (string) $registration->profession;

        return [
            'id' => $registration->id,
            'fullName' => $registration->full_name,
            'instagram' => $registration->instagram,
            'phone' => $registration->phone,
            'email' => $registration->email,
            'hasPassport' => $registration->has_passport,
            'hasPassportLabel' => self::yesNoLabel($registration->has_passport),
            'participatedForeignMissionBefore' => $registration->participated_foreign_mission_before,
            'participatedForeignMissionBeforeLabel' => self::yesNoLabel($registration->participated_foreign_mission_before),
            'profession' => $registration->profession,
            'professionOther' => $registration->profession_other,
            'professionLabel' => $professionLabel,
            'createdAt' => $registration->created_at?->toIso8601String(),
            'createdAtLabel' => $registration->created_at?->timezone(config('app.timezone'))->format('d/m/Y H:i'),
        ];
    }
}
