<?php

namespace App\Support;

use App\Domain\Users\Actions\SyncUserChurchFromRegistration;
use App\Models\MissionVolunteer;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rules\Password;
use Spatie\Permission\Models\Role;

final class MissionAppAccount
{
    /**
     * @return array{already_in_app: bool, reason: ?string}
     */
    public static function statusForPhone(?int $churchId, string $phone, ?User $authUser = null): array
    {
        return self::statusForRegistration($churchId, $phone, null, $authUser);
    }

    /**
     * @return array{already_in_app: bool, reason: ?string}
     */
    public static function statusForRegistration(
        ?int $churchId,
        string $phone,
        ?string $email = null,
        ?User $authUser = null,
    ): array {
        if ($authUser !== null) {
            return ['already_in_app' => true, 'reason' => 'logged_in'];
        }

        if ($churchId === null) {
            return ['already_in_app' => false, 'reason' => null];
        }

        $email = is_string($email) ? strtolower(trim($email)) : '';
        if ($email !== '') {
            $emailMatch = User::query()
                ->where('church_id', $churchId)
                ->whereRaw('LOWER(email) = ?', [$email])
                ->exists();
            if ($emailMatch) {
                return ['already_in_app' => true, 'reason' => 'email_match'];
            }
        }

        $phoneNorm = VolunteerContactDuplicateChecker::normalizePhone($phone);
        if ($phoneNorm === null) {
            return ['already_in_app' => false, 'reason' => null];
        }

        $users = User::query()->where('church_id', $churchId)->get(['id', 'phone']);
        foreach ($users as $user) {
            if (VolunteerContactDuplicateChecker::normalizePhone($user->phone) === $phoneNorm) {
                return ['already_in_app' => true, 'reason' => 'phone_match'];
            }
        }

        return ['already_in_app' => false, 'reason' => null];
    }

    /** @return array<string, mixed> */
    public static function submissionPayload(
        MissionVolunteer $volunteer,
        bool $alreadyInApp,
        ?string $reason = null,
        bool $appAccountCreated = false,
        bool $appAccountResolved = false,
    ): array {
        return [
            'volunteerId' => $volunteer->id,
            'fullName' => $volunteer->full_name,
            'alreadyInApp' => $alreadyInApp,
            'alreadyInAppReason' => $reason,
            'appAccountCreated' => $appAccountCreated,
            'appAccountResolved' => $appAccountResolved,
        ];
    }

    /** @return array<string, string> */
    public static function validationRules(): array
    {
        return [
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:'.User::class],
            'password' => ['required', 'confirmed', Password::defaults()],
        ];
    }

    /** @return array<string, string> */
    public static function wizardValidationRules(): array
    {
        return [
            'app_email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:'.User::class.',email'],
            'app_password' => ['required', 'confirmed', Password::defaults()],
        ];
    }

    /** @return array<string, mixed> */
    public static function pendingSession(MissionVolunteer $volunteer, int $churchId): array
    {
        return [
            'volunteer_id' => $volunteer->id,
            'church_id' => $churchId,
        ];
    }

    public static function consumePending(Request $request): ?MissionVolunteer
    {
        $pending = $request->session()->get('mission_pending_app_registration');
        if (! is_array($pending) || ! isset($pending['volunteer_id'])) {
            return null;
        }

        $volunteer = MissionVolunteer::query()->find((int) $pending['volunteer_id']);
        if ($volunteer === null) {
            return null;
        }

        $churchId = (int) ($pending['church_id'] ?? 0);
        if ($churchId > 0 && (int) $volunteer->church_id !== $churchId) {
            return null;
        }

        return $volunteer;
    }

    public static function clearPending(Request $request): void
    {
        $request->session()->forget('mission_pending_app_registration');
    }

    /**
     * @return array{created: bool, email: ?string, already_in_app: bool, reason: ?string}
     */
    public static function createFromVolunteer(
        MissionVolunteer $volunteer,
        string $email,
        string $password,
        Request $request,
    ): array {
        $appStatus = self::statusForRegistration(
            (int) $volunteer->church_id,
            (string) $volunteer->phone,
            $email,
            $request->user(),
        );

        if ($appStatus['already_in_app']) {
            return [
                'created' => false,
                'email' => null,
                'already_in_app' => true,
                'reason' => $appStatus['reason'],
            ];
        }

        $email = strtolower(trim($email));

        DB::transaction(function () use ($request, $volunteer, $email, $password): void {
            $user = User::withoutEvents(function () use ($volunteer, $email, $password) {
                return User::create([
                    'name' => $volunteer->full_name,
                    'email' => $email,
                    'password' => $password,
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

            $volunteer->update(['email' => $email]);

            event(new Registered($user));
            Auth::login($user, true);
        });

        return [
            'created' => true,
            'email' => $email,
            'already_in_app' => false,
            'reason' => null,
        ];
    }

    /**
     * @return array{already_in_app: bool, app_account_created: bool, app_account_resolved: bool, reason: ?string, app_email: ?string}
     */
    public static function resolveWizardAppAccount(
        MissionVolunteer $volunteer,
        Request $request,
        bool $offerAppAccount,
        ?bool $wantsAppAccount,
        ?string $appEmail,
        ?string $appPassword,
    ): array {
        $appStatus = self::statusForRegistration(
            (int) $volunteer->church_id,
            (string) $volunteer->phone,
            $appEmail,
            $request->user(),
        );

        if ($appStatus['already_in_app']) {
            return [
                'already_in_app' => true,
                'app_account_created' => false,
                'app_account_resolved' => $offerAppAccount && $wantsAppAccount !== null,
                'reason' => $appStatus['reason'],
                'app_email' => null,
            ];
        }

        if (! $offerAppAccount || $wantsAppAccount !== true) {
            return [
                'already_in_app' => false,
                'app_account_created' => false,
                'app_account_resolved' => $offerAppAccount && $wantsAppAccount !== null,
                'reason' => null,
                'app_email' => null,
            ];
        }

        if ($appEmail === null || $appPassword === null || trim($appEmail) === '' || trim($appPassword) === '') {
            return [
                'already_in_app' => false,
                'app_account_created' => false,
                'app_account_resolved' => false,
                'reason' => null,
                'app_email' => null,
            ];
        }

        $result = self::createFromVolunteer($volunteer, $appEmail, $appPassword, $request);

        return [
            'already_in_app' => $result['already_in_app'],
            'app_account_created' => $result['created'],
            'app_account_resolved' => true,
            'reason' => $result['reason'],
            'app_email' => $result['email'],
        ];
    }

    public static function syncPendingSession(
        Request $request,
        MissionVolunteer $volunteer,
        bool $alreadyInApp,
        bool $appAccountCreated,
        bool $appAccountResolved,
    ): void {
        if ($alreadyInApp || $appAccountCreated || $appAccountResolved) {
            self::clearPending($request);

            return;
        }

        $request->session()->put(
            'mission_pending_app_registration',
            self::pendingSession($volunteer, (int) $volunteer->church_id),
        );
    }
}
