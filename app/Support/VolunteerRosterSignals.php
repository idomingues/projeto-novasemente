<?php

namespace App\Support;

use App\Models\Member;
use App\Models\Volunteer;

/**
 * Sinais automáticos para a ficha «visão líder» (substituem parte da planilha).
 * «6 meses carta»: enquanto não existir data de carta no sistema, usa-se presença de membro há ≥6 meses (created_at).
 */
final class VolunteerRosterSignals
{
    /**
     * @return array{memberNs: bool, sixMonthsInChurchOrLetter: bool, ministryExperienceDeclared: bool, notes: string}
     */
    public static function forVolunteer(Volunteer $v): array
    {
        $memberNs = (bool) $v->is_official_member && (bool) $v->member_record_at_nova_semente;

        $sixMonths = false;
        if ($v->member_id) {
            $member = Member::query()->find($v->member_id);
            if ($member?->created_at) {
                $sixMonths = $member->created_at->lte(now()->subMonths(6));
            }
        }

        $ministryExperienceDeclared = (bool) $v->has_previous_ministry_volunteer_experience;

        $notes = 'Membro NS: exige membro oficial com registo NS no cadastro. '
            .'«6 meses»: baseado na data de registo do membro na app (substitua por data da carta quando existir campo). '
            .'Experiência com ministérios: declaração no formulário de voluntário.';

        return [
            'memberNs' => $memberNs,
            'sixMonthsInChurchOrLetter' => $sixMonths,
            'ministryExperienceDeclared' => $ministryExperienceDeclared,
            'notes' => $notes,
        ];
    }
}
