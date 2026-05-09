<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\ChurchSolicitation;
use App\Models\ChurchSolicitationMessage;
use App\Models\PastoralAppointment;
use App\Models\User;
use App\Services\SolicitationChatNotifier;
use App\Support\ChurchSolicitationModalPayloadPresenter;
use App\Support\SolicitationAssignees;
use App\Support\SupportTicketAdminPresenter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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

        return ChurchSolicitationModalPayloadPresenter::forSolicitationsAdmin(
            $s,
            $user,
            $user ? $this->canManage($user) : false,
            $user ? $this->canView($user) : false,
        );
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
            $params['type'] = 'baptism';
        }

        return route('solicitations.index', $params);
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

        $solRows = [];
        if ($kindStr !== 'pastoral') {
            $query = ChurchSolicitation::query()->with([
                'user:id,name',
                'assignedPastor:id,name',
                'assignedVolunteer.user:id,name',
            ]);
            if ($churchId !== null) {
                $query->where('church_id', $churchId);
            }

            $query->where('type', '!=', MobileChurchSolicitationController::TYPE_VOLUNTEER_REQUEST);

            if (is_string($type) && $type !== '') {
                $query->where('type', $type);
            }

            $status = $request->query('status');
            if (is_string($status) && $status !== '') {
                $query->where('status', $status);
            }

            $q = $request->query('q');
            if (is_string($q) && trim($q) !== '') {
                $needle = '%'.str_replace(['%', '_'], ['\\%', '\\_'], trim($q)).'%';
                $query->where(function ($sub) use ($needle) {
                    $sub->where('message', 'like', $needle)
                        ->orWhere('subject', 'like', $needle)
                        ->orWhereHas('user', fn ($uq) => $uq->where('name', 'like', $needle));
                });
            }

            $solRows = $query
                ->orderByDesc('updated_at')
                ->limit(100)
                ->get()
                ->map(fn (ChurchSolicitation $s) => [
                    'kind' => 'solicitation',
                    'id' => $s->id,
                    'tagLabel' => 'Solicitação',
                    'type' => $s->type,
                    'typeLabel' => MobileChurchSolicitationController::typeLabel($s->type),
                    'status' => $s->status,
                    'statusLabel' => MobileChurchSolicitationController::statusLabel($s->status),
                    'messageExcerpt' => mb_strimwidth(strip_tags($s->message), 0, 100, '…'),
                    'preferredDate' => $s->preferred_date?->format('Y-m-d'),
                    'updatedAt' => $s->updated_at?->toIso8601String(),
                    'memberLabel' => $s->user?->name ?? 'Usuário',
                ])
                ->values()
                ->all();
        }

        $pastoralRows = [];
        $omitPastoralMerge = ($kindStr === 'solicitation')
            || ($kindStr === '' && is_string($type) && $type !== '');
        if (! $omitPastoralMerge && $this->canViewPastoral($user)) {
            $pQuery = PastoralAppointment::query()
                ->with(['requesterUser:id,name', 'preferredPastor:id,name', 'supportTicket:id,public_token'])
                ->orderByDesc('updated_at')
                ->limit(100);

            $pStatus = $request->query('status');
            if (is_string($pStatus) && $pStatus !== '' && in_array($pStatus, ['pending', 'confirmed', 'cancelled', 'completed'], true)) {
                $pQuery->where('status', $pStatus);
            }

            $pNeedle = $request->query('q');
            if (is_string($pNeedle) && trim($pNeedle) !== '') {
                $needle = '%'.str_replace(['%', '_'], ['\\%', '\\_'], trim($pNeedle)).'%';
                $pQuery->where(function ($sub) use ($needle) {
                    $sub->where('subject', 'like', $needle)
                        ->orWhere('notes', 'like', $needle)
                        ->orWhereHas('requesterUser', fn ($uq) => $uq->where('name', 'like', $needle));
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
                if ($modal && $modal->type !== MobileChurchSolicitationController::TYPE_VOLUNTEER_REQUEST) {
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
                if ($modal && $modal->type !== MobileChurchSolicitationController::TYPE_VOLUNTEER_REQUEST) {
                    $modalDetail = [
                        'kind' => 'solicitation',
                        'payload' => $this->solicitationModalPayload($modal, $user),
                    ];
                }
            }
        }

        return Inertia::render('Solicitations/Index', [
            'demands' => $rows,
            'solicitationsIndexUrl' => route('solicitations.index'),
            'modalDetail' => $modalDetail,
            'canManage' => $this->canManage($user),
            'filters' => [
                'type' => is_string($type) ? $type : '',
                'status' => is_string($request->query('status')) ? (string) $request->query('status') : '',
                'q' => is_string($request->query('q')) ? (string) $request->query('q') : '',
            ],
            'typeOptions' => [
                ['value' => '', 'label' => 'Todos os tipos'],
                ['value' => 'baptism', 'label' => 'Pedido de batismo'],
                ['value' => 'baby_presentation', 'label' => 'Apresentação de bebé'],
                ['value' => 'pastor_visit', 'label' => 'Visita aos pastores'],
                ['value' => 'leader_chat', 'label' => 'Conversa com líder'],
                ['value' => 'communication_request', 'label' => 'Solicitação de comunicação'],
            ],
            'statusOptions' => [
                ['value' => '', 'label' => 'Todos os estados'],
                ['value' => 'pending', 'label' => 'Pendente'],
                ['value' => 'in_progress', 'label' => 'Em tratamento'],
                ['value' => 'completed', 'label' => 'Concluído'],
                ['value' => 'cancelled', 'label' => 'Cancelado'],
            ],
        ]);
    }

    /**
     * URL legada: redireciona para o painel unificado de solicitações (filtro batismo).
     */
    public function baptismIndex(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user && $this->canView($user), 403);

        $carry = [];
        foreach (['modal_kind', 'modal_id', 'modal', 'status', 'q'] as $key) {
            $val = $request->query($key);
            if (is_string($val) && $val !== '') {
                $carry[$key] = $val;
            }
        }

        return redirect()->route('solicitations.index', array_merge(
            ['type' => 'baptism'],
            $carry
        ));
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

        $valid = $request->validate(array_merge([
            'status' => ['sometimes', 'in:pending,in_progress,completed,cancelled'],
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

        if ($solicitation->type === MobileChurchSolicitationController::TYPE_VOLUNTEER_REQUEST) {
            return redirect()->route('volunteer-requests.staff.index')->with('success', 'Pedido atualizado.');
        }
        if ($solicitation->type === MobileChurchSolicitationController::TYPE_COMMUNICATION_REQUEST) {
            return redirect()->route('communication-requests.index')->with('success', 'Pedido atualizado.');
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

        if (in_array($solicitation->status, ['pending'], true)) {
            $solicitation->update(['status' => 'in_progress']);
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

        $fallback = $solicitation->type === MobileChurchSolicitationController::TYPE_VOLUNTEER_REQUEST
            ? route('volunteer-requests.staff.index')
            : ($solicitation->type === MobileChurchSolicitationController::TYPE_COMMUNICATION_REQUEST
                ? route('communication-requests.index')
                : $this->staffSolicitationModalUrl($request, $solicitation));

        return redirect()->back(fallback: $fallback);
    }
}
