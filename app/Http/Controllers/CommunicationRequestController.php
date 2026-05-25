<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\ChurchSolicitation;
use App\Models\ChurchSolicitationMessage;
use App\Models\Ministry;
use App\Models\User;
use App\Services\CommunicationRequestAttachmentService;
use App\Services\SolicitationChatNotifier;
use App\Support\ChurchSolicitationModalPayloadPresenter;
use App\Support\CommunicationRequestOptions;
use App\Support\SearchTerm;
use App\Support\SolicitationAssignees;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class CommunicationRequestController extends Controller
{
    public function __construct(
        private readonly CommunicationRequestAttachmentService $attachments,
    ) {}

    private function churchId(Request $request): ?int
    {
        return Church::resolveWorkingId($request);
    }

    private function isLeaderAccount(User $user): bool
    {
        return (bool) ($user->is_ministry_leader ?? false) || $user->hasRole('lider_ministerio');
    }

    private function isStaff(User $user): bool
    {
        if ($user->hasAnyRole(['super_admin', 'admin'])) {
            return true;
        }

        return $user->hasAnyPermission(['solicitations.view', 'solicitations.manage']);
    }

    private function accessMode(User $user): string
    {
        if ($this->isStaff($user)) {
            return 'staff';
        }

        if ($this->isLeaderAccount($user)) {
            return 'leader';
        }

        abort(403);
    }

    private function assertCommunicationRequest(ChurchSolicitation $solicitation, int $churchId): void
    {
        abort_unless($solicitation->type === MobileChurchSolicitationController::TYPE_COMMUNICATION_REQUEST, 404);
        abort_unless((int) $solicitation->church_id === $churchId, 404);
    }

    /**
     * @return list<int>
     */
    private function linkedMinistryIdsForUser(User $user, int $churchId): array
    {
        return $user->ministries()
            ->where('ministries.church_id', $churchId)
            ->pluck('ministries.id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }

    /**
     * @return list<array{value: int, label: string}>
     */
    private function linkedMinistryOptionsForUser(User $user, int $churchId): array
    {
        return $user->ministries()
            ->where('ministries.church_id', $churchId)
            ->orderBy('ministries.name')
            ->get(['ministries.id', 'ministries.name'])
            ->map(fn (Ministry $m) => [
                'value' => (int) $m->id,
                'label' => (string) $m->name,
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedPayload(Request $request, User $user, int $churchId): array
    {
        $linkedMinistryIds = $this->linkedMinistryIdsForUser($user, $churchId);
        $rules = CommunicationRequestOptions::validationRules();
        $rules['ministry_id'] = ['nullable', 'integer', Rule::in($linkedMinistryIds)];

        $valid = $request->validate($rules);

        $ministryName = null;
        if (! empty($valid['ministry_id'])) {
            $ministryName = Ministry::query()
                ->where('church_id', $churchId)
                ->whereKey((int) $valid['ministry_id'])
                ->value('name');
            $ministryName = is_string($ministryName) ? trim($ministryName) : null;
            if ($ministryName === '') {
                $ministryName = null;
            }
        }
        $valid['ministry_name'] = $ministryName;

        return CommunicationRequestOptions::validatedPayload($valid);
    }

    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');

        $mode = $this->accessMode($user);
        $query = ChurchSolicitation::query()
            ->where('church_id', (int) $churchId)
            ->where('type', MobileChurchSolicitationController::TYPE_COMMUNICATION_REQUEST)
            ->with(['user:id,name,photo_url']);

        if ($mode === 'leader') {
            $query->where('user_id', $user->id);
        } else {
            $showArchived = $request->query('arquivados') === '1';
            if ($showArchived) {
                $query->whereNotNull('staff_archived_at');
            } else {
                $query->whereNull('staff_archived_at');
            }
        }

        $status = $request->query('status');
        if (is_string($status) && $status !== '') {
            $query->where('status', $status);
        }

        $demandType = $request->query('demand_type');
        if (is_string($demandType) && $demandType !== '') {
            $query->where('meta->communication_demand_type', $demandType);
        }

        $priority = $request->query('priority');
        if (is_string($priority) && $priority !== '') {
            $query->where('meta->communication_priority', $priority);
        }

        $q = $request->query('q');
        if (is_string($q) && trim($q) !== '') {
            $term = trim($q);
            $query->where(function ($sub) use ($term) {
                SearchTerm::whereAnyColumnLike($sub, ['subject', 'message'], $term);
                $sub->orWhereHas('user', fn ($uq) => SearchTerm::whereAnyColumnLike($uq, ['name'], $term));
            });
        }

        $rows = $query
            ->orderByDesc('updated_at')
            ->limit(120)
            ->get(['id', 'subject', 'message', 'status', 'created_at', 'preferred_date', 'meta', 'user_id'])
            ->map(function (ChurchSolicitation $s) use ($mode, $user) {
                $meta = $s->meta ?? [];
                $demandType = (string) ($meta['communication_demand_type'] ?? '');
                $priority = (string) ($meta['communication_priority'] ?? 'medium');
                $canEdit = $mode === 'staff'
                    ? $user->can('manageCommunicationRequestAsStaff', $s)
                    : $user->can('updateCommunicationRequestAsSubmitter', $s);

                return [
                    'id' => (int) $s->id,
                    'subject' => (string) $s->subject,
                    'message_preview' => Str::limit(trim((string) $s->message), 160),
                    'status' => (string) $s->status,
                    'status_label' => MobileChurchSolicitationController::statusLabel((string) $s->status),
                    'created_at' => $s->created_at?->toIso8601String(),
                    'preferred_date' => $s->preferred_date?->toDateString(),
                    'event_date' => $meta['communication_event_date'] ?? null,
                    'ministry_name' => $meta['communication_ministry_name'] ?? null,
                    'demand_type' => $demandType,
                    'demand_type_label' => CommunicationRequestOptions::demandTypeLabel($demandType),
                    'priority' => $priority,
                    'priority_label' => CommunicationRequestOptions::priorityLabel($priority),
                    'requester_name' => $s->user?->name,
                    'requester_photo_url' => $s->user?->photo_url,
                    'can_edit' => $canEdit,
                    'panel_json_url' => route('communication-requests.panel', $s),
                ];
            })
            ->values()
            ->all();

        return Inertia::render('CommunicationRequests/Index', [
            'mode' => $mode,
            'rows' => $rows,
            'ministryOptions' => $this->linkedMinistryOptionsForUser($user, (int) $churchId),
            'storeUrl' => route('communication-requests.store'),
            'demandTypeOptions' => CommunicationRequestOptions::toSelectOptions(CommunicationRequestOptions::DEMAND_TYPES),
            'priorityOptions' => CommunicationRequestOptions::toSelectOptions(CommunicationRequestOptions::PRIORITIES),
            'artChannelOptions' => CommunicationRequestOptions::toSelectOptions(CommunicationRequestOptions::ART_CHANNELS),
            'coverageSupportOptions' => CommunicationRequestOptions::toSelectOptions(CommunicationRequestOptions::COVERAGE_SUPPORT),
            'maxAttachments' => (int) config('communication.max_attachments', 8),
            'filters' => [
                'status' => is_string($status) ? $status : '',
                'demand_type' => is_string($demandType) ? $demandType : '',
                'priority' => is_string($priority) ? $priority : '',
                'q' => is_string($q) ? $q : '',
                'arquivados' => $mode === 'staff' && $request->query('arquivados') === '1',
            ],
            'indexUrl' => route('communication-requests.index'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');
        $this->accessMode($user);

        $payload = $this->validatedPayload($request, $user, (int) $churchId);

        $solicitation = ChurchSolicitation::query()->create([
            'church_id' => (int) $churchId,
            'user_id' => (int) $user->id,
            'type' => MobileChurchSolicitationController::TYPE_COMMUNICATION_REQUEST,
            'status' => 'pending',
            'subject' => $payload['subject'],
            'message' => $payload['message'],
            'preferred_date' => $payload['preferred_date'],
            'meta' => $payload['meta'],
        ]);

        $storedAttachments = $this->attachments->storeFromRequest($request, $solicitation);
        if ($storedAttachments !== []) {
            $meta = $solicitation->meta ?? [];
            $meta['communication_attachments'] = $storedAttachments;
            $solicitation->meta = $meta;
            $solicitation->save();
        }

        app(SolicitationChatNotifier::class)->notifyCommunicationTeamOfNewRequest($solicitation->fresh(), (int) $churchId);

        return redirect()->route('communication-requests.index')
            ->with('success', 'Solicitação de comunicação enviada com sucesso.');
    }

    public function panelJson(Request $request, ChurchSolicitation $solicitation): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');
        $this->assertCommunicationRequest($solicitation, (int) $churchId);

        $mode = $this->accessMode($user);
        if ($mode === 'staff') {
            $this->authorize('manageCommunicationRequestAsStaff', $solicitation);
            $payload = ChurchSolicitationModalPayloadPresenter::forSolicitationsAdmin($solicitation, $user, true, true);
        } else {
            abort_unless((int) $solicitation->user_id === (int) $user->id, 403);
            $payload = ChurchSolicitationModalPayloadPresenter::forCommunicationRequestLeader($solicitation, $user);
        }

        return response()->json($payload);
    }

    public function storeMessageLeader(Request $request, ChurchSolicitation $solicitation): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');
        $this->assertCommunicationRequest($solicitation, (int) $churchId);
        $this->accessMode($user);
        $this->authorize('chatCommunicationRequestAsSubmitter', $solicitation);
        abort_unless($solicitation->allowsChat(), 403);

        $valid = $request->validate([
            'content' => ['required', 'string', 'max:5000'],
        ]);

        ChurchSolicitationMessage::query()->create([
            'church_solicitation_id' => $solicitation->id,
            'sender_type' => 'member',
            'sender_user_id' => $user->id,
            'content' => $valid['content'],
        ]);

        if (in_array($solicitation->status, ['pending'], true)) {
            $solicitation->update(['status' => 'in_progress']);
        } else {
            $solicitation->touch();
        }

        app(SolicitationChatNotifier::class)->notifyStaffOfMemberMessage($solicitation, $user);

        return redirect()->back(fallback: route('communication-requests.index'));
    }

    public function update(Request $request, ChurchSolicitation $solicitation): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');
        $this->assertCommunicationRequest($solicitation, (int) $churchId);

        if ($user->can('manageCommunicationRequestAsStaff', $solicitation)) {
            SolicitationAssignees::normalizeAssignmentRequest($request);
            $valid = $request->validate(array_merge([
                'status' => ['sometimes', 'in:pending,in_progress,completed,cancelled'],
                'internal_notes' => ['nullable', 'string', 'max:10000'],
                'message' => ['sometimes', 'required', 'string', 'max:5000'],
                'preferred_date' => ['sometimes', 'nullable', 'date'],
            ], SolicitationAssignees::assignmentRules((int) $churchId)));
            SolicitationAssignees::assertSingleAssignee($valid);

            if (array_key_exists('message', $valid)) {
                $solicitation->message = trim((string) ($valid['message'] ?? ''));
            }
            if (array_key_exists('internal_notes', $valid)) {
                $solicitation->internal_notes = $valid['internal_notes'];
            }
            if (array_key_exists('status', $valid)) {
                $solicitation->status = $valid['status'];
                if ($valid['status'] === 'completed') {
                    $solicitation->completed_at = now();
                } elseif (in_array($valid['status'], ['pending', 'in_progress'], true)) {
                    $solicitation->completed_at = null;
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

            return redirect()->route('communication-requests.index')->with('success', 'Pedido atualizado.');
        }

        $this->authorize('updateCommunicationRequestAsSubmitter', $solicitation);

        if ($solicitation->status !== 'pending') {
            throw ValidationException::withMessages([
                'message' => ['Só é possível alterar pedidos pendentes.'],
            ]);
        }

        $payload = $this->validatedPayload($request, $user, (int) $churchId);
        $meta = $payload['meta'];
        $existingAttachments = ($solicitation->meta ?? [])['communication_attachments'] ?? [];
        if (is_array($existingAttachments) && $existingAttachments !== []) {
            $meta['communication_attachments'] = $existingAttachments;
        }

        $newAttachments = $this->attachments->storeFromRequest($request, $solicitation);
        if ($newAttachments !== []) {
            $merged = is_array($meta['communication_attachments'] ?? null)
                ? $meta['communication_attachments']
                : [];
            $meta['communication_attachments'] = array_merge($merged, $newAttachments);
        }

        $solicitation->meta = $meta;
        $solicitation->subject = $payload['subject'];
        $solicitation->message = $payload['message'];
        $solicitation->preferred_date = $payload['preferred_date'];
        $solicitation->save();

        return redirect()->route('communication-requests.index')->with('success', 'Pedido atualizado.');
    }

    public function archiveStaff(Request $request, ChurchSolicitation $solicitation): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');
        $this->assertCommunicationRequest($solicitation, (int) $churchId);
        $this->accessMode($user);
        $this->authorize('archiveCommunicationRequestAsStaff', $solicitation);

        $solicitation->update(['staff_archived_at' => now()]);

        return redirect()
            ->route('communication-requests.index')
            ->with('success', 'Solicitação de comunicação arquivada.');
    }

    public function unarchiveStaff(Request $request, ChurchSolicitation $solicitation): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');
        $this->assertCommunicationRequest($solicitation, (int) $churchId);
        $this->accessMode($user);
        $this->authorize('archiveCommunicationRequestAsStaff', $solicitation);

        $solicitation->update(['staff_archived_at' => null]);

        return redirect()
            ->route('communication-requests.index', ['arquivados' => '1'])
            ->with('success', 'Solicitação de comunicação restaurada na lista ativa.');
    }

    public function destroy(Request $request, ChurchSolicitation $solicitation): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');
        $this->assertCommunicationRequest($solicitation, (int) $churchId);

        if ($user->can('manageCommunicationRequestAsStaff', $solicitation)) {
            if ($solicitation->status !== 'pending') {
                throw ValidationException::withMessages([
                    'solicitation' => ['Só é possível excluir pedidos pendentes.'],
                ]);
            }
            $solicitation->delete();

            return redirect()->route('communication-requests.index')->with('success', 'Pedido removido.');
        }

        $this->authorize('deleteCommunicationRequestAsSubmitter', $solicitation);
        $solicitation->delete();

        return redirect()->route('communication-requests.index')->with('success', 'Pedido removido.');
    }
}
