<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use App\Models\Church;
use App\Models\Ministry;
use App\Models\User;
use App\Support\StorageUrl;
use App\Support\UserProfilePhotoResolver;
use App\Support\VolunteerSignupCompletion;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    private function resolveRedirectRoute(Request $request): string
    {
        $candidate = trim((string) $request->input('redirect_to', ''));
        $allowed = ['profile.edit', 'mobile.profile.edit'];
        if ($candidate !== '' && in_array($candidate, $allowed, true) && Route::has($candidate)) {
            return $candidate;
        }

        return 'profile.edit';
    }

    /**
     * Display the user's profile form.
     */
    public function edit(Request $request): Response
    {
        $user = $request->user();
        $churchId = (int) ($user->church_id ?? 0);
        if ($churchId === 0) {
            $resolved = Church::resolveWorkingId($request);
            if ($resolved !== null) {
                $churchId = (int) $resolved;
            }
        }

        $user->loadMissing('volunteerProfile');
        $volunteerMinistries = $this->volunteerMinistriesForUser($user, $churchId);
        $volunteerSignupCompletion = ($user->is_volunteer && Route::has('volunteers.self-signup.edit'))
            ? VolunteerSignupCompletion::incompleteForUser($user)
            : null;

        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $user instanceof MustVerifyEmail,
            'status' => session('status'),
            'volunteerMinistries' => $volunteerMinistries,
            'profileRedirectTo' => 'profile.edit',
            'volunteerSignupCompletion' => $volunteerSignupCompletion,
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $redirectTo = $this->resolveRedirectRoute($request);
        $user = $request->user();
        $user->fill(collect($validated)->except('photo_file', 'redirect_to')->all());

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        if ($request->hasFile('photo_file')) {
            UserProfilePhotoResolver::deleteStoredUploadIfAny($user->photo_url);
            $user->photo_url = UserProfilePhotoResolver::storeUploadedPhoto($request->file('photo_file'));
        }

        $user->save();
        $user->syncVolunteerRecord();

        return Redirect::route($redirectTo)->with('success', 'Perfil atualizado com sucesso.');
    }

    /**
     * @return list<array{id: int, name: string}>
     */
    private function volunteerMinistriesForUser(User $user, int $churchId): array
    {
        if ($user->volunteerProfile === null) {
            return [];
        }

        $query = $user->volunteerProfile->ministries();
        if ($churchId > 0) {
            $query->where('church_id', $churchId);
        }

        return $query
            ->orderBy('name')
            ->get(['ministries.id', 'ministries.name'])
            ->map(fn (Ministry $m) => ['id' => (int) $m->id, 'name' => (string) $m->name])
            ->values()
            ->all();
    }

    private function storeUserPhoto(UploadedFile $file): string
    {
        $path = $file->store('users/photos', 'public');

        return StorageUrl::publicMediaUrl($path);
    }

    private function deleteStoredUserPhoto(?string $photoUrl): void
    {
        $relative = StorageUrl::relativePathFromAnyPublicUrl($photoUrl);
        if ($relative !== null) {
            Storage::disk('public')->delete($relative);
        }
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}
