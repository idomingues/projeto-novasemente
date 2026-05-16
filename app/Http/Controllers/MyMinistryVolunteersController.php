<?php

namespace App\Http\Controllers;

use App\Actions\Volunteers\SendVolunteerMinistryInvitationEmail;
use App\Models\Church;
use App\Models\ChurchSolicitation;
use App\Models\Ministry;
use App\Models\ScheduleRole;
use App\Models\User;
use App\Models\Volunteer;
use App\Models\VolunteerLeaderNote;
use App\Models\VolunteerMinistryInvitation;
use App\Models\VolunteerMinistryInvitationStatusHistory;
use App\Support\VolunteerChurchRosterBuilder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
                'user:id,email',
            ])
            ->orderBy('name')
            ->get([
                'id',
                'user_id',
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
                        'linkedUser' => $v->user ? ['id' => (int) $v->user->id, 'email' => $v->user->email] : null,
                    ],
                    'inviteStatus' => 'active_roster',
                    'leaderStatus' => 'active',
                    'leaderNote' => null,
                    'updateUrl' => null,
                    'destroyVolunteerUrl' => route('ministry-lead.my-volunteers.volunteer.destroy', $v),
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

    /**
     * Utilizadores com permissão de gestão de voluntários ou convites na página do líder: mesma visibilidade do quadro da igreja.
     * Líder de ministério: só pode apagar quando o voluntário só está ligado nesta igreja a ministérios que o líder coordena,
     * ou quando ainda só existe fluxo por convite nesses ministérios (sem vínculos noutros departamentos da igreja).
     */
    private function mayDeleteVolunteerFromMyMinistryPage(Request $request, Volunteer $volunteer, int $churchId, array $leaderMinistryIds): bool
    {
        $user = $request->user();
        if ($user !== null && ($user->can('volunteers.manage') || $user->hasRole(['admin', 'super_admin']))) {
            return VolunteerChurchRosterBuilder::volunteersVisibleInChurchQuery($churchId)
                ->whereKey($volunteer->getKey())
                ->exists();
        }

        return $this->ministryLeadCoversVolunteerInChurch($volunteer, $churchId, $leaderMinistryIds);
    }

    /**
     * @param  list<int|string>  $leaderMinistryIds
     */
    private function ministryLeadCoversVolunteerInChurch(Volunteer $volunteer, int $churchId, array $leaderMinistryIds): bool
    {
        $leaderMinistryIds = array_values(array_unique(array_map('intval', $leaderMinistryIds)));
        if ($leaderMinistryIds === []) {
            return false;
        }

        $volunteerMinistryIdsInChurch = $volunteer->ministries()
            ->where('ministries.church_id', $churchId)
            ->pluck('ministries.id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        if ($volunteerMinistryIdsInChurch->isEmpty()) {
            return VolunteerMinistryInvitation::query()
                ->where('volunteer_id', $volunteer->id)
                ->where('church_id', $churchId)
                ->whereIn('ministry_id', $leaderMinistryIds)
                ->exists();
        }

        foreach ($volunteerMinistryIdsInChurch as $mid) {
            if (! in_array($mid, $leaderMinistryIds, true)) {
                return false;
            }
        }

        return true;
    }

    public function destroyVolunteer(Request $request, Volunteer $volunteer): RedirectResponse
    {
        $this->canUse($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404);

        $acting = $request->user();
        $leaderMinistryIds = $acting?->ministries()->where('church_id', $churchId)->pluck('ministries.id')->values()->all() ?? [];

        $volunteer->loadMissing(['ministries', 'user']);
        if (! $this->mayDeleteVolunteerFromMyMinistryPage($request, $volunteer, (int) $churchId, $leaderMinistryIds)) {
            return back()->with(
                'error',
                'Não é possível apagar este voluntário a partir daqui: existe vínculo a outro ministério desta igreja que não coordena ou o registo está fora do seu alcance. Peça ajuda à secretaria.'
            );
        }

        $deleteLinkedUser = $request->boolean('delete_linked_user');
        $linkedUser = $deleteLinkedUser ? User::query()->find($volunteer->user_id) : null;

        if ($linkedUser !== null) {
            if ((int) $linkedUser->id === (int) $acting?->id) {
                return back()->with('error', 'Não pode apagar a sua própria conta desta forma.');
            }
            if ($linkedUser->canAccessAdminMenu()) {
                return back()->with('error', 'Não é possível apagar este utilizador: tem acesso ao painel de equipa.');
            }
        }

        DB::transaction(function () use ($volunteer, $linkedUser) {
            $volunteer->delete();
            if ($linkedUser) {
                $linkedUser->delete();
            }
        });

        $message = ($deleteLinkedUser && $linkedUser)
            ? 'Voluntário e conta de utilizador removidos com sucesso.'
            : 'Voluntário removido com sucesso.';

        return back()->with('success', $message);
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
            ->with([
                'volunteer' => function ($q): void {
                    $q->select(
                        'id',
                        'name',
                        'email',
                        'user_id',
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
                        'app_access_only'
                    )->with(['user:id,email']);
                },
                'ministry:id,name',
                'church:id,ministry_invitation_intro',
            ])
            ->orderByDesc('created_at')
            ->paginate(25)
            ->withQueryString();

        $inviteRows = $invites->getCollection()->map(fn (VolunteerMinistryInvitation $i) => [
            'id' => $i->id,
            'ministryId' => (int) $i->ministry_id,
            'createdAt' => $i->created_at?->toIso8601String(),
            'ministryName' => $i->ministry?->name,
            'invitePublicUrl' => route('volunteers.ministry-invite.show', ['token' => $i->token], true),
            'inviteRegisterUrl' => (trim((string) ($i->volunteer?->email ?? '')) !== '' && $i->status === 'pending' && ! $i->isExpired() && $i->volunteer?->user_id === null)
                ? route('register', [
                    'ministry_invite_token' => $i->token,
                    'email' => trim((string) $i->volunteer->email),
                ])
                : null,
            'inviteResendEmailUrl' => route('ministry-lead.my-volunteers.invitation.resend-email', $i),
            'inviteIntroSaveUrl' => route('ministry-lead.my-volunteers.invitation.intro', $i),
            'inviteIntroMessage' => $i->intro_message,
            'canResendInvite' => $i->status === 'pending' && ! $i->isExpired(),
            'destroyVolunteerUrl' => route('ministry-lead.my-volunteers.volunteer.destroy', $i->volunteer_id),
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
                'linkedUser' => $i->volunteer?->user ? ['id' => (int) $i->volunteer->user->id, 'email' => $i->volunteer->user->email] : null,
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

        $churchIntro = Church::query()->whereKey((int) $churchId)->value('ministry_invitation_intro');

        return Inertia::render('MinistryLeadVolunteers/MyVolunteers', [
            'invitations' => $invites,
            'activeVolunteers' => $activeVolunteers,
            'requestRows' => $this->leaderVolunteerRequestRows((int) $churchId, (int) $user?->id),
            'requestMinistries' => $leaderMinistries,
            'requestStoreUrl' => route('ministry-lead.volunteer-requests.store'),
            'churchMinistryInvitationIntro' => $churchIntro ? (string) $churchIntro : null,
        ]);
    }

    public function resendInvitationEmail(Request $request, VolunteerMinistryInvitation $invitation): RedirectResponse
    {
        $this->canUse($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404);
        abort_unless((int) $invitation->church_id === (int) $churchId, 404);

        $user = $request->user();
        $ministryIds = $user?->ministries()->where('church_id', $churchId)->pluck('ministries.id')->values()->all() ?? [];
        abort_unless(in_array((int) $invitation->ministry_id, array_map('intval', $ministryIds), true), 403);

        if ($invitation->status !== 'pending') {
            return back()->with('error', 'Só é possível reenviar enquanto o convite estiver pendente de resposta.');
        }
        if ($invitation->isExpired()) {
            return back()->with('error', 'Este convite expirou. Peça à secretaria um novo encaminhamento.');
        }

        $sent = app(SendVolunteerMinistryInvitationEmail::class)($invitation);
        if (! $sent) {
            return back()->with('error', 'Não há e-mail no cadastro do voluntário (nem no utilizador ligado) para enviar o convite.');
        }

        return back()->with('success', 'E-mail do convite enviado.');
    }

    public function updateInvitationIntro(Request $request, VolunteerMinistryInvitation $invitation): RedirectResponse
    {
        $this->canUse($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404);
        abort_unless((int) $invitation->church_id === (int) $churchId, 404);

        $user = $request->user();
        $ministryIds = $user?->ministries()->where('church_id', $churchId)->pluck('ministries.id')->values()->all() ?? [];
        abort_unless(in_array((int) $invitation->ministry_id, array_map('intval', $ministryIds), true), 403);

        $valid = $request->validate([
            'intro_message' => ['nullable', 'string', 'max:5000'],
        ]);
        $raw = $valid['intro_message'] ?? null;
        $trimmed = is_string($raw) ? trim($raw) : '';
        $invitation->forceFill([
            'intro_message' => $trimmed === '' ? null : $trimmed,
        ])->save();

        return back()->with('success', 'Texto do convite atualizado.');
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
