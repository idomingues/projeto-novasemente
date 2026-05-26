<?php

namespace App\Http\Controllers;

use App\Domain\Users\Actions\SyncUserChurchFromRegistration;
use App\Models\MissionVolunteer;
use App\Models\User;
use App\Actions\Mission\SendMissionVolunteerInstructions;
use App\Support\MissionAppAccount;
use App\Support\MissionVolunteerInstructions;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;

class MissionAppAccountController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $volunteer = MissionAppAccount::consumePending($request);
        if ($volunteer === null) {
            return $this->redirectToForm($request)
                ->with('error', 'Não foi possível concluir o cadastro no app. Envie o formulário Missão novamente.');
        }

        $appStatus = MissionAppAccount::statusForPhone(
            (int) $volunteer->church_id,
            (string) $volunteer->phone,
            $request->user(),
        );

        if ($appStatus['already_in_app']) {
            MissionAppAccount::clearPending($request);

            return $this->redirectToForm($request)->with('mission_submission', array_merge(
                MissionAppAccount::submissionPayload($volunteer, true, $appStatus['reason']),
                ['message' => 'Cadastro missionário enviado com sucesso! Você já possui conta no aplicativo.'],
            ));
        }

        $valid = $request->validate(MissionAppAccount::validationRules());

        $redirectRoute = $request->routeIs('mobile.mission.app-account.store')
            ? 'mobile.mission.form'
            : 'mission.form';

        DB::transaction(function () use ($request, $volunteer, $valid): void {
            $user = User::withoutEvents(function () use ($volunteer, $valid) {
                return User::create([
                    'name' => $volunteer->full_name,
                    'email' => $valid['email'],
                    'password' => $valid['password'],
                    'phone' => $volunteer->phone,
                    'church_id' => $volunteer->church_id,
                    'status' => 'active',
                    'notify_via_app' => true,
                    'notify_via_email' => true,
                    'notify_via_whatsapp' => true,
                    'lgpd_accepted_at' => now(),
                ]);
            });

            $guard = (string) config('auth.defaults.guard');
            if ($user->getRoleNames()->isEmpty() && Role::query()->where('name', 'membro')->where('guard_name', $guard)->exists()) {
                $user->assignRole('membro');
            }
            $user->syncRoleIdFromSpatieAssignments();
            $user->ensureVolunteerProfile();

            app(SyncUserChurchFromRegistration::class)($user, $request);
            $user->ensureVolunteerProfile();

            $volunteer->update(['email' => $valid['email']]);

            event(new Registered($user));
            Auth::login($user);
        });

        MissionAppAccount::clearPending($request);

        $volunteer = $volunteer->fresh();
        $instructionsEmailSent = app(SendMissionVolunteerInstructions::class)($volunteer);

        $request->session()->flash('registration_success', true);

        return redirect()
            ->route($redirectRoute)
            ->with('mission_submission', array_merge(
                MissionAppAccount::submissionPayload($volunteer, false),
                [
                    'appAccountCreated' => true,
                    'message' => 'Cadastro missionário enviado e conta no app criada com sucesso! Você já pode entrar com seu e-mail e senha.',
                    'instructions' => MissionVolunteerInstructions::lines(),
                    'instructionsEmailSent' => $instructionsEmailSent,
                    'instructionsEmail' => $valid['email'],
                ],
            ))
            ->with('success', 'Conta no app criada com sucesso!');
    }

    private function redirectToForm(Request $request): RedirectResponse
    {
        $route = $request->routeIs('mobile.mission.app-account.store') ? 'mobile.mission.form' : 'mission.form';

        return redirect()->route($route);
    }
}
