<?php

namespace App\Http\Controllers;

use App\Actions\Volunteers\ApplyVolunteerMinistryLeaderStatusUpdate;
use App\Actions\Volunteers\BuildVolunteerMinistryInvitePlainCopy;
use App\Actions\Volunteers\NotifyVolunteerMinistryInvitation;
use App\Models\Church;
use App\Models\ChurchSolicitation;
use App\Models\Ministry;
use App\Models\ScheduleRole;
use App\Models\Volunteer;
use App\Models\VolunteerClearanceCheck;
use App\Models\VolunteerMinistryInvitation;
use App\Models\VolunteerMinistryInvitationStatusHistory;
use App\Support\VolunteerInvitationStatusLabels;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class MyMinistryVolunteersController extends Controller
{
    private function invitationForVolunteerMinistry(int $churchId, int $volunteerId, int $ministryId): ?VolunteerMinistryInvitation
    {
        return VolunteerMinistryInvitation::query()
            ->where('church_id', $churchId)
            ->where('volunteer_id', $volunteerId)
            ->where('ministry_id', $ministryId)
            ->orderByDesc('id')
            ->first();
    }

    private function findOrCreateLeaderStatusInvitation(
        int $churchId,
        int $volunteerId,
        int $ministryId,
        ?int $invitedByUserId,
        string $defaultLeaderStatus = '',
    ): VolunteerMinistryInvitation {
        $existing = $this->invitationForVolunteerMinistry($churchId, $volunteerId, $ministryId);
        if ($existing) {
            return $existing;
        }

        return VolunteerMinistryInvitation::create([
            'church_id' => $churchId,
            'volunteer_id' => $volunteerId,
            'ministry_id' => $ministryId,
            'invited_by_user_id' => $invitedByUserId,
            'token' => VolunteerMinistryInvitation::createToken(),
            'status' => 'accepted',
            'accepted_at' => now(),
            'leader_status' => $defaultLeaderStatus !== '' ? $defaultLeaderStatus : null,
            'leader_status_set_by_user_id' => $invitedByUserId,
            'leader_status_set_at' => now(),
        ]);
    }

    private function assertLeaderMayManageMinistry(Request $request, int $churchId, int $ministryId): void
    {
        $user = $request->user();
        if ($user?->hasRole(['admin', 'super_admin'])) {
            return;
        }
        $leaderMinistryIds = $user?->ministries()
            ->where('church_id', $churchId)
            ->pluck('ministries.id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all() ?? [];
        abort_unless(in_array($ministryId, $leaderMinistryIds, true), 403);
    }

    private function applyLeaderStatusUpdate(Request $request, VolunteerMinistryInvitation $invitation): RedirectResponse
    {
        app(ApplyVolunteerMinistryLeaderStatusUpdate::class)($request, $invitation);

        return back()->with('success', 'Status atualizado.');
    }

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
                'user:id,email,photo_url',
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
            ->flatMap(function (Volunteer $v) use ($churchId) {
                return $v->ministries->map(function (Ministry $m) use ($churchId, $v) {
                    $invitation = $this->invitationForVolunteerMinistry($churchId, (int) $v->id, (int) $m->id);

                    return [
                        'id' => $invitation ? (string) $invitation->id : 'active-'.$v->id.'-'.$m->id,
                        'ministryId' => (int) $m->id,
                        'createdAt' => $invitation?->created_at?->toIso8601String(),
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
                            'photoUrl' => $v->user?->photo_url,
                        ],
                        'inviteStatus' => $invitation?->status ?? 'active_roster',
                        'inviteStatusLabel' => VolunteerInvitationStatusLabels::forInvitation($invitation),
                        'invitePlainMessage' => $invitation
                            ? BuildVolunteerMinistryInvitePlainCopy::for($invitation)
                            : null,
                        'inviteSentAt' => $invitation?->sent_at?->toIso8601String(),
                        'volunteerHasLinkedUser' => $v->user_id !== null,
                        'canSendInvite' => $invitation
                            ? ($invitation->status === 'pending' && ! $invitation->isExpired())
                            : false,
                        'leaderStatus' => $invitation?->leader_status ?? 'active',
                        'leaderNote' => $invitation?->leader_note,
                        'updateUrl' => $invitation
                            ? route('ministry-lead.my-volunteers.update', $invitation)
                            : route('ministry-lead.my-volunteers.volunteer.leader-status', [$v, $m]),
                        'historyUrl' => $invitation
                            ? route('ministry-lead.my-volunteers.history', $invitation)
                            : route('ministry-lead.my-volunteers.volunteer.history', [$v, $m]),
                        'removeFromMinistryUrl' => route('ministry-lead.my-volunteers.volunteer.remove-from-ministry', [$v, $m]),
                    ];
                });
            })
            ->sortBy([
                fn (array $row) => mb_strtolower((string) ($row['volunteer']['name'] ?? '')),
                fn (array $row) => mb_strtolower((string) ($row['ministryName'] ?? '')),
            ])
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
            ->with(['assignedVolunteer:id,name,email,phone,birth_date,has_whatsapp,has_social_networks,attendance_duration,is_official_member,member_record_at_nova_semente,member_record_church,has_previous_ministry_volunteer_experience,previous_ministry_details,professional_area,ministry_involvement,other_ministry_interest,gifts_to_develop,needs_pastoral_guidance,lgpd_data_consent,role,app_access_only,user_id', 'assignedVolunteer.user:id,photo_url'])
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
                        'photoUrl' => $s->assignedVolunteer->user?->photo_url,
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
        // Alinhado ao app e a VolunteerRequestSolicitationController: papel Spatie ou checkbox no cadastro.
        abort_unless(
            (bool) ($u->is_ministry_leader ?? false) || $u->hasRole('lider_ministerio'),
            403,
        );
    }

    public function removeVolunteerFromMinistry(Request $request, Volunteer $volunteer, Ministry $ministry): RedirectResponse
    {
        $this->canUse($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404);
        abort_unless((int) $ministry->church_id === (int) $churchId, 404);

        $acting = $request->user();
        $leaderMinistryIds = $acting?->ministries()->where('church_id', $churchId)->pluck('ministries.id')->map(fn ($id) => (int) $id)->values()->all() ?? [];
        abort_unless(in_array((int) $ministry->id, $leaderMinistryIds, true), 403);

        $ministryId = (int) $ministry->id;
        $linkedViaPivot = $volunteer->ministries()->where('ministries.id', $ministryId)->exists();
        $linkedViaInvite = VolunteerMinistryInvitation::query()
            ->where('volunteer_id', $volunteer->id)
            ->where('church_id', $churchId)
            ->where('ministry_id', $ministryId)
            ->exists();

        if (! $linkedViaPivot && ! $linkedViaInvite) {
            return back()->with('error', 'Este voluntário não está associado a este departamento.');
        }

        DB::transaction(function () use ($volunteer, $churchId, $ministryId) {
            $volunteer->ministries()->detach($ministryId);

            VolunteerMinistryInvitation::query()
                ->where('volunteer_id', $volunteer->id)
                ->where('church_id', $churchId)
                ->where('ministry_id', $ministryId)
                ->delete();

            if (Schema::hasTable('volunteer_clearance_checks')) {
                VolunteerClearanceCheck::query()
                    ->where('volunteer_id', $volunteer->id)
                    ->where('ministry_id', $ministryId)
                    ->delete();
            }
        });

        $ministryName = trim((string) $ministry->name) ?: 'departamento';

        return back()->with('success', "Voluntário removido do departamento «{$ministryName}».");
    }

    public function index(Request $request): Response
    {
        $this->canUse($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');

        $user = $request->user();
        $ministryIds = $user?->ministries()->where('church_id', $churchId)->pluck('ministries.id')->values()->all() ?? [];
        $leaderMinistries = $this->leaderMinistriesWithRoles((int) $churchId, $ministryIds);

        $invites = VolunteerMinistryInvitation::queryLatestPerVolunteerMinistry((int) $churchId, array_map('intval', $ministryIds))
            ->join('volunteers', 'volunteers.id', '=', 'volunteer_ministry_invitations.volunteer_id')
            ->orderBy('volunteers.name')
            ->orderBy('volunteer_ministry_invitations.id')
            ->select('volunteer_ministry_invitations.*')
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
                    )->with(['user:id,email,photo_url']);
                },
                'ministry:id,name',
                'church:id,ministry_invitation_intro',
            ])
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
            'canSendInvite' => $i->status === 'pending' && ! $i->isExpired(),
            'removeFromMinistryUrl' => route('ministry-lead.my-volunteers.volunteer.remove-from-ministry', [$i->volunteer_id, $i->ministry_id]),
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
                'photoUrl' => $i->volunteer?->user?->photo_url,
            ],
            // status do convite (cadastro do voluntário)
            'inviteStatus' => $i->status,
            'inviteStatusLabel' => VolunteerInvitationStatusLabels::forInvitation($i),
            'invitePlainMessage' => BuildVolunteerMinistryInvitePlainCopy::for($i),
            'inviteSentAt' => $i->sent_at?->toIso8601String(),
            'volunteerHasLinkedUser' => $i->volunteer?->user_id !== null,
            // status interno do líder
            'leaderStatus' => $i->leader_status,
            'leaderNote' => $i->leader_note,
            'updateUrl' => route('ministry-lead.my-volunteers.update', $i),
            'historyUrl' => route('ministry-lead.my-volunteers.history', $i),
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
            return back()->with('error', 'Só é possível enviar o convite enquanto o cadastro do voluntário estiver pendente.');
        }
        if ($invitation->isExpired()) {
            return back()->with('error', 'Este convite expirou. Peça à secretaria um novo encaminhamento.');
        }

        $wasSent = $invitation->sent_at !== null;

        $channels = ['email'];
        if ($invitation->volunteer?->user_id) {
            $channels[] = 'inbox';
        }

        $sent = app(NotifyVolunteerMinistryInvitation::class)($invitation, $channels);
        if (! $sent) {
            return back()->with('error', 'Não foi possível enviar o convite (verifique o e-mail do voluntário e as preferências de notificação no app).');
        }

        return back()->with('success', $wasSent ? 'Convite reenviado.' : 'Convite enviado ao voluntário.');
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

    public function updateVolunteerLeaderStatus(Request $request, Volunteer $volunteer, Ministry $ministry): RedirectResponse
    {
        $this->canUse($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404);
        abort_unless((int) $ministry->church_id === (int) $churchId, 404);
        $this->assertLeaderMayManageMinistry($request, (int) $churchId, (int) $ministry->id);

        abort_unless(
            $volunteer->ministries()->where('ministries.id', (int) $ministry->id)->exists(),
            404,
            'Voluntário não está neste departamento.'
        );

        $invitation = $this->findOrCreateLeaderStatusInvitation(
            (int) $churchId,
            (int) $volunteer->id,
            (int) $ministry->id,
            $request->user()?->id,
            'active',
        );

        return $this->applyLeaderStatusUpdate($request, $invitation);
    }

    public function update(Request $request, VolunteerMinistryInvitation $invitation): RedirectResponse
    {
        $this->canUse($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404);
        abort_unless((int) $invitation->church_id === (int) $churchId, 404);

        $this->assertLeaderMayManageMinistry($request, (int) $churchId, (int) $invitation->ministry_id);

        return $this->applyLeaderStatusUpdate($request, $invitation);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function leaderStatusHistoryPayload(VolunteerMinistryInvitation $invitation): array
    {
        return $invitation->leaderStatusHistory()
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

        return response()->json(['history' => $this->leaderStatusHistoryPayload($invitation)]);
    }

    public function volunteerMinistryHistory(Request $request, Volunteer $volunteer, Ministry $ministry): JsonResponse
    {
        $this->canUse($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404);
        abort_unless((int) $ministry->church_id === (int) $churchId, 404);
        $this->assertLeaderMayManageMinistry($request, (int) $churchId, (int) $ministry->id);

        $invitation = $this->invitationForVolunteerMinistry((int) $churchId, (int) $volunteer->id, (int) $ministry->id);
        if (! $invitation) {
            return response()->json(['history' => []]);
        }

        return response()->json(['history' => $this->leaderStatusHistoryPayload($invitation)]);
    }
}
