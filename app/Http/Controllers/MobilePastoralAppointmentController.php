<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\Pastor;
use App\Models\PastoralAppointment;
use App\Models\PastoralAvailability;
use App\Support\PastoralAppointmentConversation;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class MobilePastoralAppointmentController extends Controller
{
    private function churchId(Request $request): ?int
    {
        return Church::resolveWorkingId($request);
    }

    public function hub(Request $request): RedirectResponse
    {
        $query = [];
        $appointment = $request->query('appointment');
        if (is_string($appointment) && $appointment !== '' && ctype_digit($appointment)) {
            $query['appointment'] = $appointment;
            $painel = $request->query('painel');
            if (is_string($painel) && in_array($painel, ['detalhes', 'chat'], true)) {
                $query['painel'] = $painel;
            }
        } else {
            $query['novo'] = '1';
            $query['tipo'] = 'pastoral';
            $pastor = $request->query('pastor');
            if (is_string($pastor) && $pastor !== '' && ctype_digit($pastor)) {
                $query['pastor'] = $pastor;
            }
        }

        return redirect()->route('mobile.solicitations.hub', $query);
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
            ? 'Pedido registrado com o horário escolhido. Utilize o chat para confirmar detalhes com a equipe pastoral, se necessário.'
            : 'Pedido registrado. Utilize o chat para combinar detalhes com a equipe pastoral, se necessário.';

        return redirect()
            ->route('mobile.solicitations.hub', [
                'appointment' => $appointment->id,
                'painel' => 'detalhes',
            ])
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
                'status' => 'Este pedido não pode mais ser alterado.',
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
            ->route('mobile.solicitations.hub', [
                'appointment' => $appointment->id,
                'painel' => 'detalhes',
            ])
            ->with('success', 'Pedido atualizado.');
    }
}
