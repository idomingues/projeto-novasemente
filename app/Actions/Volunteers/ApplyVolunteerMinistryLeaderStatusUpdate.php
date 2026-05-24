<?php

namespace App\Actions\Volunteers;

use App\Models\VolunteerLeaderNote;
use App\Models\VolunteerMinistryInvitation;
use App\Models\VolunteerMinistryInvitationStatusHistory;
use App\Support\VolunteerPipelineBootstrap;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ApplyVolunteerMinistryLeaderStatusUpdate
{
    /**
     * @return array{leader_status: string|null, leader_note: string|null}
     */
    public function __invoke(Request $request, VolunteerMinistryInvitation $invitation): array
    {
        $churchId = (int) $invitation->church_id;
        $user = $request->user();
        $invitation->loadMissing(['ministry', 'volunteer']);

        $fromStatus = $invitation->leader_status;

        $request->merge([
            'leader_status' => $request->input('leader_status') === '' ? null : $request->input('leader_status'),
        ]);

        $valid = $request->validate([
            'leader_status' => ['nullable', 'string', Rule::in(['denied', 'reviewing', 'training', 'active'])],
            'leader_note' => ['nullable', 'string', 'max:5000'],
        ]);

        if (($valid['leader_status'] ?? null) === 'denied') {
            $note = trim((string) ($valid['leader_note'] ?? ''));
            if (mb_strlen($note) < 5) {
                throw ValidationException::withMessages([
                    'leader_note' => ['Mensagem obrigatória para recusar (mínimo 5 caracteres).'],
                ]);
            }
        }

        $invitation->forceFill([
            'leader_status' => $valid['leader_status'] ?? null,
            'leader_note' => ($valid['leader_status'] ?? null) === 'denied' ? ($valid['leader_note'] ?? null) : null,
            'leader_status_set_by_user_id' => $user?->id,
            'leader_status_set_at' => now(),
        ])->save();

        if ($fromStatus !== ($invitation->leader_status ?? null) || (($valid['leader_status'] ?? null) === 'denied')) {
            VolunteerMinistryInvitationStatusHistory::create([
                'invitation_id' => $invitation->id,
                'church_id' => $invitation->church_id,
                'ministry_id' => $invitation->ministry_id,
                'volunteer_id' => $invitation->volunteer_id,
                'changed_by_user_id' => $user?->id,
                'from_status' => $fromStatus,
                'to_status' => $invitation->leader_status,
                'note' => ($invitation->leader_status === 'denied') ? $invitation->leader_note : null,
            ]);
        }

        if (($valid['leader_status'] ?? null) === 'denied') {
            $ministryName = $invitation->ministry?->name ?? 'Departamento';
            $body = "Recusado pelo líder do departamento «{$ministryName}»:\n\n".trim((string) ($valid['leader_note'] ?? ''));
            VolunteerLeaderNote::create([
                'volunteer_id' => $invitation->volunteer_id,
                'church_id' => $churchId,
                'user_id' => $user?->id,
                'body' => $body,
            ]);

            if ($invitation->volunteer) {
                VolunteerPipelineBootstrap::moveVolunteerToStageByNormalizedName(
                    $invitation->volunteer,
                    $churchId,
                    VolunteerPipelineBootstrap::STAGE_RECUSADO_LIDER
                );
            }
        }

        if (in_array(($valid['leader_status'] ?? null), ['training', 'active'], true) && $invitation->volunteer && $invitation->ministry) {
            $invitation->volunteer->ministries()->syncWithoutDetaching([$invitation->ministry_id]);
        }

        return [
            'leader_status' => $invitation->leader_status,
            'leader_note' => $invitation->leader_note,
        ];
    }
}
