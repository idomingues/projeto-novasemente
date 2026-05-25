<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\ChurchSolicitation;
use App\Models\ChurchSolicitationMessage;
use App\Models\PastoralAppointment;
use App\Models\User;
use App\Services\SolicitationChatNotifier;
use App\Support\BaptismSolicitationStatus;
use App\Support\ChurchSolicitationModalPayloadPresenter;
use App\Support\PastoralSolicitationStatus;
use App\Support\SearchTerm;
use App\Support\SolicitationAssignees;
use App\Support\SupportTicketAdminPresenter;
use App\Support\VolunteerRequestStaffRoutes;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class SolicitationAdminController extends Controller
{
    private function canView(User $user): bool
    {
        if ($user->hasAnyRole(['super_admin', 'admin'])) {
            return true;
        }

        return $user->hasAnyPermission(['solicitations.view', 'solicitations.manage']);
    }

    private function canManage(User $user): bool
    {
        if ($user->hasAnyRole(['super_admin', 'admin'])) {
            return true;
        }

        return $user->hasPermissionTo('solicitations.manage');
    }

    /**
     * @return array<string, mixed>
     */
    private function solicitationModalPayload(ChurchSolicitation $s, ?User $user = null): array
    {
        $user = $user ?? request()->user();
        $canManage = $user ? $this->canManage($user) : false;
        $canView = $user ? $this->canView($user) : false;

        if ($s->type === 'baptism') {
            return ChurchSolicitationModalPayloadPresenter::forBaptismAdmin($s, $user, $canManage, $canView);
        }

        if (in_array($s->type, MobileChurchSolicitationController::TYPES_OUTSIDE_PASTORAL_INDEX, true)) {
            return ChurchSolicitationModalPayloadPresenter::forSolicitationsAdmin($s, $user, $canManage, $canView);
        }

        return ChurchSolicitationModalPayloadPresenter::forPastoralAdmin($s, $user, $canManage, $canView);
    }

    private function canViewPastoral(User $user): bool
    {
        return $user->hasAnyRole(['super_admin', 'admin']) || $user->can('pastoral_appointments.manage');
    }

    /** @return non-empty-string */
    private function staffSolicitationModalUrl(Request $request, ChurchSolicitation $solicitation): string
    {
        $params = [
            'modal_kind' => 'solicitation',
            'modal_id' => (string) $solicitation->id,
        ];
        if ($solicitation->type === 'baptism') {
            return route('baptism-requests.index', $this->baptismIndexQueryFromRequest($request, [
                'modal_kind' => 'solicitation',
                'modal_id' => (string) $solicitation->id,
            ]));
        }

        return route('solicitations.index', $this->solicitationsIndexQueryFromRequest($request, $params));
    }

    /**
     * @param  array<string, string|null>  $overrides
     * @return array<string, string>
     */
    private function solicitationsIndexQueryFromRequest(Request $request, array $overrides = []): array
    {
        $params = [];
        foreach (['aba', 'type', 'q', 'kind', 'modal_kind', 'modal_id'] as $key) {
            if (array_key_exists($key, $overrides)) {
                $val = $overrides[$key];
                if (is_string($val) && $val !== '') {
                    $params[$key] = $val;
                }

                continue;
            }
            $val = $request->query($key);
            if (is_string($val) && $val !== '') {
                $params[$key] = $val;
            }
        }

        return $params;
    }

    private function staffSolicitationModalRedirect(Request $request, ChurchSolicitation $solicitation): RedirectResponse
    {
        return redirect()->to($this->staffSolicitationModalUrl($request, $solicitation));
    }

    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user && $this->canView($user), 403);
        $churchId = Church::resolveWorkingId($request);
        $kind = $request->query('kind');
        $kindStr = is_string($kind) ? $kind : '';
        $type = $request->query('type');

        $aba = (string) $request->query('aba', 'pendente');
        if (! array_key_exists($aba, PastoralSolicitationStatus::tabLabels())) {
            $aba = 'pendente';
        }

        $q = $request->query('q');
        $qStr = is_string($q) ? (string) $q : '';

        $solRows = [];
        if ($kindStr !== 'pastoral') {
            $query = ChurchSolicitation::query()->with([
                'user:id,name,photo_url',
                'assignedPastor:id,name',
                'assignedVolunteer.user:id,name',
            ]);
            if ($churchId !== null) {
                $query->where('church_id', $churchId);
            }

            $query->whereNotIn('type', MobileChurchSolicitationController::TYPES_OUTSIDE_PASTORAL_INDEX)
                ->where('type', '!=', 'baptism')
                ->whereIn('status', PastoralSolicitationStatus::statusesForTab($aba));

            if (is_string($type) && $type !== '') {
                $query->where('type', $type);
            }

            if (trim($qStr) !== '') {
                $term = trim($qStr);
                $query->where(function ($sub) use ($term) {
                    SearchTerm::whereAnyColumnLike($sub, ['message', 'subject'], $term);
                    $sub->orWhereHas('user', fn ($uq) => SearchTerm::whereAnyColumnLike($uq, ['name'], $term));
                });
            }

            $solicitations = $query
                ->orderByDesc('updated_at')
                ->limit(100)
                ->get();

            $informalMemberIds = $solicitations
                ->filter(fn (ChurchSolicitation $s) => $s->type === MobileChurchSolicitationController::TYPE_PASTORAL_INFORMAL)
                ->map(fn (ChurchSolicitation $s) => $s->informalPastoralLinkedMemberUserId())
                ->filter()
                ->unique()
                ->values()
                ->all();

            $informalPhotoByUserId = $informalMemberIds === []
                ? []
                : User::query()->whereIn('id', $informalMemberIds)->pluck('photo_url', 'id')->all();

            $solRows = $solicitations
                ->map(function (ChurchSolicitation $s) use ($informalPhotoByUserId) {
                    $linkedMemberId = $s->informalPastoralLinkedMemberUserId();
                    $memberPhotoUrl = $s->type === MobileChurchSolicitationController::TYPE_PASTORAL_INFORMAL
                        ? ($linkedMemberId !== null ? ($informalPhotoByUserId[$linkedMemberId] ?? null) : null)
                        : $s->user?->photo_url;

                    return [
                        'kind' => 'solicitation',
                        'id' => $s->id,
                        'tagLabel' => 'Solicitação',
                        'type' => $s->type,
                        'typeLabel' => MobileChurchSolicitationController::typeLabel($s->type),
                        'status' => $s->status,
                        'statusLabel' => $s->type === 'leader_chat'
                            ? PastoralSolicitationStatus::label((string) $s->status, 'leader_chat')
                            : PastoralSolicitationStatus::label((string) $s->status),
                        'messageExcerpt' => mb_strimwidth(strip_tags($s->message), 0, 100, '…'),
                        'preferredDate' => $s->preferred_date?->format('Y-m-d'),
                        'updatedAt' => $s->updated_at?->toIso8601String(),
                        'memberLabel' => $s->memberDisplayName(),
                        'memberPhotoUrl' => $memberPhotoUrl,
                    ];
                })
                ->values()
                ->all();
        }

        $pastoralRows = [];
        $omitPastoralMerge = ($kindStr === 'solicitation')
            || ($kindStr === '' && is_string($type) && $type !== '');
        if (! $omitPastoralMerge && $this->canViewPastoral($user)) {
            $pQuery = PastoralAppointment::query()
                ->with(['requesterUser:id,name,photo_url', 'preferredPastor:id,name', 'supportTicket:id,public_token'])
                ->orderByDesc('updated_at')
                ->limit(100);

            $aptStatuses = PastoralSolicitationStatus::pastoralAppointmentStatusesForTab($aba);
            if ($aptStatuses !== null && $aptStatuses !== []) {
                $pQuery->whereIn('status', $aptStatuses);
            } elseif ($aptStatuses === []) {
                $pQuery->whereRaw('1 = 0');
            }

            if (trim($qStr) !== '') {
                $term = trim($qStr);
                $pQuery->where(function ($sub) use ($term) {
                    SearchTerm::whereAnyColumnLike($sub, ['subject', 'notes'], $term);
                    $sub->orWhereHas('requesterUser', fn ($uq) => SearchTerm::whereAnyColumnLike($uq, ['name'], $term));
                });
            }

            $pastoralRows = $pQuery->get()
                ->map(fn (PastoralAppointment $a) => [
                    'kind' => 'pastoral',
                    'id' => $a->id,
                    'tagLabel' => 'Pastoral',
                    'typeLabel' => 'Agendamento pastoral',
                    'status' => $a->status,
                    'statusLabel' => match ($a->status) {
                        'pending' => 'Pendente',
                        'confirmed' => 'Confirmado',
                        'cancelled' => 'Cancelado',
                        'completed' => 'Concluído',
                        default => $a->status,
                    },
                    'messageExcerpt' => mb_strimwidth(strip_tags((string) ($a->subject ?? $a->notes ?? '')), 0, 100, '…'),
                    'preferredDate' => $a->preferred_start?->format('Y-m-d'),
                    'updatedAt' => ($a->updated_at ?? $a->created_at)?->toIso8601String(),
                    'memberLabel' => $a->requester_name ?: ($a->requesterUser?->name ?? 'Membro'),
                    'memberPhotoUrl' => $a->requesterUser?->photo_url,
                ])
                ->values()
                ->all();
        }

        $rows = collect(array_merge($solRows, $pastoralRows))
            ->sortByDesc(fn (array $r) => $r['updatedAt'] ?? '')
            ->values()
            ->all();

        $modalKind = $request->query('modal_kind');
        $modalDetail = null;
        $modalId = $request->query('modal_id');
        if (is_string($modalId) && $modalId !== '' && ctype_digit($modalId)) {
            if ($modalKind === 'pastoral' && $this->canViewPastoral($user)) {
                $apt = PastoralAppointment::query()
                    ->with(['supportTicket'])
                    ->find((int) $modalId);
                if ($apt && $apt->supportTicket) {
                    $modalDetail = [
                        'kind' => 'pastoral',
                        'payload' => SupportTicketAdminPresenter::adminPayload($apt->supportTicket, $user),
                    ];
                }
            }
            if (($modalKind === null || $modalKind === '' || $modalKind === 'solicitation') && $this->canView($user)) {
                $modalQuery = ChurchSolicitation::query();
                if ($churchId !== null) {
                    $modalQuery->where('church_id', $churchId);
                }
                $modal = $modalQuery->find((int) $modalId);
                if ($modal && ! in_array($modal->type, MobileChurchSolicitationController::TYPES_OUTSIDE_PASTORAL_INDEX, true)) {
                    $modalDetail = [
                        'kind' => 'solicitation',
                        'payload' => $this->solicitationModalPayload($modal, $user),
                    ];
                }
            }
        }

        if ($modalDetail === null) {
            $legacyModal = $request->query('modal');
            if (is_string($legacyModal) && $legacyModal !== '' && ctype_digit($legacyModal) && $this->canView($user)) {
                $modalQuery = ChurchSolicitation::query();
                if ($churchId !== null) {
                    $modalQuery->where('church_id', $churchId);
                }
                $modal = $modalQuery->find((int) $legacyModal);
                if ($modal && ! in_array($modal->type, MobileChurchSolicitationController::TYPES_OUTSIDE_PASTORAL_INDEX, true)) {
                    $modalDetail = [
                        'kind' => 'solicitation',
                        'payload' => $this->solicitationModalPayload($modal, $user),
                    ];
                }
            }
        }

        $countBase = ChurchSolicitation::query()
            ->whereNotIn('type', MobileChurchSolicitationController::TYPES_OUTSIDE_PASTORAL_INDEX)
            ->where('type', '!=', 'baptism');
        if ($churchId !== null) {
            $countBase->where('church_id', $churchId);
        }
        if (is_string($type) && $type !== '') {
            $countBase->where('type', $type);
        }
        $tabCounts = [];
        foreach (PastoralSolicitationStatus::tabLabels() as $tabKey => $tabLabel) {
            $tabCounts[$tabKey] = (clone $countBase)
                ->whereIn('status', PastoralSolicitationStatus::statusesForTab($tabKey))
                ->count();
            if ($this->canViewPastoral($user)) {
                $aptStatuses = PastoralSolicitationStatus::pastoralAppointmentStatusesForTab($tabKey);
                if ($aptStatuses !== null && $aptStatuses !== []) {
                    $tabCounts[$tabKey] += PastoralAppointment::query()
                        ->whereIn('status', $aptStatuses)
                        ->count();
                }
            }
        }

        return Inertia::render('Solicitations/Index', [
            'demands' => $rows,
            'solicitationsIndexUrl' => route('solicitations.index'),
            'modalDetail' => $modalDetail,
            'canManage' => $this->canManage($user),
            'filters' => [
                'aba' => $aba,
                'type' => is_string($type) ? $type : '',
                'q' => $qStr,
                'kind' => $kindStr,
            ],
            'tabCounts' => $tabCounts,
            'tabs' => collect(PastoralSolicitationStatus::tabLabels())
                ->map(fn (string $label, string $key) => ['key' => $key, 'label' => $label])
                ->values()
                ->all(),
            'typeOptions' => [
                ['value' => '', 'label' => 'Todos os tipos'],
                ['value' => 'bible_study', 'label' => 'Estudo bíblico'],
                ['value' => 'baby_presentation', 'label' => 'Apresentação de bebé'],
                ['value' => 'pastor_visit', 'label' => 'Visita aos pastores'],
                ['value' => 'leader_chat', 'label' => 'Conversa com líder'],
                ['value' => MobileChurchSolicitationController::TYPE_PASTORAL_INFORMAL, 'label' => 'Atendimento informal'],
                ['value' => 'other', 'label' => 'Outros'],
            ],
            'informalPastoralStoreUrl' => $this->canManage($user)
                ? route('solicitations.informal-pastoral.store')
                : null,
            'pastorOptions' => SolicitationAssignees::pastorOptions($churchId),
            'memberUserOptions' => $this->memberUserOptionsForInformalPastoral($churchId),
        ]);
    }

    /**
     * @return list<array{value: int, label: string}>
     */
    private function memberUserOptionsForInformalPastoral(?int $churchId): array
    {
        if ($churchId === null) {
            return [];
        }

        return User::query()
            ->where('church_id', $churchId)
            ->orderBy('name')
            ->limit(500)
            ->get(['id', 'name'])
            ->map(fn (User $u) => ['value' => (int) $u->id, 'label' => (string) $u->name])
            ->values()
            ->all();
    }

    public function storeInformalPastoral(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user && $this->canManage($user), 403);

        $churchId = Church::resolveWorkingId($request);
        abort_unless($churchId !== null, 404, 'Nenhuma igreja ativa.');

        $valid = $request->validate([
            'requester_user_id' => [
                'nullable',
                'integer',
                Rule::exists('users', 'id')->where(fn ($q) => $q->where('church_id', $churchId)),
            ],
            'requester_name' => ['nullable', 'string', 'max:200'],
            'assigned_pastor_id' => [
                'nullable',
                'integer',
                Rule::exists('pastors', 'id')->where(fn ($q) => $q->where('church_id', $churchId)),
            ],
            'subject' => ['nullable', 'string', 'max:255'],
            'message' => ['required', 'string', 'max:5000'],
            'internal_notes' => ['nullable', 'string', 'max:10000'],
            'preferred_date' => ['nullable', 'date'],
            'status' => ['required', 'in:'.PastoralSolicitationStatus::PENDING.','.PastoralSolicitationStatus::COMPLETED],
        ]);

        $requesterUserId = isset($valid['requester_user_id']) ? (int) $valid['requester_user_id'] : null;
        $requesterName = trim((string) ($valid['requester_name'] ?? ''));

        if ($requesterUserId === null && $requesterName === '') {
            throw ValidationException::withMessages([
                'requester_name' => 'Informe o membro (conta na app) ou o nome de quem foi atendido.',
            ]);
        }

        if ($requesterUserId !== null) {
            $member = User::query()->whereKey($requesterUserId)->first(['id', 'name']);
            $requesterName = $member?->name ?? $requesterName;
        }

        $status = (string) $valid['status'];
        $subject = trim((string) ($valid['subject'] ?? ''));
        if ($subject === '') {
            $subject = 'Atendimento pastoral informal';
        }

        $solicitation = ChurchSolicitation::create([
            'church_id' => $churchId,
            'user_id' => $requesterUserId ?? (int) $user->id,
            'type' => MobileChurchSolicitationController::TYPE_PASTORAL_INFORMAL,
            'status' => $status,
            'subject' => $subject,
            'message' => trim((string) $valid['message']),
            'preferred_date' => $valid['preferred_date'] ?? null,
            'assigned_pastor_id' => isset($valid['assigned_pastor_id']) ? (int) $valid['assigned_pastor_id'] : null,
            'assigned_volunteer_id' => null,
            'meta' => [
                'informal' => true,
                'requester_name' => $requesterName !== '' ? $requesterName : null,
                'requester_user_id' => $requesterUserId,
                'created_by_user_id' => (int) $user->id,
            ],
            'internal_notes' => $valid['internal_notes'] ?? null,
            'completed_at' => $status === PastoralSolicitationStatus::COMPLETED ? now() : null,
        ]);

        $aba = PastoralSolicitationStatus::tabForStatus($status);

        return redirect()
            ->route('solicitations.index', $this->solicitationsIndexQueryFromRequest($request, [
                'aba' => $aba,
                'modal_kind' => 'solicitation',
                'modal_id' => (string) $solicitation->id,
            ]))
            ->with('success', 'Atendimento pastoral registrado.');
    }

    public function baptismIndex(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user && $this->canView($user), 403);
        $churchId = Church::resolveWorkingId($request);

        $aba = (string) $request->query('aba', 'pendente');
        if (! array_key_exists($aba, BaptismSolicitationStatus::tabLabels())) {
            $aba = 'pendente';
        }
        $statusFilter = BaptismSolicitationStatus::statusForTab($aba);

        $query = ChurchSolicitation::query()
            ->with([
                'user:id,name',
                'assignedPastor:id,name',
                'assignedVolunteer.user:id,name',
            ])
            ->where('type', 'baptism')
            ->where('status', $statusFilter);

        if ($churchId !== null) {
            $query->where('church_id', $churchId);
        }

        $q = $request->query('q');
        if (is_string($q) && trim($q) !== '') {
            $term = trim($q);
            $query->where(function ($sub) use ($term) {
                SearchTerm::whereAnyColumnLike($sub, ['message', 'subject'], $term);
                $sub->orWhereHas('user', fn ($uq) => SearchTerm::whereAnyColumnLike($uq, ['name'], $term));
            });
        }

        $rows = $query
            ->orderByDesc('updated_at')
            ->limit(100)
            ->get()
            ->map(fn (ChurchSolicitation $s) => [
                'kind' => 'solicitation',
                'id' => $s->id,
                'tagLabel' => BaptismSolicitationStatus::label((string) $s->status),
                'type' => $s->type,
                'typeLabel' => MobileChurchSolicitationController::typeLabel($s->type),
                'status' => $s->status,
                'statusLabel' => BaptismSolicitationStatus::label((string) $s->status),
                'messageExcerpt' => mb_strimwidth(strip_tags($s->message), 0, 100, '…'),
                'preferredDate' => $s->preferred_date?->format('Y-m-d'),
                'updatedAt' => $s->updated_at?->toIso8601String(),
                'memberLabel' => $s->user?->name ?? 'Usuário',
            ])
            ->values()
            ->all();

        $countBase = ChurchSolicitation::query()->where('type', 'baptism');
        if ($churchId !== null) {
            $countBase->where('church_id', $churchId);
        }
        $tabCounts = [];
        foreach (BaptismSolicitationStatus::tabLabels() as $tabKey => $tabLabel) {
            $tabCounts[$tabKey] = (clone $countBase)
                ->where('status', BaptismSolicitationStatus::statusForTab($tabKey))
                ->count();
        }

        $modalDetail = $this->resolveBaptismModalDetail($request, $user, $churchId);

        return Inertia::render('BaptismRequests/Index', [
            'demands' => $rows,
            'baptismIndexUrl' => route('baptism-requests.index'),
            'baptismStoreUrl' => route('mobile.solicitations.store'),
            'modalDetail' => $modalDetail,
            'canManage' => $this->canManage($user),
            'filters' => [
                'aba' => $aba,
                'q' => is_string($q) ? (string) $q : '',
            ],
            'tabCounts' => $tabCounts,
            'tabs' => collect(BaptismSolicitationStatus::tabLabels())
                ->map(fn (string $label, string $key) => ['key' => $key, 'label' => $label])
                ->values()
                ->all(),
        ]);
    }

    public function archiveBaptism(Request $request, ChurchSolicitation $solicitation): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user && $this->canManage($user), 403);
        abort_unless($solicitation->type === 'baptism', 404);
        $this->authorize('archiveBaptismAsStaff', $solicitation);

        $churchId = Church::resolveWorkingId($request);
        if ($churchId !== null && (int) $solicitation->church_id !== (int) $churchId) {
            abort(404);
        }

        $solicitation->update([
            'status' => BaptismSolicitationStatus::ARCHIVED,
            'staff_archived_at' => null,
            'completed_at' => $solicitation->completed_at ?? now(),
        ]);

        return redirect()
            ->route('baptism-requests.index', $this->baptismIndexQueryFromRequest($request, [
                'aba' => 'arquivados',
                'modal_kind' => '',
                'modal_id' => '',
            ]))
            ->with('success', 'Registro de batismo arquivado.');
    }

    public function unarchiveBaptism(Request $request, ChurchSolicitation $solicitation): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user && $this->canManage($user), 403);
        abort_unless($solicitation->type === 'baptism', 404);
        $this->authorize('archiveBaptismAsStaff', $solicitation);

        $churchId = Church::resolveWorkingId($request);
        if ($churchId !== null && (int) $solicitation->church_id !== (int) $churchId) {
            abort(404);
        }

        $solicitation->update([
            'status' => BaptismSolicitationStatus::PENDING,
            'staff_archived_at' => null,
            'completed_at' => null,
        ]);

        return redirect()
            ->route('baptism-requests.index', $this->baptismIndexQueryFromRequest($request, ['aba' => 'pendente']))
            ->with('success', 'Registro de batismo restaurado como pendente.');
    }

    /**
     * @param  array<string, string|null>  $overrides
     * @return array<string, string>
     */
    private function baptismIndexQueryFromRequest(Request $request, array $overrides = []): array
    {
        $params = [];
        foreach (['aba', 'q', 'modal_kind', 'modal_id'] as $key) {
            if (array_key_exists($key, $overrides)) {
                $val = $overrides[$key];
                if (is_string($val) && $val !== '') {
                    $params[$key] = $val;
                }

                continue;
            }
            $val = $request->query($key);
            if (is_string($val) && $val !== '') {
                $params[$key] = $val;
            }
        }

        return $params;
    }

    /**
     * @return array{kind: string, payload: array<string, mixed>}|null
     */
    private function resolveBaptismModalDetail(Request $request, User $user, ?int $churchId): ?array
    {
        $modalKind = $request->query('modal_kind');
        $modalId = $request->query('modal_id');
        if (! is_string($modalId) || $modalId === '' || ! ctype_digit($modalId)) {
            $legacyModal = $request->query('modal');
            if (is_string($legacyModal) && $legacyModal !== '' && ctype_digit($legacyModal)) {
                $modalId = $legacyModal;
                $modalKind = 'solicitation';
            } else {
                return null;
            }
        }

        if ($modalKind !== null && $modalKind !== '' && $modalKind !== 'solicitation') {
            return null;
        }

        $modalQuery = ChurchSolicitation::query()->where('type', 'baptism');
        if ($churchId !== null) {
            $modalQuery->where('church_id', $churchId);
        }
        $modal = $modalQuery->find((int) $modalId);
        if ($modal === null) {
            return null;
        }

        return [
            'kind' => 'solicitation',
            'payload' => ChurchSolicitationModalPayloadPresenter::forBaptismAdmin(
                $modal,
                $user,
                $this->canManage($user),
                $this->canView($user),
            ),
        ];
    }

    public function update(Request $request, ChurchSolicitation $solicitation): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user && $this->canManage($user), 403);
        $this->authorize('update', $solicitation);

        $churchId = Church::resolveWorkingId($request);
        SolicitationAssignees::normalizeAssignmentRequest($request);

        $messageRules = $solicitation->type === 'volunteer_request'
            ? ['sometimes', 'nullable', 'string', 'max:5000']
            : ['sometimes', 'required', 'string', 'max:5000'];

        $statusRule = match ($solicitation->type) {
            'baptism' => ['sometimes', 'in:'.implode(',', BaptismSolicitationStatus::all())],
            MobileChurchSolicitationController::TYPE_VOLUNTEER_REQUEST,
            MobileChurchSolicitationController::TYPE_COMMUNICATION_REQUEST => ['sometimes', 'in:pending,in_progress,completed,cancelled'],
            default => ['sometimes', 'in:'.implode(',', PastoralSolicitationStatus::all())],
        };

        $valid = $request->validate(array_merge([
            'status' => $statusRule,
            'internal_notes' => ['nullable', 'string', 'max:10000'],
            'message' => $messageRules,
        ], SolicitationAssignees::assignmentRules($churchId)));

        SolicitationAssignees::assertSingleAssignee($valid);

        if (array_key_exists('message', $valid)) {
            $solicitation->message = trim((string) ($valid['message'] ?? ''));
        }
        if (array_key_exists('internal_notes', $valid)) {
            $solicitation->internal_notes = $valid['internal_notes'];
        }
        if (array_key_exists('status', $valid)) {
            $solicitation->status = $valid['status'];
            if ($solicitation->type === 'baptism') {
                if ($valid['status'] === BaptismSolicitationStatus::BAPTIZED) {
                    $solicitation->completed_at = now();
                } elseif (in_array($valid['status'], [BaptismSolicitationStatus::PENDING, BaptismSolicitationStatus::WAITING], true)) {
                    $solicitation->completed_at = null;
                }
                $solicitation->staff_archived_at = null;
            } elseif (in_array($solicitation->type, MobileChurchSolicitationController::TYPES_OUTSIDE_PASTORAL_INDEX, true)) {
                if ($valid['status'] === 'completed') {
                    $solicitation->completed_at = now();
                } elseif (in_array($valid['status'], ['pending', 'in_progress'], true)) {
                    $solicitation->completed_at = null;
                }
            } else {
                if ($valid['status'] === PastoralSolicitationStatus::COMPLETED) {
                    $solicitation->completed_at = now();
                } elseif (in_array($valid['status'], [PastoralSolicitationStatus::PENDING, PastoralSolicitationStatus::CANCELLED], true)) {
                    $solicitation->completed_at = null;
                } elseif ($valid['status'] === PastoralSolicitationStatus::ARCHIVED) {
                    $solicitation->completed_at = $solicitation->completed_at ?? now();
                }
                $solicitation->staff_archived_at = null;
            }
        }
        if (array_key_exists('preferred_date', $valid)) {
            $solicitation->preferred_date = $valid['preferred_date'];
        }
        if (array_key_exists('assigned_pastor_id', $valid)) {
            $pid = $valid['assigned_pastor_id'];
            $solicitation->assigned_pastor_id = $pid !== null ? (int) $pid : null;
        }
        if (array_key_exists('assigned_volunteer_id', $valid)) {
            $vid = $valid['assigned_volunteer_id'];
            $solicitation->assigned_volunteer_id = $vid !== null ? (int) $vid : null;
        }

        $solicitation->save();

        if ($solicitation->type === MobileChurchSolicitationController::TYPE_VOLUNTEER_REQUEST) {
            return redirect()->to(VolunteerRequestStaffRoutes::pipelinePedidosUrl())->with('success', 'Pedido atualizado.');
        }
        if ($solicitation->type === MobileChurchSolicitationController::TYPE_COMMUNICATION_REQUEST) {
            return redirect()->route('communication-requests.index')->with('success', 'Pedido atualizado.');
        }

        if ($solicitation->type === 'baptism') {
            $aba = BaptismSolicitationStatus::tabForStatus((string) $solicitation->status);

            return redirect()
                ->route('baptism-requests.index', $this->baptismIndexQueryFromRequest($request, [
                    'aba' => $aba,
                    'modal_kind' => 'solicitation',
                    'modal_id' => (string) $solicitation->id,
                ]))
                ->with('success', 'Registro de batismo atualizado.');
        }

        if (! in_array($solicitation->type, MobileChurchSolicitationController::TYPES_OUTSIDE_PASTORAL_INDEX, true)) {
            $aba = PastoralSolicitationStatus::tabForStatus((string) $solicitation->status);

            return redirect()
                ->route('solicitations.index', $this->solicitationsIndexQueryFromRequest($request, [
                    'aba' => $aba,
                    'modal_kind' => 'solicitation',
                    'modal_id' => (string) $solicitation->id,
                ]))
                ->with('success', 'Pedido atualizado.');
        }

        return $this->staffSolicitationModalRedirect($request, $solicitation);
    }

    public function sendMessage(Request $request, ChurchSolicitation $solicitation): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user, 401);

        $this->authorize('sendMessageAsStaff', $solicitation);

        $valid = $request->validate([
            'content' => ['required', 'string', 'max:5000'],
        ]);

        ChurchSolicitationMessage::create([
            'church_solicitation_id' => $solicitation->id,
            'sender_type' => 'staff',
            'sender_user_id' => $user->id,
            'content' => $valid['content'],
        ]);

        if ($solicitation->type === 'baptism' && $solicitation->status === BaptismSolicitationStatus::PENDING) {
            $solicitation->update(['status' => BaptismSolicitationStatus::WAITING]);
        } else {
            $solicitation->touch();
        }

        app(SolicitationChatNotifier::class)->notifyMemberOfStaffMessage($solicitation, $user, $valid['content']);

        if ((int) $solicitation->user_id === (int) $user->id) {
            $request->session()->flash(
                'success',
                'Mensagem registada. Tem uma notificação nova na caixa de entrada (ícone do sino).',
            );
        }

        $fallback = match ($solicitation->type) {
            MobileChurchSolicitationController::TYPE_VOLUNTEER_REQUEST => VolunteerRequestStaffRoutes::pipelinePedidosUrl(),
            MobileChurchSolicitationController::TYPE_COMMUNICATION_REQUEST => route('communication-requests.index'),
            'baptism' => $this->staffSolicitationModalUrl($request, $solicitation),
            default => $this->staffSolicitationModalUrl($request, $solicitation),
        };

        return redirect()->back(fallback: $fallback);
    }
}
