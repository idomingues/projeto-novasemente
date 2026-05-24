<?php

namespace App\Http\Controllers;

use App\Models\AppSupportMessage;
use App\Models\AppSupportTicket;
use App\Models\User;
use App\Services\SupportTicketChatNotifier;
use App\Support\SupportTicketAdminPresenter;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class SupportAdminController extends Controller
{
    private function isSuperAdmin(User $user): bool
    {
        return $user->hasRole('super_admin');
    }

    private function canViewSupport(User $user): bool
    {
        return $this->isSuperAdmin($user) || $user->hasAnyPermission(['support.view', 'support.manage']);
    }

    private function canManageSupport(User $user): bool
    {
        return $this->isSuperAdmin($user) || $user->hasPermissionTo('support.manage');
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user && $this->isSuperAdmin($user), 403);

        $valid = $request->validate([
            'message' => ['required', 'string', 'max:5000'],
        ]);

        $ticket = AppSupportTicket::create([
            'public_token' => Str::uuid()->toString(),
            'user_id' => $user->id,
            'type' => 'development',
            'message' => $valid['message'],
            'guest_name' => null,
            'guest_email' => null,
            'guest_phone' => null,
            'status' => AppSupportTicket::STATUS_OPEN,
        ]);

        return redirect()->route('support.index', ['status' => AppSupportTicket::STATUS_OPEN, 'modal' => $ticket->public_token]);
    }

    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user && $this->canViewSupport($user), 403);
        $statusFilter = (string) ($request->query('status') ?? AppSupportTicket::STATUS_OPEN);
        if ($statusFilter !== 'all' && ! in_array($statusFilter, AppSupportTicket::statuses(), true)) {
            $statusFilter = AppSupportTicket::STATUS_OPEN;
        }
        $tickets = AppSupportTicket::query()
            ->with('user:id,name')
            ->when($statusFilter !== 'all', fn ($q) => $q->where('status', $statusFilter))
            ->orderByDesc('updated_at')
            ->limit(50)
            ->get()
            ->map(fn (AppSupportTicket $t) => [
                'publicToken' => $t->public_token,
                'type' => $t->type,
                'typeLabel' => SupportTicketAdminPresenter::typeLabel($t->type),
                'status' => $t->status,
                'statusLabel' => SupportTicketAdminPresenter::statusLabel((string) $t->status),
                'message' => $t->message,
                'solutionText' => $t->solution_text,
                'forecastAt' => $t->forecast_at?->toDateString(),
                'createdAt' => $t->created_at?->toIso8601String(),
                'updatedAt' => $t->updated_at?->toIso8601String(),
                'ownerLabel' => $t->user_id
                    ? ($t->user?->name ?? 'Usuário')
                    : ($t->guest_name ?? 'Convidado'),
            ])
            ->values()
            ->all();

        $statusCounts = AppSupportTicket::query()
            ->selectRaw('status, COUNT(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status')
            ->map(fn ($count) => (int) $count)
            ->all();
        $totalCount = array_sum($statusCounts);

        $modalDetail = null;
        $modalToken = $request->query('modal');
        if (is_string($modalToken) && $modalToken !== '') {
            $modalTicket = AppSupportTicket::query()->where('public_token', $modalToken)->first();
            if ($modalTicket) {
                $modalDetail = SupportTicketAdminPresenter::adminPayload($modalTicket, $user);
            }
        }

        return Inertia::render('Support/Index', [
            'tickets' => $tickets,
            'devItemStoreUrl' => route('support.store'),
            'supportIndexUrl' => route('support.index'),
            'modalDetail' => $modalDetail,
            'canCreateDevItem' => $this->isSuperAdmin($user),
            'statusFilter' => $statusFilter,
            'statusOptions' => array_merge(
                [['value' => 'all', 'label' => 'Todos', 'count' => $totalCount]],
                array_map(
                    fn (array $opt) => [
                        ...$opt,
                        'count' => $statusCounts[$opt['value']] ?? 0,
                    ],
                    SupportTicketAdminPresenter::statusOptions()
                )
            ),
        ]);
    }

    public function show(Request $request, string $token): Response
    {
        $user = $request->user();
        abort_unless($user && $this->canViewSupport($user), 403);
        $ticket = AppSupportTicket::query()->where('public_token', $token)->firstOrFail();

        return Inertia::render('Support/Show', SupportTicketAdminPresenter::adminPayload($ticket, $user));
    }

    public function update(Request $request, string $token): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user && $this->canManageSupport($user), 403);

        $ticket = AppSupportTicket::query()->where('public_token', $token)->firstOrFail();
        $previousStatus = (string) $ticket->status;
        $previousSolution = trim((string) ($ticket->solution_text ?? ''));

        $valid = $request->validate([
            'message' => ['sometimes', 'required', 'string', 'max:5000'],
            'status' => ['sometimes', 'string', 'in:'.implode(',', AppSupportTicket::statuses())],
            'solution_text' => ['nullable', 'string', 'max:5000'],
            'forecast_at' => ['nullable', 'date'],
        ]);

        if (array_key_exists('message', $valid)) {
            $ticket->message = $valid['message'];
        }

        $forecastChangedToDate = null;
        if (array_key_exists('forecast_at', $valid)) {
            $incoming = isset($valid['forecast_at']) && $valid['forecast_at'] !== null && $valid['forecast_at'] !== ''
                ? Carbon::parse((string) $valid['forecast_at'])->startOfDay()
                : null;
            $previous = $ticket->forecast_at?->toDateString();
            $next = $incoming?->toDateString();
            if ($previous !== $next) {
                $ticket->forecast_at = $incoming;
                if ($incoming !== null) {
                    $forecastChangedToDate = $incoming;
                }
            }
        }

        $solutionChanged = false;
        if (array_key_exists('solution_text', $valid) && ! array_key_exists('status', $valid)) {
            $draftSolution = trim((string) ($valid['solution_text'] ?? ''));
            $ticket->solution_text = $draftSolution !== '' ? $draftSolution : null;
            $solutionChanged = trim((string) ($ticket->solution_text ?? '')) !== $previousSolution;
        }

        $statusChanged = false;
        if (array_key_exists('status', $valid)) {
            $nextStatus = (string) $valid['status'];
            $statusChanged = $nextStatus !== $previousStatus;
            $solution = isset($valid['solution_text']) ? trim((string) $valid['solution_text']) : '';

            if (AppSupportTicket::isFinalStatus($nextStatus)) {
                if ($solution === '' && trim((string) ($ticket->solution_text ?? '')) === '') {
                    return redirect()->back()->withErrors([
                        'solution_text' => 'Informe a solução para finalizar a demanda.',
                    ]);
                }
                if ($solution !== '') {
                    $ticket->solution_text = $solution;
                }
            }

            $ticket->status = $nextStatus;
            if (AppSupportTicket::isActiveStatus($nextStatus)) {
                $ticket->closed_at = null;
                if ($nextStatus === AppSupportTicket::STATUS_OPEN) {
                    $ticket->solution_text = null;
                }
            } elseif ($ticket->closed_at === null) {
                $ticket->closed_at = now();
            }

            $solutionChanged = $solutionChanged
                || trim((string) ($ticket->solution_text ?? '')) !== $previousSolution;
        }

        $ticket->save();

        $notifier = app(SupportTicketChatNotifier::class);
        if ($forecastChangedToDate !== null) {
            $notifier->notifyOwnerOfForecastSet($ticket, $user, $forecastChangedToDate);
        }

        if ($statusChanged || $solutionChanged) {
            $notifier->notifyOwnerOfTicketUpdate($ticket, $user, $statusChanged, $solutionChanged);
        }

        return redirect()->route('support.index', ['status' => $ticket->status, 'modal' => $token]);
    }

    public function destroy(Request $request, string $token): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user && $this->canManageSupport($user), 403);

        $ticket = AppSupportTicket::query()->where('public_token', $token)->firstOrFail();
        $ticket->delete();

        return redirect()->route('support.index');
    }

    public function sendMessage(Request $request, string $token): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user && $this->canManageSupport($user), 403);

        $ticket = AppSupportTicket::query()->where('public_token', $token)->firstOrFail();
        abort_unless(AppSupportTicket::isActiveStatus((string) $ticket->status), 400);
        $staffPastoralThread = $ticket->type === 'pastoral'
            && empty($ticket->user_id)
            && ! empty($ticket->pastoral_appointment_id);
        abort_unless(
            ! empty($ticket->user_id) || $staffPastoralThread,
            400,
            'Chat indisponível para chamados sem usuário logado.'
        );

        $valid = $request->validate([
            'content' => ['required', 'string', 'max:5000'],
        ]);

        AppSupportMessage::create([
            'ticket_id' => $ticket->id,
            'sender_type' => 'admin',
            'sender_user_id' => $user->id,
            'content' => $valid['content'],
        ]);

        app(SupportTicketChatNotifier::class)->notifyOwnerOfStaffMessage($ticket, $user, $valid['content']);

        if ($ticket->user_id && (int) $ticket->user_id === (int) $user->id) {
            $request->session()->flash(
                'success',
                'Mensagem registada. Tem uma notificação nova na caixa de entrada (ícone do sino).',
            );
        }

        return redirect()->back(fallback: route('support.show', ['token' => $token]));
    }

    public function closeTicket(Request $request, string $token): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user && $this->canManageSupport($user), 403);

        $ticket = AppSupportTicket::query()->where('public_token', $token)->firstOrFail();
        abort_unless(AppSupportTicket::isActiveStatus((string) $ticket->status), 400);

        $valid = $request->validate([
            'solution_text' => ['required', 'string', 'max:5000'],
        ]);

        $ticket->update([
            'status' => AppSupportTicket::STATUS_CLOSED,
            'closed_at' => now(),
            'solution_text' => $valid['solution_text'],
        ]);

        app(SupportTicketChatNotifier::class)->notifyOwnerOfTicketUpdate(
            $ticket->fresh(),
            $user,
            true,
            trim((string) $valid['solution_text']) !== '',
        );

        return redirect()->back(fallback: route('support.show', ['token' => $token]));
    }
}
