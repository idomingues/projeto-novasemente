<?php

namespace App\Support;

use App\Models\MissionVolunteer;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rules\Password;

final class MissionAppAccount
{
    /**
     * @return array{already_in_app: bool, reason: ?string}
     */
    public static function statusForPhone(?int $churchId, string $phone, ?User $authUser = null): array
    {
        if ($authUser !== null) {
            return ['already_in_app' => true, 'reason' => 'logged_in'];
        }

        $phoneNorm = VolunteerContactDuplicateChecker::normalizePhone($phone);
        if ($churchId === null || $phoneNorm === null) {
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

    /**
     * @return array<string, mixed>
     */
    public static function submissionPayload(MissionVolunteer $volunteer, bool $alreadyInApp, ?string $reason = null): array
    {
        return [
            'volunteerId' => $volunteer->id,
            'fullName' => $volunteer->full_name,
            'alreadyInApp' => $alreadyInApp,
            'alreadyInAppReason' => $reason,
            'appAccountCreated' => false,
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

    /** @return array<string, string> */
    public static function validationRules(): array
    {
        return [
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:'.User::class],
            'password' => ['required', 'confirmed', Password::defaults()],
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
}
