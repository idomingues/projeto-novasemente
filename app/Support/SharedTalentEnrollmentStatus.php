<?php

namespace App\Support;

use App\Models\SharedTalentEnrollment;

final class SharedTalentEnrollmentStatus
{
    /** @return array<string, string> */
    public static function labels(): array
    {
        return [
            SharedTalentEnrollment::STATUS_ENROLLED => 'Inscrito',
            SharedTalentEnrollment::STATUS_AWAITING_APPROVAL => 'Aguardando aprovação',
            SharedTalentEnrollment::STATUS_CONFIRMED => 'Confirmado',
            SharedTalentEnrollment::STATUS_IN_PROGRESS => 'Em andamento',
            SharedTalentEnrollment::STATUS_COMPLETED => 'Concluído',
            SharedTalentEnrollment::STATUS_CANCELLED => 'Cancelado',
            SharedTalentEnrollment::STATUS_REJECTED => 'Rejeitado',
        ];
    }

    public static function label(string $status): string
    {
        return self::labels()[$status] ?? $status;
    }

    public static function allowsReview(string $status): bool
    {
        return $status === SharedTalentEnrollment::STATUS_COMPLETED;
    }

    public static function countsTowardSlots(string $status): bool
    {
        return in_array($status, [
            SharedTalentEnrollment::STATUS_CONFIRMED,
            SharedTalentEnrollment::STATUS_IN_PROGRESS,
            SharedTalentEnrollment::STATUS_COMPLETED,
        ], true);
    }

    /** @return list<string> */
    public static function publisherCanSet(): array
    {
        return [
            SharedTalentEnrollment::STATUS_CONFIRMED,
            SharedTalentEnrollment::STATUS_REJECTED,
            SharedTalentEnrollment::STATUS_IN_PROGRESS,
            SharedTalentEnrollment::STATUS_COMPLETED,
        ];
    }

    /** @return list<string> */
    public static function participantCanSet(): array
    {
        return [SharedTalentEnrollment::STATUS_CANCELLED];
    }

    /** @return list<string> */
    public static function announcementRecipients(): array
    {
        return [
            SharedTalentEnrollment::STATUS_CONFIRMED,
            SharedTalentEnrollment::STATUS_IN_PROGRESS,
        ];
    }
}
