<?php

namespace App\Http\Controllers;

use App\Domain\Volunteers\Actions\SyncVolunteerMinistryAttachments;
use App\Http\Requests\ProfileUpdateRequest;
use App\Models\Church;
use App\Models\Ministry;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
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

        $ministryOptions = $churchId > 0
            ? Ministry::query()->where('church_id', $churchId)->orderBy('name')->get(['id', 'name'])->values()->all()
            : [];

        $user->loadMissing('volunteerProfile');
        $volunteerMinistryIds = $user->volunteerProfile
            ? $user->volunteerProfile->ministries()->pluck('ministries.id')->map(fn ($id) => (int) $id)->values()->all()
            : [];

        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $user instanceof MustVerifyEmail,
            'status' => session('status'),
            'ministryOptions' => $ministryOptions,
            'volunteerMinistryIds' => $volunteerMinistryIds,
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $user = $request->user();
        $user->fill(collect($validated)->except('photo_file', 'volunteer_ministry_ids')->all());

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        if ($request->hasFile('photo_file')) {
            $this->deleteStoredUserPhoto($user->photo_url);
            $user->photo_url = $this->storeUserPhoto($request->file('photo_file'));
        }

        $user->save();

        $churchIdForMinistries = (int) ($user->church_id ?? 0);
        if ($churchIdForMinistries === 0) {
            $resolved = Church::resolveWorkingId($request);
            if ($resolved !== null) {
                $churchIdForMinistries = (int) $resolved;
            }
        }

        $churchHasMinistries = $churchIdForMinistries > 0
            && Ministry::query()->where('church_id', $churchIdForMinistries)->exists();

        if (
            $churchHasMinistries
            && $request->has('volunteer_ministry_ids')
            && is_array($request->input('volunteer_ministry_ids'))
        ) {
            $user->ensureVolunteerProfile();
            $user->load('volunteerProfile');
            $volunteer = $user->volunteerProfile;
            if ($volunteer !== null) {
                $ids = collect($request->input('volunteer_ministry_ids', []))
                    ->map(fn ($id) => (int) $id)
                    ->filter(fn ($id) => $id > 0)
                    ->unique()
                    ->values()
                    ->all();
                $allowed = Ministry::query()
                    ->where('church_id', $churchIdForMinistries)
                    ->whereIn('id', $ids)
                    ->pluck('id')
                    ->map(fn ($id) => (int) $id)
                    ->values()
                    ->all();
                if (count($allowed) !== count($ids)) {
                    return Redirect::route('profile.edit')->withErrors([
                        'volunteer_ministry_ids' => 'Um ou mais departamentos são inválidos para a sua igreja.',
                    ]);
                }
                app(SyncVolunteerMinistryAttachments::class)($volunteer, $allowed);
            }
            $user->ensureVolunteerProfile();
            $user->refresh();
            $hasMinistries = (bool) $user->volunteerProfile?->ministries()->exists();
            $user->forceFill(['is_volunteer' => $hasMinistries])->save();
        }

        return Redirect::route('profile.edit');
    }

    private function storeUserPhoto(UploadedFile $file): string
    {
        $path = $file->store('users/photos', 'public');

        return '/storage/'.$path;
    }

    private function deleteStoredUserPhoto(?string $photoUrl): void
    {
        if (! $photoUrl || ! str_starts_with($photoUrl, '/storage/')) {
            return;
        }
        $relative = ltrim(substr($photoUrl, strlen('/storage/')), '/');
        Storage::disk('public')->delete($relative);
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
