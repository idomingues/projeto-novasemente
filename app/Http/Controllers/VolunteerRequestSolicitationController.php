<?php

namespace App\Http\Controllers;

use App\Actions\Volunteers\CreateAndNotifyVolunteerMinistryInvitation;
use App\Http\Requests\AttachVolunteerToVolunteerRequest;
use App\Http\Requests\StoreVolunteerRequestSolicitationRequest;
use App\Http\Requests\UpdateVolunteerRequestSolicitationRequest;
use App\Models\Church;
use App\Models\ChurchSolicitation;
use App\Models\ChurchSolicitationMessage;
use App\Models\Ministry;
use App\Models\ScheduleRole;
use App\Models\User;
use App\Models\Volunteer;
use App\Models\VolunteerMinistryInvitation;
use App\Models\VolunteerMinistryInvitationStatusHistory;
use App\Services\SolicitationChatNotifier;
use App\Support\ChurchSolicitationModalPayloadPresenter;
use App\Support\VolunteerChurchRosterBuilder;
use App\Support\VolunteerLeadRosterFilters;
use App\Support\VolunteerPipelineBootstrap;
use App\Support\VolunteerQuestionnaireProfilePayload;
use App\Support\VolunteerRequestStaffRoutes;
use App\Support\VolunteerRequestVolunteerSuggester;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class VolunteerRequestSolicitationController extends Controller
{
    private function churchId(Request $request): ?int
    {
        return Church::resolveWorkingId($request);
    }

    private function canUseLeaderArea(Request $request): void
    {
        $u = $request->user();
        abort_unless($u, 401);
        if ($u->hasRole(['admin', 'super_admin'])) {
            return;
        }
        abort_unless((bool) ($u->is_ministry_leader ?? false) || $u->hasRole('lider_ministerio'), 403);
    }

    private function canManageSolicitations(Request $request): void
    {
        $u = $request->user();
        abort_unless($u, 401);
        if ($u->hasAnyRole(['super_admin', 'admin'])) {
            return;
        }
        abort_unless($u->can('solicitations.manage'), 403);
    }

    /**
     * @return array<int, array{id: int, name: string, schedule_roles: array<int, array{id: int, name: string}>}>
     */
    private function ministriesWithRolesForChurch(int $churchId, ?array $onlyMinistryIds = null): array
    {
        $q = Ministry::query()->where('church_id', $churchId)->orderBy('name');
        if ($onlyMinistryIds !== null && $onlyMinistryIds !== []) {
            $q->whereIn('id', $onlyMinistryIds);
        }
        $ministries = $q->get(['id', 'name']);
        if ($ministries->isEmpty()) {
            return [];
        }
        $ids = $ministries->pluck('id')->all();
        $roles = ScheduleRole::query()
            ->whereIn('ministry_id', $ids)
            ->orderBy('name')
            ->get(['id', 'name', 'ministry_id'])
            ->groupBy('ministry_id');

        return $ministries
            ->map(function (Ministry $m) use ($roles) {
                $list = $roles->get($m->id, collect());

                return [
                    'id' => (int) $m->id,
                    'name' => (string) $m->name,
                    'schedule_roles' => $list->map(fn (ScheduleRole $r) => [
                        'id' => (int) $r->id,
                        'name' => (string) $r->name,
                    ])->values()->all(),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function volunteerRequestRowsForChurch(
        int $churchId,
        ?int $onlyUserId,
        bool $includeRequesterName,
        User $authUser,
        string $accessMode,
        bool $showArchived = false,
    ): array {
        $q = ChurchSolicitation::query()
            ->where('church_id', $churchId)
            ->where('type', MobileChurchSolicitationController::TYPE_VOLUNTEER_REQUEST)
            ->orderBy('created_at')
            ->orderBy('id')
            ->limit(100);

        if ($showArchived) {
            $q->whereNotNull('staff_archived_at');
        } else {
            $q->whereNull('staff_archived_at');
        }

        if ($onlyUserId !== null) {
            $q->where('user_id', $onlyUserId);
        }

        if ($includeRequesterName) {
            $q->with(['user:id,name']);
        }
        $q->with(['assignedVolunteer:id,name,email,phone,birth_date,has_whatsapp,has_social_networks,attendance_duration,is_official_member,member_record_at_nova_semente,member_record_church,has_previous_ministry_volunteer_experience,previous_ministry_details,professional_area,ministry_involvement,other_ministry_interest,gifts_to_develop,needs_pastoral_guidance,lgpd_data_consent,role,app_access_only']);

        return $q
            ->get(['id', 'subject', 'message', 'status', 'created_at', 'user_id', 'meta', 'assigned_volunteer_id', 'completed_at'])
            ->map(function (ChurchSolicitation $s) use ($includeRequesterName, $authUser, $accessMode, $showArchived) {
                $meta = $s->meta ?? [];
                $ministryIdMeta = isset($meta['ministry_id']) ? (int) $meta['ministry_id'] : null;
                $scheduleRoleIdMeta = isset($meta['schedule_role_id']) ? (int) $meta['schedule_role_id'] : null;

                $isPending = $s->status === 'pending';
                if ($accessMode === 'leader') {
                    $canMutate = $isPending && (int) $s->user_id === (int) $authUser->id;
                } else {
                    $canMutate = $authUser->can('manageVolunteerRequestAsStaff', $s);
                }

                $updateRoute = $accessMode === 'leader'
                    ? 'ministry-lead.volunteer-requests.update'
                    : 'volunteer-requests.staff.update';
                $destroyRoute = $accessMode === 'leader'
                    ? 'ministry-lead.volunteer-requests.destroy'
                    : 'volunteer-requests.staff.destroy';

                $hasMinistry = $ministryIdMeta !== null && $ministryIdMeta > 0;
                $alreadyFulfilled = ! empty($meta['fulfilled_invitation_id']);
                $canAttach = $accessMode === 'staff'
                    && $isPending
                    && $hasMinistry
                    && ! $alreadyFulfilled
                    && $authUser->can('manageVolunteerRequestAsStaff', $s);
                $canDetach = $accessMode === 'staff'
                    && $s->status === 'completed'
                    && $s->assigned_volunteer_id !== null
                    && $authUser->can('manageVolunteerRequestAsStaff', $s);

                $batchTotal = isset($meta['batch_total']) ? max(1, (int) $meta['batch_total']) : 1;
                $batchIndex = isset($meta['batch_index']) ? max(1, (int) $meta['batch_index']) : 1;
                $batchSlotLabel = $batchTotal > 1 ? $batchIndex.' / '.$batchTotal : null;
                $attachedVolunteerName = trim((string) ($s->assignedVolunteer?->name ?? ''));
                if ($attachedVolunteerName === '') {
                    $attachedVolunteerName = null;
                }
                $attachedVolunteerEmail = trim((string) ($s->assignedVolunteer?->email ?? ''));
                if ($attachedVolunteerEmail === '') {
                    $attachedVolunteerEmail = null;
                }
                $attachedVolunteerId = $s->assignedVolunteer?->id ? (int) $s->assignedVolunteer->id : null;
                $attachedVolunteerShowUrl = null;
                if ($attachedVolunteerId !== null && $accessMode === 'staff') {
                    $attachedVolunteerShowUrl = route('volunteers.show', $attachedVolunteerId);
                }
                $attachedVolunteerProfile = null;
                if ($s->assignedVolunteer) {
                    $attachedVolunteerProfile = VolunteerQuestionnaireProfilePayload::fromVolunteer($s->assignedVolunteer);
                }

                $panelRoute = $accessMode === 'leader'
                    ? 'ministry-lead.volunteer-requests.panel'
                    : 'volunteer-requests.staff.panel';

                $canArchiveStaff = $accessMode === 'staff'
                    && $authUser->can('archiveVolunteerRequestAsStaff', $s);

                return [
                    'id' => (int) $s->id,
                    'subject' => (string) $s->subject,
                    'message' => (string) $s->message,
                    'message_preview' => Str::limit(trim((string) $s->message), 140),
                    'status' => (string) $s->status,
                    'status_label' => MobileChurchSolicitationController::statusLabel((string) $s->status),
                    'created_at' => $s->created_at?->toIso8601String(),
                    'batch_slot_label' => $batchSlotLabel,
                    'requester_name' => $includeRequesterName ? ($s->user?->name) : null,
                    'attached_volunteer_name' => $attachedVolunteerName,
                    'attached_volunteer_email' => $attachedVolunteerEmail,
                    'attached_volunteer_id' => $attachedVolunteerId,
                    'attached_volunteer_show_url' => $attachedVolunteerShowUrl,
                    'attached_volunteer_profile' => $attachedVolunteerProfile,
                    'ministry_id' => $ministryIdMeta,
                    'schedule_role_id' => $scheduleRoleIdMeta > 0 ? $scheduleRoleIdMeta : null,
                    'can_edit' => $canMutate,
                    'can_delete' => $accessMode === 'leader' && $canMutate,
                    'update_url' => $canMutate ? route($updateRoute, $s) : null,
                    'destroy_url' => $accessMode === 'leader' && $canMutate ? route($destroyRoute, $s) : null,
                    'can_archive' => $canArchiveStaff && ! $showArchived,
                    'archive_url' => $canArchiveStaff && ! $showArchived ? route('volunteer-requests.staff.archive', $s) : null,
                    'can_unarchive' => $canArchiveStaff && $showArchived,
                    'unarchive_url' => $canArchiveStaff && $showArchived ? route('volunteer-requests.staff.unarchive', $s) : null,
                    'can_attach_volunteer' => $canAttach,
                    'attach_volunteer_url' => $canAttach ? route('volunteer-requests.staff.attach-volunteer', $s) : null,
                    'suggest_volunteers_url' => $canAttach ? route('volunteer-requests.staff.suggest-volunteers', $s) : null,
                    'can_detach_volunteer' => $canDetach,
                    'detach_volunteer_url' => $canDetach ? route('volunteer-requests.staff.detach-volunteer', $s) : null,
                    'panel_json_url' => route($panelRoute, $s),
                ];
            })
            ->values()
            ->all();
    }

    private function assertVolunteerRequest(ChurchSolicitation $solicitation, int $churchId): void
    {
        abort_unless($solicitation->type === MobileChurchSolicitationController::TYPE_VOLUNTEER_REQUEST, 404);
        abort_unless((int) $solicitation->church_id === $churchId, 404);
    }

    /**
     * @return array{subject: string, message: string, ministry_id: int, schedule_role_id: int|null}
     */
    private function validatedVolunteerPayload(
        StoreVolunteerRequestSolicitationRequest $request,
        int $churchId,
        ?array $allowedMinistryIds,
        ?ChurchSolicitation $mergeMinistryFromSolicitation = null,
    ): array {
        $ministryId = (int) $request->validated('ministry_id');
        $scheduleRoleRaw = $request->validated('schedule_role_id');
        $scheduleRoleId = $scheduleRoleRaw !== null ? (int) $scheduleRoleRaw : null;
        $message = trim((string) ($request->validated('message') ?? ''));

        $effectiveAllowed = $allowedMinistryIds;
        if ($effectiveAllowed !== null && $mergeMinistryFromSolicitation !== null) {
            $meta = $mergeMinistryFromSolicitation->meta ?? [];
            $curMin = isset($meta['ministry_id']) ? (int) $meta['ministry_id'] : null;
            if ($curMin !== null && $curMin > 0 && ! in_array($curMin, $effectiveAllowed, true)) {
                $effectiveAllowed = array_values(array_unique([...$effectiveAllowed, $curMin]));
            }
        }

        if ($effectiveAllowed !== null && ! in_array($ministryId, $effectiveAllowed, true)) {
            throw ValidationException::withMessages([
                'ministry_id' => ['Departamento inválido para a sua conta.'],
            ]);
        }

        $ministry = Ministry::query()->where('church_id', $churchId)->whereKey($ministryId)->first();
        if ($ministry === null) {
            throw ValidationException::withMessages([
                'ministry_id' => ['Departamento inválido nesta igreja.'],
            ]);
        }

        $roleName = null;
        if ($scheduleRoleId !== null) {
            $role = ScheduleRole::query()
                ->whereKey($scheduleRoleId)
                ->where('ministry_id', $ministryId)
                ->first(['id', 'name']);
            if ($role === null) {
                throw ValidationException::withMessages([
                    'schedule_role_id' => ['Escolha uma função da escala deste departamento.'],
                ]);
            }
            $roleName = (string) $role->name;
        }

        $subject = $roleName !== null
            ? 'Pedido de voluntário — '.$ministry->name.' — '.$roleName
            : 'Pedido de voluntário — '.$ministry->name;

        return [
            'subject' => $subject,
            'message' => $message,
            'ministry_id' => $ministryId,
            'schedule_role_id' => $scheduleRoleId,
        ];
    }

    public function indexLeader(Request $request): Response
    {
        $this->canUseLeaderArea($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');

        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $ministryIds = $user->ministries()->where('church_id', $churchId)->pluck('ministries.id')->map(fn ($id) => (int) $id)->values()->all();

        return Inertia::render('VolunteerRequests/Index', [
            'mode' => 'leader',
            'rows' => $this->volunteerRequestRowsForChurch((int) $churchId, (int) $user->id, false, $user, 'leader'),
            'ministries' => $this->ministriesWithRolesForChurch($churchId, $ministryIds),
            'storeUrl' => route('ministry-lead.volunteer-requests.store'),
        ]);
    }

    public function storeLeader(StoreVolunteerRequestSolicitationRequest $request): RedirectResponse
    {
        $this->canUseLeaderArea($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');

        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $ministryIds = $user->ministries()->where('church_id', $churchId)->pluck('ministries.id')->map(fn ($id) => (int) $id)->values()->all();
        if ($ministryIds === []) {
            throw ValidationException::withMessages([
                'ministry_id' => ['Não tem departamentos associados como líder.'],
            ]);
        }

        return $this->storeSolicitation(
            $request,
            $user,
            (int) $churchId,
            'leader',
            $ministryIds,
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function staffIndexPayload(Request $request, int $churchId): array
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $showArchived = $request->query('arquivados') === '1';

        $archivedCount = ChurchSolicitation::query()
            ->where('church_id', $churchId)
            ->where('type', MobileChurchSolicitationController::TYPE_VOLUNTEER_REQUEST)
            ->whereNotNull('staff_archived_at')
            ->count();

        $activeCount = ChurchSolicitation::query()
            ->where('church_id', $churchId)
            ->where('type', MobileChurchSolicitationController::TYPE_VOLUNTEER_REQUEST)
            ->whereNull('staff_archived_at')
            ->count();

        return [
            'volunteerRequestRows' => $this->volunteerRequestRowsForChurch($churchId, null, true, $user, 'staff', $showArchived),
            'volunteerRequestMinistries' => $this->ministriesWithRolesForChurch($churchId, null),
            'volunteerRequestStoreUrl' => route('volunteer-requests.staff.store'),
            'volunteersForAttach' => $this->volunteersForAttachDropdown($churchId),
            'attachVolunteerPickerUrl' => route('volunteer-requests.staff.attach-picker-volunteers'),
            'volunteerRequestFilters' => [
                'arquivados' => $showArchived,
            ],
            'volunteerRequestArchivedCount' => $archivedCount,
            'volunteerRequestActiveCount' => $activeCount,
        ];
    }

    public function archiveStaff(Request $request, ChurchSolicitation $solicitation): RedirectResponse
    {
        $this->canManageSolicitations($request);
        abort_unless($solicitation->type === MobileChurchSolicitationController::TYPE_VOLUNTEER_REQUEST, 404);
        $this->authorize('archiveVolunteerRequestAsStaff', $solicitation);

        $churchId = $this->churchId($request);
        if ($churchId !== null && (int) $solicitation->church_id !== (int) $churchId) {
            abort(404);
        }

        $solicitation->update(['staff_archived_at' => now()]);

        return redirect()
            ->to(VolunteerRequestStaffRoutes::pipelinePedidosUrl())
            ->with('success', 'Pedido de voluntário arquivado.');
    }

    public function unarchiveStaff(Request $request, ChurchSolicitation $solicitation): RedirectResponse
    {
        $this->canManageSolicitations($request);
        abort_unless($solicitation->type === MobileChurchSolicitationController::TYPE_VOLUNTEER_REQUEST, 404);
        $this->authorize('archiveVolunteerRequestAsStaff', $solicitation);

        $churchId = $this->churchId($request);
        if ($churchId !== null && (int) $solicitation->church_id !== (int) $churchId) {
            abort(404);
        }

        $solicitation->update(['staff_archived_at' => null]);

        return redirect()
            ->route('ministry-lead.volunteers.index', ['secao' => 'pedidos', 'arquivados' => '1'])
            ->with('success', 'Pedido de voluntário restaurado na lista ativa.');
    }

    public function indexStaff(Request $request): RedirectResponse
    {
        $this->canManageSolicitations($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');

        return redirect()->to(VolunteerRequestStaffRoutes::pipelinePedidosUrl());
    }

    public function suggestVolunteersStaff(Request $request, ChurchSolicitation $solicitation): JsonResponse
    {
        $this->canManageSolicitations($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');
        $this->assertVolunteerRequest($solicitation, (int) $churchId);
        $this->authorize('manageVolunteerRequestAsStaff', $solicitation);

        if ($solicitation->status !== 'pending') {
            return response()->json([
                'suggestions' => [],
                'ministryName' => null,
                'roleName' => null,
                'candidatesEvaluated' => 0,
                'message' => 'Sugestões só estão disponíveis para pedidos pendentes.',
            ]);
        }

        $meta = $solicitation->meta ?? [];
        if (! empty($meta['fulfilled_invitation_id'])) {
            return response()->json([
                'suggestions' => [],
                'ministryName' => null,
                'roleName' => null,
                'candidatesEvaluated' => 0,
                'message' => 'Este pedido já tem voluntário anexado.',
            ]);
        }

        return response()->json(
            VolunteerRequestVolunteerSuggester::suggest($solicitation, (int) $churchId),
        );
    }

    public function attachVolunteerPicker(Request $request): JsonResponse
    {
        $this->canManageSolicitations($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');

        $user = $request->user();
        abort_unless($user instanceof User, 401);

        if (! VolunteerChurchRosterBuilder::volunteersTableExists()) {
            return response()->json([
                'stages' => [],
                'volunteers' => [
                    'data' => [],
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => 25,
                    'total' => 0,
                    'links' => [],
                ],
                'filters' => VolunteerLeadRosterFilters::filterState($request),
                'ministries' => [],
            ]);
        }

        $roster = VolunteerChurchRosterBuilder::paginated($request, (int) $churchId, $user, 25, true);

        return response()->json($roster);
    }

    public function solicitationPanelJson(Request $request, ChurchSolicitation $solicitation): JsonResponse
    {
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');
        $this->assertVolunteerRequest($solicitation, (int) $churchId);
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $routeName = $request->route()?->getName() ?? '';
        if ($routeName === 'ministry-lead.volunteer-requests.panel') {
            $this->canUseLeaderArea($request);
            abort_unless((int) $solicitation->user_id === (int) $user->id, 403);
            $payload = ChurchSolicitationModalPayloadPresenter::forVolunteerRequestLeader($solicitation, $user);
        } elseif ($routeName === 'volunteer-requests.staff.panel') {
            $this->canManageSolicitations($request);
            $this->authorize('manageVolunteerRequestAsStaff', $solicitation);
            $payload = ChurchSolicitationModalPayloadPresenter::forVolunteerRequestStaff($solicitation, $user);
        } else {
            abort(404);
        }

        return response()->json($payload);
    }

    public function storeChatMessageLeader(Request $request, ChurchSolicitation $solicitation): RedirectResponse
    {
        $this->canUseLeaderArea($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');
        $this->assertVolunteerRequest($solicitation, (int) $churchId);
        $this->authorize('chatVolunteerRequestAsSubmitter', $solicitation);

        return $this->processVolunteerRequestChatMessage($request, $solicitation, 'member');
    }

    public function storeChatMessageStaff(Request $request, ChurchSolicitation $solicitation): RedirectResponse
    {
        $this->canManageSolicitations($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');
        $this->assertVolunteerRequest($solicitation, (int) $churchId);
        $this->authorize('manageVolunteerRequestAsStaff', $solicitation);

        return $this->processVolunteerRequestChatMessage($request, $solicitation, 'staff');
    }

    private function processVolunteerRequestChatMessage(Request $request, ChurchSolicitation $solicitation, string $senderType): RedirectResponse
    {
        abort_unless($solicitation->allowsChat(), 403);
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $valid = $request->validate([
            'content' => ['required', 'string', 'max:5000'],
        ]);

        ChurchSolicitationMessage::create([
            'church_solicitation_id' => $solicitation->id,
            'sender_type' => $senderType,
            'sender_user_id' => $user->id,
            'content' => $valid['content'],
        ]);

        if (in_array($solicitation->status, ['pending'], true)) {
            $solicitation->update(['status' => 'in_progress']);
        } else {
            $solicitation->touch();
        }

        if ($senderType === 'staff') {
            app(SolicitationChatNotifier::class)->notifyMemberOfStaffMessage($solicitation, $user, $valid['content']);
        } else {
            app(SolicitationChatNotifier::class)->notifyStaffOfMemberMessage($solicitation, $user);
        }

        $fallback = $senderType === 'staff'
            ? VolunteerRequestStaffRoutes::pipelinePedidosUrl()
            : route('ministry-lead.my-volunteers.index');

        return redirect()->back(fallback: $fallback);
    }

    public function attachVolunteerStaff(AttachVolunteerToVolunteerRequest $request, ChurchSolicitation $solicitation): RedirectResponse
    {
        $this->canManageSolicitations($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');
        $this->assertVolunteerRequest($solicitation, (int) $churchId);
        $this->authorize('manageVolunteerRequestAsStaff', $solicitation);

        $staffUser = $request->user();
        abort_unless($staffUser instanceof User, 401);

        if ($solicitation->status !== 'pending') {
            throw ValidationException::withMessages([
                'volunteer_id' => ['Só é possível anexar voluntário em pedidos pendentes.'],
            ]);
        }

        $meta = $solicitation->meta ?? [];
        $ministryId = isset($meta['ministry_id']) ? (int) $meta['ministry_id'] : 0;
        if ($ministryId <= 0) {
            throw ValidationException::withMessages([
                'volunteer_id' => ['Este pedido não tem departamento definido; edite o pedido antes de anexar.'],
            ]);
        }

        if (! empty($meta['fulfilled_invitation_id'])) {
            throw ValidationException::withMessages([
                'volunteer_id' => ['Este pedido já foi cumprido com um voluntário anexado.'],
            ]);
        }

        $volunteerId = (int) $request->validated('volunteer_id');
        $volunteer = Volunteer::query()->findOrFail($volunteerId);
        abort_unless($this->volunteerVisibleInChurch($volunteer, (int) $churchId), 404);

        $ministry = Ministry::query()->where('church_id', $churchId)->whereKey($ministryId)->firstOrFail();

        if (VolunteerMinistryInvitation::findBlockingForMinistry((int) $churchId, (int) $volunteer->id, (int) $ministry->id)) {
            throw ValidationException::withMessages([
                'volunteer_id' => ['Este voluntário já foi encaminhado para este departamento.'],
            ]);
        }

        DB::transaction(function () use ($solicitation, $volunteer, $ministry, $staffUser, $churchId, $meta): void {
            $invitation = app(CreateAndNotifyVolunteerMinistryInvitation::class)(
                (int) $churchId,
                $volunteer,
                $ministry,
                $staffUser,
                ['email'],
                [],
            );

            VolunteerPipelineBootstrap::moveVolunteerToStageByNormalizedName($volunteer, (int) $churchId, 'encaminhado');

            $volunteerName = trim((string) ($volunteer->name ?? '')) ?: 'Voluntário #'.$volunteer->id;
            $note = 'Encaminhamento criado a partir do pedido de voluntário #'.$solicitation->id.' (pedidos de voluntário).';

            VolunteerMinistryInvitationStatusHistory::create([
                'invitation_id' => $invitation->id,
                'church_id' => $invitation->church_id,
                'ministry_id' => $invitation->ministry_id,
                'volunteer_id' => $invitation->volunteer_id,
                'changed_by_user_id' => $staffUser->id,
                'from_status' => null,
                'to_status' => null,
                'note' => $note,
            ]);

            if (Schema::hasTable('church_solicitation_messages')) {
                ChurchSolicitationMessage::create([
                    'church_solicitation_id' => $solicitation->id,
                    'sender_type' => 'staff',
                    'sender_user_id' => $staffUser->id,
                    'content' => 'Retorno (secretaria): voluntário «'.$volunteerName.'» anexado ao pedido. Convite ao departamento «'
                        .$ministry->name.'» criado (convite #'.$invitation->id.'). Pedido concluído.',
                ]);
            }

            $newMeta = array_merge($meta, [
                'fulfilled_volunteer_id' => $volunteer->id,
                'fulfilled_volunteer_name' => $volunteerName,
                'fulfilled_volunteer_email' => $volunteer->email,
                'fulfilled_invitation_id' => $invitation->id,
                'fulfilled_at' => now()->toIso8601String(),
                'fulfilled_by_user_id' => $staffUser->id,
            ]);

            $solicitation->forceFill([
                'status' => 'completed',
                'completed_at' => now(),
                'assigned_volunteer_id' => $volunteer->id,
                'meta' => $newMeta,
            ])->save();
        });

        return redirect()
            ->VolunteerRequestStaffRoutes::pipelinePedidosUrl()
            ->with('success', 'Voluntário anexado: convite criado para o líder, pedido concluído e fase do voluntário atualizada.');
    }

    public function detachVolunteerStaff(Request $request, ChurchSolicitation $solicitation): RedirectResponse
    {
        $this->canManageSolicitations($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');
        $this->assertVolunteerRequest($solicitation, (int) $churchId);
        $this->authorize('manageVolunteerRequestAsStaff', $solicitation);

        $staffUser = $request->user();
        abort_unless($staffUser instanceof User, 401);

        if ($solicitation->status !== 'completed' || $solicitation->assigned_volunteer_id === null) {
            throw ValidationException::withMessages([
                'volunteer_id' => ['Este pedido não possui voluntário anexado para remover.'],
            ]);
        }

        $meta = $solicitation->meta ?? [];
        $invitationId = isset($meta['fulfilled_invitation_id']) ? (int) $meta['fulfilled_invitation_id'] : 0;
        $volunteerName = trim((string) ($solicitation->assignedVolunteer?->name ?? '')) ?: 'Voluntário';

        DB::transaction(function () use ($solicitation, $invitationId, $meta, $staffUser, $volunteerName): void {
            if ($invitationId > 0) {
                $invitation = VolunteerMinistryInvitation::query()->whereKey($invitationId)->first();
                if ($invitation) {
                    if (! in_array((string) $invitation->status, ['pending'], true)) {
                        throw ValidationException::withMessages([
                            'volunteer_id' => ['Não é possível remover: o convite já teve resposta do voluntário.'],
                        ]);
                    }
                    VolunteerMinistryInvitationStatusHistory::query()
                        ->where('invitation_id', $invitation->id)
                        ->delete();
                    $invitation->delete();
                }
            }

            if (Schema::hasTable('church_solicitation_messages')) {
                ChurchSolicitationMessage::create([
                    'church_solicitation_id' => $solicitation->id,
                    'sender_type' => 'staff',
                    'sender_user_id' => $staffUser->id,
                    'content' => 'Ação da secretaria: anexo do voluntário «'.$volunteerName.'» foi removido e o pedido voltou para pendente.',
                ]);
            }

            unset(
                $meta['fulfilled_volunteer_id'],
                $meta['fulfilled_volunteer_name'],
                $meta['fulfilled_volunteer_email'],
                $meta['fulfilled_invitation_id'],
                $meta['fulfilled_at'],
                $meta['fulfilled_by_user_id']
            );

            $solicitation->forceFill([
                'status' => 'pending',
                'completed_at' => null,
                'assigned_volunteer_id' => null,
                'meta' => $meta,
            ])->save();
        });

        return redirect()
            ->VolunteerRequestStaffRoutes::pipelinePedidosUrl()
            ->with('success', 'Voluntário desanexado. O pedido voltou para pendente.');
    }

    /**
     * @return list<array{id: int, name: string, email: string|null}>
     */
    private function volunteersForAttachDropdown(int $churchId): array
    {
        if (! Schema::hasTable('volunteers')) {
            return [];
        }

        $q = Volunteer::query()
            ->where(function ($q2) use ($churchId) {
                $q2->whereDoesntHave('ministries')
                    ->orWhereHas('ministries', fn ($mq) => $mq->where('church_id', $churchId));
            });

        VolunteerChurchRosterBuilder::applyStaffArchivedFilter($q, $churchId, false);

        return $q->orderBy('name')
            ->limit(400)
            ->get(['id', 'name', 'email'])
            ->map(fn (Volunteer $v) => [
                'id' => (int) $v->id,
                'name' => (string) ($v->name ?? ''),
                'email' => $v->email !== null && trim((string) $v->email) !== '' ? (string) $v->email : null,
            ])
            ->values()
            ->all();
    }

    private function volunteerVisibleInChurch(Volunteer $volunteer, int $churchId): bool
    {
        return Volunteer::query()
            ->whereKey($volunteer->getKey())
            ->where(function ($q2) use ($churchId) {
                $q2->whereDoesntHave('ministries')
                    ->orWhereHas('ministries', fn ($mq) => $mq->where('church_id', $churchId));
            })
            ->exists();
    }

    public function storeStaff(StoreVolunteerRequestSolicitationRequest $request): RedirectResponse
    {
        $this->canManageSolicitations($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');

        $user = $request->user();
        abort_unless($user instanceof User, 401);

        return $this->storeSolicitation(
            $request,
            $user,
            (int) $churchId,
            'staff',
            null,
        );
    }

    public function updateLeader(UpdateVolunteerRequestSolicitationRequest $request, ChurchSolicitation $solicitation): RedirectResponse
    {
        $this->canUseLeaderArea($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');
        $this->assertVolunteerRequest($solicitation, (int) $churchId);
        $this->authorize('updateVolunteerRequestAsSubmitter', $solicitation);

        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $ministryIds = $user->ministries()->where('church_id', $churchId)->pluck('ministries.id')->map(fn ($id) => (int) $id)->values()->all();

        return $this->updateSolicitation($request, $solicitation, (int) $churchId, $ministryIds);
    }

    public function updateStaff(UpdateVolunteerRequestSolicitationRequest $request, ChurchSolicitation $solicitation): RedirectResponse
    {
        $this->canManageSolicitations($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');
        $this->assertVolunteerRequest($solicitation, (int) $churchId);
        $this->authorize('manageVolunteerRequestAsStaff', $solicitation);

        return $this->updateSolicitation($request, $solicitation, (int) $churchId, null);
    }

    public function destroyLeader(Request $request, ChurchSolicitation $solicitation): RedirectResponse
    {
        $this->canUseLeaderArea($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');
        $this->assertVolunteerRequest($solicitation, (int) $churchId);
        $this->authorize('deleteVolunteerRequestAsSubmitter', $solicitation);

        $solicitation->delete();

        return redirect()
            ->route('ministry-lead.my-volunteers.index')
            ->with('success', 'Pedido removido.');
    }

    public function destroyStaff(Request $request, ChurchSolicitation $solicitation): RedirectResponse
    {
        $this->canManageSolicitations($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');
        $this->assertVolunteerRequest($solicitation, (int) $churchId);
        $this->authorize('manageVolunteerRequestAsStaff', $solicitation);

        $solicitation->delete();

        return redirect()
            ->VolunteerRequestStaffRoutes::pipelinePedidosUrl()
            ->with('success', 'Pedido removido.');
    }

    /**
     * @param  list<int>|null  $allowedMinistryIds
     */
    private function storeSolicitation(
        StoreVolunteerRequestSolicitationRequest $request,
        User $user,
        int $churchId,
        string $source,
        ?array $allowedMinistryIds,
    ): RedirectResponse {
        $p = $this->validatedVolunteerPayload($request, $churchId, $allowedMinistryIds, null);

        $quantity = (int) $request->validated('quantity');
        if ($quantity < 1) {
            $quantity = 1;
        }
        if ($quantity > 50) {
            $quantity = 50;
        }

        $baseMeta = [
            'ministry_id' => $p['ministry_id'],
            'source' => $source,
        ];
        if ($p['schedule_role_id'] !== null) {
            $baseMeta['schedule_role_id'] = $p['schedule_role_id'];
        }

        $batchKey = $quantity > 1 ? (string) Str::uuid() : null;
        $firstSolicitation = null;

        for ($i = 1; $i <= $quantity; $i++) {
            $rowMeta = $baseMeta;
            if ($batchKey !== null) {
                $rowMeta['batch_key'] = $batchKey;
                $rowMeta['batch_index'] = $i;
                $rowMeta['batch_total'] = $quantity;
            }

            $subject = $p['subject'];
            if ($quantity > 1) {
                $subject .= ' — '.$i.'/'.$quantity;
            }

            $created = ChurchSolicitation::create([
                'church_id' => $churchId,
                'user_id' => $user->id,
                'type' => MobileChurchSolicitationController::TYPE_VOLUNTEER_REQUEST,
                'status' => 'pending',
                'subject' => $subject,
                'message' => $p['message'],
                'preferred_date' => null,
                'assigned_pastor_id' => null,
                'assigned_volunteer_id' => null,
                'meta' => $rowMeta,
            ]);

            if ($firstSolicitation === null) {
                $firstSolicitation = $created;
            }
        }

        app(SolicitationChatNotifier::class)->notifyChurchSolicitationsHandlerOfNewRequest(
            $firstSolicitation,
            $churchId,
            $quantity > 1 ? $quantity : null,
        );

        if ($source === 'staff') {
            $msg = $quantity > 1
                ? sprintf('%d pedidos de voluntário registrados (uma linha por pessoa).', $quantity)
                : 'Pedido de voluntário registrado.';

            return redirect()
                ->VolunteerRequestStaffRoutes::pipelinePedidosUrl()
                ->with('success', $msg);
        }

        $msg = $quantity > 1
            ? sprintf('%d pedidos enviados à secretaria (uma linha por pessoa).', $quantity)
            : 'Pedido de voluntário enviado à secretaria.';

        return redirect()
            ->route('ministry-lead.my-volunteers.index')
            ->with('success', $msg);
    }

    /**
     * @param  list<int>|null  $allowedMinistryIds
     */
    private function updateSolicitation(
        UpdateVolunteerRequestSolicitationRequest $request,
        ChurchSolicitation $solicitation,
        int $churchId,
        ?array $allowedMinistryIds,
    ): RedirectResponse {
        $p = $this->validatedVolunteerPayload($request, $churchId, $allowedMinistryIds, $solicitation);

        $source = is_string($solicitation->meta['source'] ?? null)
            ? (string) $solicitation->meta['source']
            : 'leader';

        $oldMeta = $solicitation->meta ?? [];
        $meta = array_merge($oldMeta, [
            'ministry_id' => $p['ministry_id'],
            'source' => $source,
        ]);
        if ($p['schedule_role_id'] !== null) {
            $meta['schedule_role_id'] = $p['schedule_role_id'];
        } else {
            unset($meta['schedule_role_id']);
        }

        $solicitation->update([
            'subject' => $p['subject'],
            'message' => $p['message'],
            'meta' => $meta,
        ]);

        return back()->with('success', 'Pedido atualizado.');
    }
}
