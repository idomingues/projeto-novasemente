<?php

namespace App\Http\Controllers;

use App\Models\AppSupportMessage;
use App\Models\Church;
use App\Models\Pastor;
use App\Models\PastoralAppointment;
use App\Models\PastoralAvailability;
use App\Support\PastoralAppointmentConversation;
use App\Support\PastoralBookingInertiaProps;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class MobilePastoralAppointmentController extends Controller
{
    private function churchId(Request $request): ?int
    {
        return Church::resolveWorkingId($request);
    }

    public function hub(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user, 401);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');

        $booking = PastoralBookingInertiaProps::forRequest($request);
        abort_unless($booking !== null, 404, 'Nenhuma igreja ativa.');

        $appointmentsQuery = PastoralAppointment::query()
            ->where('church_id', $churchId)
            ->where('requester_user_id', (int) $user->id)
            ->with(['preferredPastor:id,name', 'supportTicket:id,public_token'])
            ->orderByDesc('created_at')
            ->limit(80);

        $appointments = $appointmentsQuery
            ->get()
            ->map(fn (PastoralAppointment $a) => [
                'id' => $a->id,
                'status' => $a->status,
                'subject' => $a->subject,
                'notesPreview' => Str::limit((string) ($a->notes ?? ''), 120),
                'preferredStart' => $a->preferred_start?->toIso8601String(),
                'preferredModality' => $a->preferred_modality,
                'pastorName' => $a->preferredPastor?->name,
                'createdAt' => $a->created_at?->toIso8601String(),
            ])
            ->values()
            ->all();

        $modal = null;
        $appointmentId = $request->query('appointment');
        if (is_string($appointmentId) && $appointmentId !== '' && ctype_digit($appointmentId)) {
            $apt = PastoralAppointment::query()
                ->where('church_id', $churchId)
                ->where('requester_user_id', (int) $user->id)
                ->with(['preferredPastor:id,name', 'supportTicket:id,public_token,status,user_id,message,solution_text,created_at,closed_at'])
                ->find((int) $appointmentId);

            if ($apt) {
                $ticket = $apt->supportTicket ?: PastoralAppointmentConversation::ensureTicket($apt);
                $apt->refresh();
                $apt->loadMissing(['supportTicket:id,public_token,status,user_id,message,solution_text,created_at,closed_at']);
                $ticket = $apt->supportTicket;

                $messages = [];
                if ($ticket) {
                    $messages = AppSupportMessage::query()
                        ->where('ticket_id', $ticket->id)
                        ->with('senderUser:id,name')
                        ->orderBy('created_at')
                        ->get()
                        ->map(fn (AppSupportMessage $m) => [
                            'id' => $m->id,
                            'senderType' => $m->sender_type,
                            'senderUserId' => $m->sender_user_id,
                            'senderName' => $m->senderUser?->name,
                            'content' => $m->content,
                            'createdAt' => $m->created_at?->toIso8601String(),
                        ])
                        ->values()
                        ->all();
                }

                $hasOwner = $ticket && ! empty($ticket->user_id);
                $isOwner = $ticket && (int) $ticket->user_id === (int) $user->id;
                $canChat = (bool) $hasOwner && (bool) $isOwner && $ticket->status === 'open';

                $modal = [
                    'appointment' => [
                        'id' => $apt->id,
                        'status' => $apt->status,
                        'requesterName' => $apt->requester_name,
                        'preferredPastorId' => $apt->preferred_pastor_id,
                        'preferredStart' => $apt->preferred_start?->toIso8601String(),
                        'preferredModality' => $apt->preferred_modality,
                        'subject' => $apt->subject,
                        'notes' => $apt->notes,
                        'pastorName' => $apt->preferredPastor?->name,
                        'updateUrl' => route('mobile.pastoral-appointments.update', $apt),
                        'createdAt' => $apt->created_at?->toIso8601String(),
                    ],
                    'ticket' => $ticket ? [
                        'publicToken' => $ticket->public_token,
                        'status' => $ticket->status,
                        'message' => $ticket->message,
                        'solutionText' => $ticket->solution_text,
                        'createdAt' => $ticket->created_at?->toIso8601String(),
                        'closedAt' => $ticket->closed_at?->toIso8601String(),
                    ] : null,
                    'messages' => $messages,
                    'canChat' => $canChat,
                    'messageStoreUrl' => $ticket ? route('mobile.support.messages.store', ['token' => $ticket->public_token]) : null,
                ];
            }
        }

        $editPastors = null;
        if ($modal !== null) {
            $editPayload = PastoralBookingInertiaProps::pastorPayload($request, (int) $modal['appointment']['id']);
            $editPastors = $editPayload['pastors'];
        }

        return Inertia::render('Mobile/PastoralAppointmentsHub', [
            'appointments' => $appointments,
            'pastors' => $booking['pastors'],
            'editPastors' => $editPastors,
            'storeUrl' => $booking['storeUrl'],
            'defaultRequesterName' => $booking['defaultRequesterName'],
            'modalDetail' => $modal,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user, 401);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404);

        $valid = $request->validate(
            [
                'requester_name' => ['nullable', 'string', 'max:255'],
                'preferred_pastor_id' => ['required', 'integer', Rule::exists('pastors', 'id')->where('church_id', $churchId)],
                'subject' => ['nullable', 'string', 'max:255'],
                'notes' => ['nullable', 'string', 'max:5000'],
                'preferred_start' => ['nullable', 'string', 'max:64'],
                'preferred_modality' => ['nullable', 'string', Rule::in(['presential', 'online'])],
            ],
            [
                'preferred_pastor_id.required' => 'Selecione o pastor.',
                'preferred_pastor_id.exists' => 'O pastor indicado não é válido para esta igreja.',
            ],
        );

        $pastor = Pastor::query()
            ->where('church_id', $churchId)
            ->where('id', (int) $valid['preferred_pastor_id'])
            ->firstOrFail();

        $preferredRaw = $request->input('preferred_start');
        $preferredStart = null;
        $preferredModality = null;
        $from = Carbon::now((string) config('app.timezone'))->startOfMinute();

        if (PastoralAvailability::freeUpcomingCollection((int) $churchId, (int) $pastor->id, $from)->isEmpty()) {
            throw ValidationException::withMessages([
                'preferred_pastor_id' => 'Não é possível enviar o pedido: não há horários livres na agenda deste pastor.',
            ]);
        }

        if ($preferredRaw === null || $preferredRaw === '') {
            throw ValidationException::withMessages([
                'preferred_start' => 'Selecione um dos horários disponíveis.',
            ]);
        }
        if (! PastoralAvailability::preferredStartIsAllowed((string) $preferredRaw, (int) $churchId, (int) $pastor->id, $from, 90, null)) {
            throw ValidationException::withMessages([
                'preferred_start' => 'Escolha um dos horários livres disponíveis para este pastor.',
            ]);
        }
        $preferredStart = Carbon::parse((string) $preferredRaw);
        $meta = PastoralAvailability::findSlotMetadata((string) $preferredRaw, (int) $churchId, (int) $pastor->id, $from, 90, null);
        $slotModality = $meta['modality'] ?? 'both';
        if ($slotModality === 'both') {
            $m = $valid['preferred_modality'] ?? null;
            if ($m !== 'presential' && $m !== 'online') {
                throw ValidationException::withMessages([
                    'preferred_modality' => 'Indique se prefere atendimento presencial ou online.',
                ]);
            }
            $preferredModality = $m;
        } else {
            $preferredModality = $slotModality;
        }

        $requesterName = trim((string) ($valid['requester_name'] ?? ''));
        if ($requesterName === '') {
            $requesterName = $user->name;
        }

        $appointment = PastoralAppointment::create([
            'church_id' => $churchId,
            'requester_user_id' => (int) $user->id,
            'requester_name' => $requesterName,
            'preferred_pastor_id' => (int) $valid['preferred_pastor_id'],
            'created_by_user_id' => (int) $user->id,
            'source' => 'member_request',
            'status' => 'pending',
            'subject' => $valid['subject'] ?? null,
            'notes' => $valid['notes'] ?? null,
            'preferred_start' => $preferredStart,
            'preferred_modality' => $preferredModality,
        ]);

        PastoralAppointmentConversation::ensureTicket($appointment);

        $hasSlot = $preferredStart !== null;
        $msg = $hasSlot
            ? 'Pedido registado com o horário escolhido. Utilize o chat para confirmar detalhes com a equipe pastoral, se necessário.'
            : 'Pedido registado. Utilize o chat para combinar detalhes com a equipe pastoral, se necessário.';

        return redirect()
            ->route('mobile.pastoral-appointments.request')
            ->with('success', $msg);
    }

    public function update(Request $request, PastoralAppointment $appointment): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user, 401);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404);
        abort_unless((int) $appointment->church_id === (int) $churchId, 404);
        abort_unless((int) $appointment->requester_user_id === (int) $user->id, 403);

        if (in_array($appointment->status, ['cancelled', 'completed'], true)) {
            throw ValidationException::withMessages([
                'status' => 'Este pedido já não pode ser alterado.',
            ]);
        }

        if ($appointment->status === 'pending') {
            $valid = $request->validate(
                [
                    'requester_name' => ['nullable', 'string', 'max:255'],
                    'preferred_pastor_id' => ['required', 'integer', Rule::exists('pastors', 'id')->where('church_id', $churchId)],
                    'subject' => ['nullable', 'string', 'max:255'],
                    'notes' => ['nullable', 'string', 'max:5000'],
                    'preferred_start' => ['nullable', 'string', 'max:64'],
                    'preferred_modality' => ['nullable', 'string', Rule::in(['presential', 'online'])],
                ],
                [
                    'preferred_pastor_id.required' => 'Selecione o pastor.',
                    'preferred_pastor_id.exists' => 'O pastor indicado não é válido para esta igreja.',
                ],
            );

            $pastor = Pastor::query()
                ->where('church_id', $churchId)
                ->where('id', (int) $valid['preferred_pastor_id'])
                ->firstOrFail();

            $preferredRaw = $request->input('preferred_start');
            $preferredStart = null;
            $preferredModality = null;
            $from = Carbon::now((string) config('app.timezone'))->startOfMinute();
            $ignoreId = (int) $appointment->id;

            if (PastoralAvailability::freeUpcomingCollection((int) $churchId, (int) $pastor->id, $from, 90, $ignoreId)->isEmpty()) {
                throw ValidationException::withMessages([
                    'preferred_pastor_id' => 'Não é possível atualizar o pedido: não há horários livres na agenda deste pastor.',
                ]);
            }

            if ($preferredRaw === null || $preferredRaw === '') {
                throw ValidationException::withMessages([
                    'preferred_start' => 'Selecione um dos horários disponíveis.',
                ]);
            }
            if (! PastoralAvailability::preferredStartIsAllowed((string) $preferredRaw, (int) $churchId, (int) $pastor->id, $from, 90, $ignoreId)) {
                throw ValidationException::withMessages([
                    'preferred_start' => 'Escolha um dos horários livres disponíveis para este pastor.',
                ]);
            }
            $preferredStart = Carbon::parse((string) $preferredRaw);
            $meta = PastoralAvailability::findSlotMetadata((string) $preferredRaw, (int) $churchId, (int) $pastor->id, $from, 90, $ignoreId);
            $slotModality = $meta['modality'] ?? 'both';
            if ($slotModality === 'both') {
                $m = $valid['preferred_modality'] ?? null;
                if ($m !== 'presential' && $m !== 'online') {
                    throw ValidationException::withMessages([
                        'preferred_modality' => 'Indique se prefere atendimento presencial ou online.',
                    ]);
                }
                $preferredModality = $m;
            } else {
                $preferredModality = $slotModality;
            }

            $requesterName = trim((string) ($valid['requester_name'] ?? ''));
            if ($requesterName === '') {
                $requesterName = $user->name;
            }

            $appointment->requester_name = $requesterName;
            $appointment->preferred_pastor_id = (int) $valid['preferred_pastor_id'];
            $appointment->subject = $valid['subject'] ?? null;
            $appointment->notes = $valid['notes'] ?? null;
            $appointment->preferred_start = $preferredStart;
            $appointment->preferred_modality = $preferredModality;
        } else {
            $valid = $request->validate([
                'requester_name' => ['nullable', 'string', 'max:255'],
                'subject' => ['nullable', 'string', 'max:255'],
                'notes' => ['nullable', 'string', 'max:5000'],
            ]);
            $requesterName = trim((string) ($valid['requester_name'] ?? ''));
            if ($requesterName !== '') {
                $appointment->requester_name = $requesterName;
            }
            if (array_key_exists('subject', $valid)) {
                $appointment->subject = $valid['subject'];
            }
            if (array_key_exists('notes', $valid)) {
                $appointment->notes = $valid['notes'];
            }
        }

        $appointment->save();

        return redirect()
            ->route('mobile.pastoral-appointments.request', [
                'appointment' => $appointment->id,
                'painel' => 'detalhes',
            ])
            ->with('success', 'Pedido atualizado.');
    }
}
