<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\Pastor;
use App\Models\PastoralAppointment;
use App\Models\PastoralAvailability;
use App\Models\User;
use App\Support\PastorWeeklySchedule;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class PastoralAgendaController extends Controller
{
    private function pastoralModuleNavUrl(?User $user): ?string
    {
        if ($user === null) {
            return null;
        }

        return $user->can('viewAny', Pastor::class) ? route('pastors.index') : null;
    }

    /**
     * Pastor com conta ligada ao registo (ou administrador com ?pastor=id): define horários para o pedido de agendamento.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user, 401);

        $churchId = Church::resolveWorkingId($request);
        if (! $churchId) {
            $canManageChurches = $user->hasAnyRole(['super_admin', 'admin']) || $user->hasPermissionTo('churches.manage');

            return Inertia::render('PastoralAgenda/NeedsChurch', [
                'canManageChurches' => $canManageChurches,
                'churchesIndexUrl' => $canManageChurches ? route('churches.index') : null,
                'pastoralModuleNavUrl' => $this->pastoralModuleNavUrl($user),
            ]);
        }

        $pastorQuery = $request->query('pastor');
        $pastorIdFromQuery = is_string($pastorQuery) && $pastorQuery !== '' && ctype_digit($pastorQuery)
            ? (int) $pastorQuery
            : null;

        if ($pastorIdFromQuery !== null) {
            $pastor = Pastor::query()
                ->where('church_id', $churchId)
                ->whereKey($pastorIdFromQuery)
                ->firstOrFail();
            Gate::authorize('updateWeeklySchedule', $pastor);

            return $this->agendaEditorResponse($user, $pastor);
        }

        $linkedPastor = Pastor::query()
            ->where('church_id', $churchId)
            ->where('user_id', $user->id)
            ->first();

        if ($linkedPastor !== null) {
            Gate::authorize('updateWeeklySchedule', $linkedPastor);

            return $this->agendaEditorResponse($user, $linkedPastor);
        }

        $canPickPastorForAgenda = $user->hasAnyRole(['super_admin', 'admin'])
            || $user->hasPermissionTo('pastors.manage');

        if ($canPickPastorForAgenda) {
            $pastors = Pastor::query()
                ->where('church_id', $churchId)
                ->orderBy('name')
                ->get(['id', 'name']);

            if ($pastors->isEmpty()) {
                return Inertia::render('PastoralAgenda/NeedsAccountLink', [
                    'variant' => 'staff',
                    'pastorsIndexUrl' => route('pastors.index'),
                    'pastoralModuleNavUrl' => $this->pastoralModuleNavUrl($user),
                ]);
            }

            return Inertia::render('PastoralAgenda/AdminSelectPastor', [
                'pastors' => $pastors->map(fn (Pastor $p) => [
                    'id' => $p->id,
                    'name' => $p->name,
                ])->values()->all(),
                'intro' => null,
                'pastoralModuleNavUrl' => $this->pastoralModuleNavUrl($user),
            ]);
        }

        $delegatedPastors = Pastor::query()
            ->where('church_id', $churchId)
            ->whereJsonContains('agenda_delegate_user_ids', $user->id)
            ->orderBy('name')
            ->get(['id', 'name']);

        if ($delegatedPastors->isNotEmpty()) {
            return Inertia::render('PastoralAgenda/AdminSelectPastor', [
                'pastors' => $delegatedPastors->map(fn (Pastor $p) => [
                    'id' => $p->id,
                    'name' => $p->name,
                ])->values()->all(),
                'intro' => 'Foi indicado como responsável pela agenda destes perfis em Pastores (utilizadores delegados). Escolha um para editar.',
                'pastoralModuleNavUrl' => $this->pastoralModuleNavUrl($user),
            ]);
        }

        $staffHint = $user->can('pastors.view') || $user->can('pastors.manage');
        if ($user->hasRole('pastor') || $staffHint) {
            return Inertia::render('PastoralAgenda/NeedsAccountLink', [
                'variant' => $staffHint && ! $user->hasRole('pastor') ? 'staff' : 'pastor',
                'pastorsIndexUrl' => route('pastors.index'),
                'pastoralModuleNavUrl' => $this->pastoralModuleNavUrl($user),
            ]);
        }

        abort(403, 'A sua conta não está associada a um perfil de pastor nesta igreja.');
    }

    private function agendaEditorResponse(User $user, Pastor $pastor): Response
    {
        $from = Carbon::now()->startOfMinute();
        $tz = (string) config('app.timezone');
        $editingAsDelegate = (int) ($pastor->user_id ?? 0) !== (int) $user->id;
        $rangeStart = $from->copy()->timezone($tz)->startOfWeek(Carbon::MONDAY)->subWeek();
        $rangeEnd = $rangeStart->copy()->addDays(70)->endOfDay();

        $churchId = (int) $pastor->church_id;
        $pastoralAppointments = PastoralAppointment::query()
            ->where('church_id', $churchId)
            ->where('preferred_pastor_id', $pastor->id)
            ->with(['requesterUser:id,name'])
            ->orderByDesc('updated_at')
            ->limit(40)
            ->get()
            ->map(function (PastoralAppointment $a) use ($tz) {
                $dt = $a->preferred_start ?? $a->starts_at;
                $slotStartKey = null;
                if ($dt !== null && $a->status !== 'cancelled') {
                    $slotStartKey = Carbon::parse($dt)->timezone($tz)->startOfMinute()->format('Y-m-d H:i');
                }

                $subject = trim((string) ($a->subject ?? ''));
                $notes = trim((string) ($a->notes ?? ''));

                return [
                    'appointmentId' => $a->id,
                    'status' => $a->status,
                    'statusLabel' => match ($a->status) {
                        'pending' => 'Pendente',
                        'confirmed' => 'Confirmado',
                        'cancelled' => 'Cancelado',
                        'completed' => 'Concluído',
                        default => $a->status,
                    },
                    'requesterLabel' => $a->requesterUser?->name
                        ?: (trim((string) ($a->requester_name ?? '')) !== '' ? trim((string) $a->requester_name) : 'Membro'),
                    'slotStartKey' => $slotStartKey,
                    'subject' => $subject !== '' ? $subject : null,
                    'notes' => $notes !== '' ? Str::limit($notes, 4000) : null,
                    'preferredModality' => $a->preferred_modality,
                ];
            })
            ->values()
            ->all();

        $pastoralAvailabilities = PastoralAvailability::query()
            ->where('church_id', $churchId)
            ->where('pastor_id', $pastor->id)
            ->whereBetween('date', [$rangeStart->toDateString(), $rangeEnd->toDateString()])
            ->orderBy('date')
            ->orderBy('start')
            ->get()
            ->map(fn (PastoralAvailability $a) => [
                'id' => $a->id,
                'date' => $a->date?->toDateString(),
                'start' => (string) $a->start,
                'end' => (string) $a->end,
                'modality' => (string) ($a->modality ?? 'both'),
                'note' => $a->note !== null && $a->note !== '' ? (string) $a->note : null,
                'bookable_by_members' => (bool) ($a->bookable_by_members ?? true),
            ])
            ->values()
            ->all();

        return Inertia::render('PastoralAgenda/Index', [
            'pastor' => [
                'id' => $pastor->id,
                'name' => $pastor->name,
                'weekly_schedule' => PastorWeeklySchedule::normalize($pastor->weekly_schedule),
                'updated_at' => $pastor->updated_at?->toIso8601String(),
            ],
            'updateUrl' => route('pastors.weekly-schedule.update', $pastor),
            'pastoralAppointments' => $pastoralAppointments,
            'pastoralAvailabilities' => $pastoralAvailabilities,
            'availabilityStoreUrl' => route('pastors.pastoral-availabilities.store', $pastor),
            'availabilityUpdateUrlTemplate' => route('pastors.pastoral-availabilities.update', [$pastor, '__AVAILABILITY__']),
            'availabilityDestroyUrlTemplate' => route('pastors.pastoral-availabilities.destroy', [$pastor, '__AVAILABILITY__']),
            'scheduleTimezone' => $tz,
            'scheduleAnchorIso' => $from->clone()->timezone($tz)->toIso8601String(),
            'editingAsDelegate' => $editingAsDelegate,
            'pastoralModuleNavUrl' => $this->pastoralModuleNavUrl($user),
        ]);
    }
}
