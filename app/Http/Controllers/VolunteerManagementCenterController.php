<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\Ministry;
use App\Models\User;
use App\Support\VolunteerChurchRosterBuilder;
use App\Support\VolunteerManagementCenterBuilder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class VolunteerManagementCenterController extends Controller
{
    private function churchId(Request $request): ?int
    {
        return Church::resolveWorkingId($request);
    }

    private function canUseRead(Request $request): void
    {
        $u = $request->user();
        abort_unless($u, 401);
        abort_unless(
            $u->can('volunteers.view') || $u->can('volunteers.manage') || $u->can('volunteers.ministry_operate'),
            403
        );
    }

    /**
     * @return array{0: string, 1: int|null, 2: string|null}
     */
    private function resolveCenterSelection(Request $request, array $departments, array $phases): array
    {
        $groupBy = $request->query('agrupar', 'departamento') === 'fase' ? 'fase' : 'departamento';

        if ($groupBy === 'fase') {
            $phaseParam = $request->query('fase');
            $phaseKeys = array_column($phases, 'key');
            $selectedPhaseKey = null;
            if (is_string($phaseParam) && $phaseParam !== '' && in_array($phaseParam, $phaseKeys, true)) {
                $selectedPhaseKey = $phaseParam;
            }

            return ['fase', null, $selectedPhaseKey];
        }

        $ministryParam = $request->query('ministerio');
        $selectedMinistryId = null;
        if ($ministryParam === 'none' || $ministryParam === '0') {
            $selectedMinistryId = 0;
        } elseif ($ministryParam !== null && $ministryParam !== '') {
            $selectedMinistryId = (int) $ministryParam;
        }

        return ['departamento', $selectedMinistryId, null];
    }

    private function applyCenterScopeToRequest(
        Request $request,
        string $groupBy,
        ?int $selectedMinistryId,
        ?string $selectedPhaseKey,
        string $centerVinculo,
    ): void {
        if ($groupBy === 'fase' && is_string($selectedPhaseKey) && $selectedPhaseKey !== '') {
            $request->merge(['center_phase_key' => $selectedPhaseKey]);

            return;
        }

        if ($groupBy !== 'departamento' || $selectedMinistryId === null) {
            return;
        }

        if ($selectedMinistryId === 0) {
            $request->merge(['center_sem_departamento' => '1']);

            return;
        }

        if ($selectedMinistryId > 0) {
            $request->merge([
                'ministry_ids' => (string) $selectedMinistryId,
                'center_vinculo' => $centerVinculo,
            ]);
        }
    }

    private function resolveCenterVinculo(Request $request, ?int $selectedMinistryId): string
    {
        if ($selectedMinistryId === null || $selectedMinistryId <= 0) {
            return 'vinculados';
        }

        return VolunteerManagementCenterBuilder::normalizedCenterVinculo($request);
    }

    public function index(Request $request): Response
    {
        $this->canUseRead($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');

        $user = $request->user();
        $departments = VolunteerManagementCenterBuilder::departments($request, (int) $churchId);
        $allVolunteersCount = VolunteerManagementCenterBuilder::allVolunteersCount($request, (int) $churchId);
        $withoutDepartmentCount = VolunteerManagementCenterBuilder::volunteersWithoutDepartmentCount($request, (int) $churchId);
        $phases = VolunteerManagementCenterBuilder::phasesWithCounts($request, (int) $churchId);

        [$groupBy, $selectedMinistryId, $selectedPhaseKey] = $this->resolveCenterSelection($request, $departments, $phases);
        $centerVinculo = $this->resolveCenterVinculo($request, $selectedMinistryId);

        if ($groupBy === 'departamento' && $selectedMinistryId !== null && $selectedMinistryId > 0) {
            $ministry = VolunteerManagementCenterBuilder::visibleMinistriesQuery($request, (int) $churchId)
                ->whereKey($selectedMinistryId)
                ->first();
            abort_unless($ministry, 404);
        }

        // Lista paginada: totais da lateral vêm de contagens separadas; limitar payload (mobile/produção).
        $userAgent = (string) $request->userAgent();
        $isMobileClient = preg_match('/Mobile|Android|iPhone|iPad|iPod/i', $userAgent) === 1;
        $perPage = min(max((int) $request->query('por_pagina', $isMobileClient ? 50 : 100), 25), 100);

        $this->applyCenterScopeToRequest($request, $groupBy, $selectedMinistryId, $selectedPhaseKey, $centerVinculo);
        $request->merge(['center_mode' => '1']);
        $roster = VolunteerChurchRosterBuilder::paginated($request, (int) $churchId, $user, $perPage, false);

        $selectedMinistry = null;
        if ($groupBy === 'departamento' && $selectedMinistryId !== null && $selectedMinistryId > 0) {
            $ministry = Ministry::query()->whereKey($selectedMinistryId)->first(['id', 'name', 'icon']);
            if ($ministry) {
                $ministry->load(['users:id,name']);
                $selectedMinistry = [
                    'id' => (int) $ministry->id,
                    'name' => $ministry->name,
                    'icon' => $ministry->icon,
                    'leaders' => $ministry->users
                        ->map(fn (User $u) => trim((string) $u->name))
                        ->filter(fn ($n) => $n !== '')
                        ->values()
                        ->all(),
                ];
            }
        }

        $selectedPhase = null;
        if ($groupBy === 'fase' && is_string($selectedPhaseKey) && $selectedPhaseKey !== '') {
            foreach ($phases as $phase) {
                if ($phase['key'] === $selectedPhaseKey) {
                    $selectedPhase = ['key' => $phase['key'], 'label' => $phase['label']];
                    break;
                }
            }
        }

        $encaminharMinistryIds = null;
        if ($user && ! $user->can('volunteers.manage')) {
            $encaminharMinistryIds = $user->ministries()
                ->where('church_id', $churchId)
                ->pluck('ministries.id')
                ->map(fn ($id) => (int) $id)
                ->values()
                ->all();
        }

        $canManageVolunteerRequests = $user && (
            $user->hasAnyRole(['super_admin', 'admin']) || $user->can('solicitations.manage')
        );

        return Inertia::render('MinistryLeadVolunteers/ManagementCenter', [
            'groupBy' => $groupBy,
            'departments' => $departments,
            'phases' => $phases,
            'allVolunteersCount' => $allVolunteersCount,
            'withoutDepartmentCount' => $withoutDepartmentCount,
            'selectedMinistryId' => $selectedMinistryId,
            'selectedPhaseKey' => $selectedPhaseKey,
            'selectedMinistry' => $selectedMinistry,
            'selectedPhase' => $selectedPhase,
            'centerVinculo' => $centerVinculo,
            'volunteers' => $roster['volunteers'],
            'boardFilters' => $roster['filters'],
            'ministries' => $roster['ministries'],
            'encaminharMinistryIds' => $encaminharMinistryIds,
            'pedidosUrl' => route('ministry-lead.volunteers.pedidos'),
            'canManageVolunteerRequests' => $canManageVolunteerRequests,
            'canPipelineMutate' => $user && ($user->can('volunteers.manage') || $user->can('volunteers.ministry_operate')),
            'canVolunteerManage' => $user && $user->can('volunteers.manage'),
            'canViewVolunteerNotes' => $user && (
                $user->can('volunteers.view')
                || $user->can('volunteers.manage')
                || $user->can('volunteers.ministry_operate')
            ),
            'volunteersAdminUrl' => route('volunteers.index'),
        ]);
    }

    public function pedidos(Request $request, VolunteerRequestSolicitationController $volunteerRequests): Response
    {
        $this->canUseRead($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');

        $user = $request->user();
        abort_unless(
            $user && ($user->hasAnyRole(['super_admin', 'admin']) || $user->can('solicitations.manage')),
            403
        );

        return Inertia::render('MinistryLeadVolunteers/Pedidos', array_merge(
            $volunteerRequests->staffIndexPayload($request, (int) $churchId),
            ['centralUrl' => route('ministry-lead.volunteers.central')],
        ));
    }
}
