<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreVolunteerRequest;
use App\Http\Requests\UpdateVolunteerRequest;
use App\Models\Church;
use App\Models\Member;
use App\Models\Ministry;
use App\Models\User;
use App\Models\Volunteer;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class VolunteerController extends Controller
{
    private function currentChurchId(Request $request): ?int
    {
        return Church::resolveWorkingId($request);
    }

    private function resolveExistingUserForVolunteer(Volunteer $volunteer): ?User
    {
        $volunteer->loadMissing('member');

        if ($volunteer->member_id) {
            $byMember = User::query()->where('member_id', $volunteer->member_id)->first();
            if ($byMember) {
                return $byMember;
            }
        }

        $email = $volunteer->member?->email ?? $volunteer->email;
        if (! is_string($email) || trim($email) === '') {
            return null;
        }

        return User::query()->whereRaw('LOWER(email) = ?', [strtolower(trim($email))])->first();
    }

    private function syncVolunteerAppUser(Request $request, Volunteer $volunteer): void
    {
        if (! $request->boolean('enable_app_access')) {
            if ($volunteer->user_id) {
                $volunteer->forceFill(['user_id' => null])->save();
            }

            return;
        }

        $volunteer->loadMissing('member');
        $password = $request->input('app_password');

        if ($volunteer->user_id) {
            $user = User::query()->find($volunteer->user_id);
            if ($user && $password) {
                $user->password = $password;
                $user->save();
            }

            return;
        }

        $existingUser = $this->resolveExistingUserForVolunteer($volunteer);
        if ($existingUser) {
            $volunteer->forceFill(['user_id' => $existingUser->id])->save();
            if ($password) {
                $existingUser->password = $password;
                $existingUser->save();
            }

            return;
        }

        $name = $volunteer->member?->name ?? $volunteer->name;
        $email = $volunteer->member?->email ?? $volunteer->email;
        if (! is_string($email) || trim($email) === '' || ! is_string($name) || trim($name) === '') {
            return;
        }
        if (! $password) {
            return;
        }

        $user = User::create([
            'name' => trim($name),
            'email' => strtolower(trim($email)),
            'password' => $password,
            'member_id' => $volunteer->member_id,
        ]);

        $volunteer->forceFill(['user_id' => $user->id])->save();
    }

    public function index(Request $request): Response
    {
        $search = (string) $request->input('search', '');
        $churchId = $this->currentChurchId($request);

        $volunteersQuery = Volunteer::with(['member', 'ministries', 'user:id,email'])
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->when($churchId !== null, function ($q) use ($churchId) {
                $q->where(function ($q2) use ($churchId) {
                    $q2->whereDoesntHave('ministries')
                        ->orWhereHas('ministries', fn ($mq) => $mq->where('church_id', $churchId));
                });
            });

        if ($search !== '') {
            $volunteersQuery->where(function ($q) use ($search) {
                $q->whereHas('member', function ($mq) use ($search) {
                    $mq->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                })->orWhere('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $volunteers = $volunteersQuery
            ->latest()
            ->paginate(10)
            ->withQueryString();

        $membersQuery = Member::query()
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'));
        $ministriesQuery = Ministry::query()
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'));

        return Inertia::render('Volunteers/Index', [
            'volunteers' => $volunteers,
            'members' => $membersQuery->orderBy('name')->get(['id', 'name', 'photo_url', 'email']),
            'ministries' => $ministriesQuery->orderBy('name')->get(['id', 'name']),
            'filters' => [
                'search' => $search,
            ],
        ]);
    }

    public function store(StoreVolunteerRequest $request)
    {
        $data = collect($request->validated())->except('photo_url', 'ministry_ids', 'enable_app_access', 'app_password', 'app_password_confirmation')->all();
        $volunteer = Volunteer::create($data);
        $volunteer->ministries()->sync($request->input('ministry_ids', []));
        if ($volunteer->member_id && $request->filled('photo_url')) {
            $volunteer->member->update(['photo_url' => $request->input('photo_url')]);
        }

        $volunteer->load('member');
        $this->syncVolunteerAppUser($request, $volunteer);

        return redirect()->route('volunteers.index')->with('success', 'Voluntário cadastrado com sucesso!');
    }

    public function update(UpdateVolunteerRequest $request, Volunteer $volunteer)
    {
        $data = collect($request->validated())->except('photo_url', 'ministry_ids', 'enable_app_access', 'app_password', 'app_password_confirmation')->all();
        $volunteer->update($data);
        $volunteer->ministries()->sync($request->input('ministry_ids', []));
        if ($volunteer->member_id && $request->has('photo_url')) {
            $volunteer->member->update(['photo_url' => $request->input('photo_url')]);
        }

        $volunteer->load('member');
        $this->syncVolunteerAppUser($request, $volunteer->fresh());

        return redirect()->route('volunteers.index')->with('success', 'Voluntário atualizado com sucesso!');
    }

    public function destroy(Volunteer $volunteer)
    {
        $volunteer->delete();

        return redirect()->route('volunteers.index')->with('success', 'Voluntário removido com sucesso!');
    }
}
