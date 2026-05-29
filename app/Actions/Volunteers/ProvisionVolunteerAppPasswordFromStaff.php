<?php

namespace App\Actions\Volunteers;

use App\Domain\Users\Actions\SyncUserChurchFromRegistration;
use App\Models\User;
use App\Models\Volunteer;
use App\Support\VolunteerContactDuplicateChecker;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Role;

/**
 * Cria ou atualiza a senha da conta no app ligada a um cadastro de voluntário (ação da equipe).
 */
class ProvisionVolunteerAppPasswordFromStaff
{
    public function __invoke(Volunteer $volunteer, string $password, Request $request): User
    {
        $volunteer->loadMissing('user');
        $user = $volunteer->user;

        if ($user !== null) {
            if ($user->canAccessAdminMenu()) {
                throw ValidationException::withMessages([
                    'app_password' => 'Conta da equipe do painel — altere a senha em Usuários.',
                ]);
            }

            $user->forceFill(['password' => $password])->save();

            return $user->fresh() ?? $user;
        }

        $email = strtolower(trim((string) ($volunteer->email ?? '')));
        if ($email === '') {
            throw ValidationException::withMessages([
                'app_password' => 'Este voluntário não tem e-mail. Cadastre o e-mail em Voluntários antes de criar o acesso.',
            ]);
        }

        $name = trim((string) ($volunteer->name ?? ''));
        if ($name === '') {
            throw ValidationException::withMessages([
                'app_password' => 'Este voluntário não tem nome cadastrado.',
            ]);
        }

        $existingUser = User::query()->whereRaw('LOWER(email) = ?', [$email])->first();
        if ($existingUser !== null) {
            $msg = VolunteerContactDuplicateChecker::privilegedAccountVolunteerLinkMessage(
                $existingUser,
                $request->user()?->id,
            );
            if ($msg !== null) {
                throw ValidationException::withMessages(['app_password' => $msg]);
            }

            return $this->linkExistingUser($volunteer, $existingUser, $password, $request);
        }

        return $this->createUserForVolunteer($volunteer, $name, $email, $password, $request);
    }

    private function linkExistingUser(
        Volunteer $volunteer,
        User $user,
        string $password,
        Request $request,
    ): User {
        return DB::transaction(function () use ($volunteer, $user, $password, $request): User {
            Volunteer::query()
                ->where('user_id', $user->id)
                ->where('id', '!=', $volunteer->id)
                ->update(['user_id' => null]);

            $volunteer->forceFill(['user_id' => $user->id])->save();

            $phone = trim((string) ($volunteer->phone ?? ''));
            $resolvedName = trim((string) ($volunteer->name ?? $user->name ?? ''));
            $user->forceFill([
                'password' => $password,
                'name' => $resolvedName !== '' ? $resolvedName : $user->name,
                'email' => strtolower(trim((string) ($volunteer->email ?? $user->email ?? ''))),
                'phone' => $phone !== '' ? $phone : $user->phone,
                'is_volunteer' => true,
            ])->save();

            $user->ensureVolunteerProfile();
            app(SyncUserChurchFromRegistration::class)($user->fresh() ?? $user, $request);
            ($user->fresh() ?? $user)->ensureVolunteerProfile();

            return $user->fresh() ?? $user;
        });
    }

    private function createUserForVolunteer(
        Volunteer $volunteer,
        string $name,
        string $email,
        string $password,
        Request $request,
    ): User {
        return DB::transaction(function () use ($volunteer, $name, $email, $password, $request): User {
            $phone = trim((string) ($volunteer->phone ?? ''));

            $user = User::withoutEvents(function () use ($name, $email, $password, $phone, $volunteer) {
                return User::create([
                    'name' => $name,
                    'email' => $email,
                    'phone' => $phone !== '' ? $phone : null,
                    'password' => $password,
                    'birth_date' => $volunteer->birth_date,
                    'status' => 'active',
                    'is_volunteer' => true,
                    'notify_via_app' => true,
                    'notify_via_email' => true,
                    'notify_via_whatsapp' => false,
                ]);
            });

            $guard = (string) config('auth.defaults.guard');
            if ($user->getRoleNames()->isEmpty()
                && Role::query()->where('name', 'membro')->where('guard_name', $guard)->exists()) {
                $user->assignRole('membro');
            }
            $user->syncRoleIdFromSpatieAssignments();

            Volunteer::query()
                ->where('user_id', $user->id)
                ->where('id', '!=', $volunteer->id)
                ->update(['user_id' => null]);

            $volunteer->forceFill(['user_id' => $user->id])->save();
            $user->ensureVolunteerProfile();

            app(SyncUserChurchFromRegistration::class)($user->fresh() ?? $user, $request);
            ($user->fresh() ?? $user)->ensureVolunteerProfile();

            return $user->fresh() ?? $user;
        });
    }
}
