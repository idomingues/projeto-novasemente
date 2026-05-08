<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\ChurchSolicitation;
use App\Models\Ministry;
use App\Models\ScheduleRole;
use App\Models\Volunteer;
use App\Models\VolunteerLeaderNote;
use App\Models\VolunteerMinistryInvitation;
use App\Models\VolunteerMinistryInvitationStatusHistory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class MyMinistryVolunteersController extends Controller
{
    /**
     * @param  list<int>  $leaderMinistryIds
     * @return list<array<string,mixed>>
     */
    private function leaderActiveVolunteerRows(int $churchId, array $leaderMinistryIds): array
    {
        if ($leaderMinistryIds === []) {
            return [];
        }

        return Volunteer::query()
            ->where('active', true)
            ->whereHas('ministries', fn ($q) => $q->where('ministries.church_id', $churchId)->whereIn('ministries.id', $leaderMinistryIds))
            ->with([
                'ministries' => fn ($q) => $q->where('ministries.church_id', $churchId)->whereIn('ministries.id', $leaderMinistryIds)->select('ministries.id', 'ministries.name'),
            ])
            ->orderBy('name')
            ->get([
                'id',
                'name',
                'email',
                'phone',
                'birth_date',
                'has_whatsapp',
                'has_social_networks',
                'attendance_duration',
                'is_official_member',
                'member_record_at_nova_semente',
                'member_record_church',
                'has_previous_ministry_volunteer_experience',
                'previous_ministry_details',
                'professional_area',
                'ministry_involvement',
                'other_ministry_interest',
                'gifts_to_develop',
                'needs_pastoral_guidance',
                'lgpd_data_consent',
                'role',
                'app_access_only',
            ])
            ->flatMap(function (Volunteer $v) {
                return $v->ministries->map(fn (Ministry $m) => [
                    'id' => 'active-'.$v->id.'-'.$m->id,
                    'ministryId' => (int) $m->id,
                    'createdAt' => null,
                    'ministryName' => (string) $m->name,
                    'volunteer' => [
                        'id' => (int) $v->id,
                        'name' => $v->name,
                        'email' => $v->email,
                        'phone' => $v->phone,
                        'birthDate' => $v->birth_date?->toDateString(),
                        'hasWhatsapp' => $v->has_whatsapp,
                        'hasSocialNetworks' => $v->has_social_networks,
                        'attendanceDuration' => $v->attendance_duration,
                        'isOfficialMember' => $v->is_official_member,
                        'memberRecordAtNovaSemente' => $v->member_record_at_nova_semente,
                        'memberRecordChurch' => $v->member_record_church,
                        'hasPreviousMinistryVolunteerExperience' => $v->has_previous_ministry_volunteer_experience,
                        'previousMinistryDetails' => $v->previous_ministry_details,
                        'professionalArea' => $v->professional_area,
                        'ministryInvolvement' => $v->ministry_involvement,
                        'otherMinistryInterest' => $v->other_ministry_interest,
                        'giftsToDevelop' => $v->gifts_to_develop,
                        'needsPastoralGuidance' => $v->needs_pastoral_guidance,
                        'lgpdDataConsent' => $v->lgpd_data_consent,
                        'role' => $v->role,
                        'appAccessOnly' => (bool) ($v->app_access_only ?? false),
                    ],
                    'inviteStatus' => 'active_roster',
                    'leaderStatus' => 'active',
                    'leaderNote' => null,
                    'updateUrl' => null,
                ]);
            })
            ->values()
            ->all();
    }

    /**
     * @return list<array{id:int,name:string,schedule_roles:list<array{id:int,name:string}>}>
     */
    private function leaderMinistriesWithRoles(int $churchId, array $leaderMinistryIds): array
    {
        if ($leaderMinistryIds === []) {
            return [];
        }

        $ministries = Ministry::query()
            ->where('church_id', $churchId)
            ->whereIn('id', array_map('intval', $leaderMinistryIds))
            ->orderBy('name')
            ->get(['id', 'name']);

        if ($ministries->isEmpty()) {
            return [];
        }

        $roles = ScheduleRole::query()
            ->whereIn('ministry_id', $ministries->pluck('id')->all())
            ->orderBy('name')
            ->get(['id', 'name', 'ministry_id'])
            ->groupBy('ministry_id');

        return $ministries->map(function (Ministry $m) use ($roles): array {
            $items = $roles->get($m->id, collect());

            return [
                'id' => (int) $m->id,
                'name' => (string) $m->name,
                'schedule_roles' => $items->map(fn (ScheduleRole $r) => [
                    'id' => (int) $r->id,
                    'name' => (string) $r->name,
                ])->values()->all(),
            ];
        })->values()->all();
    }

    /**
     * @return list<array<string,mixed>>
     */
    private function leaderVolunteerRequestRows(int $churchId, int $leaderUserId): array
    {
        return ChurchSolicitation::query()
            ->where('church_id', $churchId)
            ->where('type', MobileChurchSolicitationController::TYPE_VOLUNTEER_REQUEST)
            ->where('user_id', $leaderUserId)
            ->with(['assignedVolunteer:id,name,email,phone,birth_date,has_whatsapp,has_social_networks,attendance_duration,is_official_member,member_record_at_nova_semente,member_record_church,has_previous_ministry_volunteer_experience,previous_ministry_details,professional_area,ministry_involvement,other_ministry_interest,gifts_to_develop,needs_pastoral_guidance,lgpd_data_consent,role,app_access_only'])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(100)
            ->get(['id', 'subject', 'message', 'status', 'created_at', 'completed_at', 'assigned_volunteer_id', 'meta'])
            ->map(function (ChurchSolicitation $s): array {
                $meta = is_array($s->meta) ? $s->meta : [];
                $attachedVolunteerName = trim((string) ($s->assignedVolunteer?->name ?? ($meta['fulfilled_volunteer_name'] ?? '')));
                if ($attachedVolunteerName === '') {
                    $attachedVolunteerName = null;
                }
                $attachedVolunteerEmail = trim((string) ($s->assignedVolunteer?->email ?? ($meta['fulfilled_volunteer_email'] ?? '')));
                if ($attachedVolunteerEmail === '') {
                    $attachedVolunteerEmail = null;
                }
                $attachedVolunteerProfile = null;
                if ($s->assignedVolunteer) {
                    $attachedVolunteerProfile = [
                        'id' => (int) $s->assignedVolunteer->id,
                        'name' => $s->assignedVolunteer->name,
                        'email' => $s->assignedVolunteer->email,
                        'phone' => $s->assignedVolunteer->phone,
                        'birthDate' => $s->assignedVolunteer->birth_date?->toDateString(),
                        'hasWhatsapp' => $s->assignedVolunteer->has_whatsapp,
                        'hasSocialNetworks' => $s->assignedVolunteer->has_social_networks,
                        'attendanceDuration' => $s->assignedVolunteer->attendance_duration,
                        'isOfficialMember' => $s->assignedVolunteer->is_official_member,
                        'memberRecordAtNovaSemente' => $s->assignedVolunteer->member_record_at_nova_semente,
                        'memberRecordChurch' => $s->assignedVolunteer->member_record_church,
                        'hasPreviousMinistryVolunteerExperience' => $s->assignedVolunteer->has_previous_ministry_volunteer_experience,
                        'previousMinistryDetails' => $s->assignedVolunteer->previous_ministry_details,
                        'professionalArea' => $s->assignedVolunteer->professional_area,
                        'ministryInvolvement' => $s->assignedVolunteer->ministry_involvement,
                        'otherMinistryInterest' => $s->assignedVolunteer->other_ministry_interest,
                        'giftsToDevelop' => $s->assignedVolunteer->gifts_to_develop,
                        'needsPastoralGuidance' => $s->assignedVolunteer->needs_pastoral_guidance,
                        'lgpdDataConsent' => $s->assignedVolunteer->lgpd_data_consent,
                        'role' => $s->assignedVolunteer->role,
                        'appAccessOnly' => (bool) ($s->assignedVolunteer->app_access_only ?? false),
                    ];
                }

                return [
                    'id' => (int) $s->id,
                    'subject' => (string) $s->subject,
                    'status' => (string) $s->status,
                    'status_label' => MobileChurchSolicitationController::statusLabel((string) $s->status),
                    'message_preview' => Str::limit(trim((string) $s->message), 140),
                    'created_at' => $s->created_at?->toIso8601String(),
                    'completed_at' => $s->completed_at?->toIso8601String(),
                    'attached_volunteer_name' => $attachedVolunteerName,
                    'attached_volunteer_email' => $attachedVolunteerEmail,
                    'attached_volunteer_profile' => $attachedVolunteerProfile,
                ];
            })
            ->values()
            ->all();
    }

    private function churchId(Request $request): ?int
    {
        return Church::resolveWorkingId($request);
    }

    private function canUse(Request $request): void
    {
        $u = $request->user();
        abort_unless($u, 401);
        if ($u->hasRole(['admin', 'super_admin'])) {
            return;
        }
        // Líder é definido por checkbox no cadastro do usuário.
        abort_unless((bool) ($u->is_ministry_leader ?? false), 403);
    }

    public function index(Request $request): Response
    {
        $this->canUse($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');

        $user = $request->user();
        $ministryIds = $user?->ministries()->where('church_id', $churchId)->pluck('ministries.id')->values()->all() ?? [];
        $leaderMinistries = $this->leaderMinistriesWithRoles((int) $churchId, $ministryIds);

        $invites = VolunteerMinistryInvitation::query()
            ->where('church_id', $churchId)
            ->whereIn('ministry_id', $ministryIds)
            ->with(['volunteer:id,name,email,phone,birth_date,has_whatsapp,has_social_networks,attendance_duration,is_official_member,member_record_at_nova_semente,member_record_church,has_previous_ministry_volunteer_experience,previous_ministry_details,professional_area,ministry_involvement,other_ministry_interest,gifts_to_develop,needs_pastoral_guidance,lgpd_data_consent,role,app_access_only', 'ministry:id,name'])
            ->orderByDesc('created_at')
            ->paginate(25)
            ->withQueryString();

        $inviteRows = $invites->getCollection()->map(fn (VolunteerMinistryInvitation $i) => [
                'id' => $i->id,
                'ministryId' => (int) $i->ministry_id,
                'createdAt' => $i->created_at?->toIso8601String(),
                'ministryName' => $i->ministry?->name,
                'volunteer' => [
                    'id' => $i->volunteer_id,
                    'name' => $i->volunteer?->name,
                    'email' => $i->volunteer?->email,
                    'phone' => $i->volunteer?->phone,
                    'birthDate' => $i->volunteer?->birth_date?->toDateString(),
                    'hasWhatsapp' => $i->volunteer?->has_whatsapp,
                    'hasSocialNetworks' => $i->volunteer?->has_social_networks,
                    'attendanceDuration' => $i->volunteer?->attendance_duration,
                    'isOfficialMember' => $i->volunteer?->is_official_member,
                    'memberRecordAtNovaSemente' => $i->volunteer?->member_record_at_nova_semente,
                    'memberRecordChurch' => $i->volunteer?->member_record_church,
                    'hasPreviousMinistryVolunteerExperience' => $i->volunteer?->has_previous_ministry_volunteer_experience,
                    'previousMinistryDetails' => $i->volunteer?->previous_ministry_details,
                    'professionalArea' => $i->volunteer?->professional_area,
                    'ministryInvolvement' => $i->volunteer?->ministry_involvement,
                    'otherMinistryInterest' => $i->volunteer?->other_ministry_interest,
                    'giftsToDevelop' => $i->volunteer?->gifts_to_develop,
                    'needsPastoralGuidance' => $i->volunteer?->needs_pastoral_guidance,
                    'lgpdDataConsent' => $i->volunteer?->lgpd_data_consent,
                    'role' => $i->volunteer?->role,
                    'appAccessOnly' => (bool) ($i->volunteer?->app_access_only ?? false),
                ],
                // status do convite (resposta do voluntário ao link público)
                'inviteStatus' => $i->status,
                // status interno do líder
                'leaderStatus' => $i->leader_status,
                'leaderNote' => $i->leader_note,
                'updateUrl' => route('ministry-lead.my-volunteers.update', $i),
            ])->values();
        $invites->setCollection($inviteRows);

        $invitePairs = $inviteRows
            ->map(fn (array $r) => ((int) ($r['volunteer']['id'] ?? 0)).'-'.((int) ($r['ministryId'] ?? 0)))
            ->filter(fn (string $pair) => $pair !== '0-0')
            ->values()
            ->all();

        $activeVolunteers = collect($this->leaderActiveVolunteerRows((int) $churchId, array_map('intval', $ministryIds)))
            ->reject(fn (array $r) => in_array(((int) ($r['volunteer']['id'] ?? 0)).'-'.((int) ($r['ministryId'] ?? 0)), $invitePairs, true))
            ->values()
            ->all();

        return Inertia::render('MinistryLeadVolunteers/MyVolunteers', [
            'invitations' => $invites,
            'activeVolunteers' => $activeVolunteers,
            'requestRows' => $this->leaderVolunteerRequestRows((int) $churchId, (int) $user?->id),
            'requestMinistries' => $leaderMinistries,
            'requestStoreUrl' => route('ministry-lead.volunteer-requests.store'),
        ]);
    }

    public function update(Request $request, VolunteerMinistryInvitation $invitation): RedirectResponse
    {
        $this->canUse($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404);
        abort_unless((int) $invitation->church_id === (int) $churchId, 404);

        $user = $request->user();
        $ministryIds = $user?->ministries()->where('church_id', $churchId)->pluck('ministries.id')->values()->all() ?? [];
        abort_unless(in_array((int) $invitation->ministry_id, array_map('intval', $ministryIds), true), 403);

        $fromStatus = $invitation->leader_status;

        $valid = $request->validate([
            'leader_status' => ['nullable', 'string', Rule::in(['denied', 'training', 'active'])],
            'leader_note' => ['nullable', 'string', 'max:5000'],
        ]);

        if (($valid['leader_status'] ?? null) === 'denied') {
            $note = trim((string) ($valid['leader_note'] ?? ''));
            abort_unless(mb_strlen($note) >= 5, 422, 'Mensagem obrigatória para recusar.');
        }

        $invitation->forceFill([
            'leader_status' => $valid['leader_status'] ?? null,
            // mensagem só faz sentido em "Recusar"; nos demais estados limpamos para não confundir
            'leader_note' => ($valid['leader_status'] ?? null) === 'denied' ? ($valid['leader_note'] ?? null) : null,
            'leader_status_set_by_user_id' => $user?->id,
            'leader_status_set_at' => now(),
        ])->save();

        // Histórico (status anterior/novo, data/hora e usuário).
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

        // Para o responsável do voluntariado “ler”: registamos também como nota interna do voluntário.
        if (($valid['leader_status'] ?? null) === 'denied') {
            $ministryName = $invitation->ministry?->name ?? 'Departamento';
            $body = "Recusado pelo líder do departamento «{$ministryName}»:\n\n".trim((string) ($valid['leader_note'] ?? ''));
            VolunteerLeaderNote::create([
                'volunteer_id' => $invitation->volunteer_id,
                'church_id' => $churchId,
                'user_id' => $user?->id,
                'body' => $body,
            ]);
        }

        // Ao marcar como “Treinamento” ou “Atuante”, garantimos vínculo do voluntário ao departamento.
        if (in_array(($valid['leader_status'] ?? null), ['training', 'active'], true) && $invitation->volunteer && $invitation->ministry) {
            $invitation->volunteer->ministries()->syncWithoutDetaching([$invitation->ministry_id]);
        }

        return back()->with('success', 'Status atualizado.');
    }

    public function history(Request $request, VolunteerMinistryInvitation $invitation): JsonResponse
    {
        $this->canUse($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404);
        abort_unless((int) $invitation->church_id === (int) $churchId, 404);

        $user = $request->user();
        if (! $user?->hasRole(['admin', 'super_admin'])) {
            $ministryIds = $user?->ministries()->where('church_id', $churchId)->pluck('ministries.id')->values()->all() ?? [];
            abort_unless(in_array((int) $invitation->ministry_id, array_map('intval', $ministryIds), true), 403);
        }

        $rows = $invitation->leaderStatusHistory()
            ->with('changedBy:id,name')
            ->limit(50)
            ->get()
            ->map(fn (VolunteerMinistryInvitationStatusHistory $h) => [
                'id' => $h->id,
                'fromStatus' => $h->from_status,
                'toStatus' => $h->to_status,
                'note' => $h->note,
                'changedAt' => $h->created_at?->toIso8601String(),
                'changedBy' => $h->changedBy?->name,
            ])
            ->values()
            ->all();

        return response()->json(['history' => $rows]);
    }
}

