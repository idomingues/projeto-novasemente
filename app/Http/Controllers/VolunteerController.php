<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreVolunteerRequest;
use App\Http\Requests\UpdateVolunteerRequest;
use App\Models\Church;
use App\Models\Invitation;
use App\Models\Member;
use App\Models\Ministry;
use App\Models\User;
use App\Models\Volunteer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class VolunteerController extends Controller
{
    /**
     * Garante que só um registo em volunteers use este user_id (o voluntário atual).
     */
    private function releaseVolunteerUserIdForOtherVolunteers(int $userId, Volunteer $volunteer): void
    {
        Volunteer::query()
            ->where('user_id', $userId)
            ->where('id', '!=', $volunteer->id)
            ->update(['user_id' => null]);
    }

    private function applyAppProfile(User $user, Request $request): void
    {
        $appRole = $request->input('app_role');
        if (is_string($appRole) && trim($appRole) !== '') {
            $user->syncRoles([$appRole]);
        } else {
            $user->syncRoles([]);
        }

        if ($appRole === 'lider_ministerio') {
            $user->ministries()->sync($request->input('app_ministry_ids', []));
        } else {
            $user->ministries()->detach();
        }
    }

    private function syncMemberPhoto(Request $request, Volunteer $volunteer): void
    {
        if (! $volunteer->member_id) {
            return;
        }

        $volunteer->loadMissing('member');
        $member = $volunteer->member;
        if (! $member) {
            return;
        }

        if ($request->hasFile('photo_file')) {
            $previousPath = is_string($member->photo_url) ? $member->photo_url : null;
            if ($previousPath && str_starts_with($previousPath, 'member-photos/')) {
                Storage::disk('public')->delete($previousPath);
            }

            $path = $request->file('photo_file')->store('member-photos', 'public');
            $member->update(['photo_url' => $path]);
        }
    }

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
                $user = User::query()->find($volunteer->user_id);
                if ($user) {
                    // Desabilita login no app: remove papéis e troca a senha.
                    $user->syncRoles([]);
                    $user->password = Hash::make(Str::random(64));
                    $user->save();
                }
                $volunteer->forceFill(['user_id' => null])->save();
            }

            return;
        }

        $volunteer->loadMissing('member');
        $password = $request->input('app_password');
        $preferredAppEmail = trim((string) $request->input('app_email', ''));
        $resolvedEmail = $preferredAppEmail !== ''
            ? strtolower($preferredAppEmail)
            : strtolower((string) ($volunteer->member?->email ?? $volunteer->email ?? ''));

        if ($volunteer->user_id) {
            $user = User::query()->find($volunteer->user_id);
            if ($user) {
                if ($resolvedEmail !== '') {
                    $user->email = $resolvedEmail;
                }
                if ($password) {
                    $user->password = $password;
                }
                $user->save();
                $this->applyAppProfile($user, $request);
            }

            return;
        }

        $existingUser = $this->resolveExistingUserForVolunteer($volunteer);
        if (! $existingUser && $resolvedEmail !== '') {
            $existingUser = User::query()
                ->whereRaw('LOWER(email) = ?', [$resolvedEmail])
                ->first();
        }
        if ($existingUser) {
            $this->releaseVolunteerUserIdForOtherVolunteers((int) $existingUser->id, $volunteer);
            $volunteer->forceFill(['user_id' => $existingUser->id])->save();
            if ($resolvedEmail !== '') {
                $existingUser->email = $resolvedEmail;
            }
            if ($password) {
                $existingUser->password = $password;
            }
            $existingUser->save();
            $this->applyAppProfile($existingUser, $request);

            return;
        }

        $name = $volunteer->member?->name ?? $volunteer->name;
        $email = $resolvedEmail !== '' ? $resolvedEmail : ($volunteer->member?->email ?? $volunteer->email);
        if (! is_string($email) || trim($email) === '' || ! is_string($name) || trim($name) === '') {
            return;
        }
        if (! $password) {
            return;
        }

        // Sem evento "created": evita ensureVolunteerProfile() criar outro volunteer com o mesmo user_id.
        $user = User::withoutEvents(function () use ($name, $email, $password, $volunteer) {
            return User::create([
                'name' => trim($name),
                'email' => strtolower(trim($email)),
                'password' => $password,
                'member_id' => $volunteer->member_id,
            ]);
        });
        $this->applyAppProfile($user, $request);
        $this->releaseVolunteerUserIdForOtherVolunteers((int) $user->id, $volunteer);
        $volunteer->forceFill(['user_id' => $user->id])->save();
    }

    private function resolveOrCreateAppUserForInvite(Volunteer $volunteer): ?User
    {
        if ($volunteer->user_id) {
            return User::query()->find($volunteer->user_id);
        }

        $existing = $this->resolveExistingUserForVolunteer($volunteer);
        if ($existing) {
            $this->releaseVolunteerUserIdForOtherVolunteers((int) $existing->id, $volunteer);
            $volunteer->forceFill(['user_id' => $existing->id])->save();

            return $existing;
        }

        $volunteer->loadMissing('member');
        $name = trim((string) ($volunteer->member?->name ?? $volunteer->name ?? ''));
        if ($name === '') {
            return null;
        }

        $user = User::withoutEvents(function () use ($name, $volunteer) {
            return User::create([
                'name' => $name,
                'email' => null,
                'password' => Str::random(64),
                'member_id' => $volunteer->member_id,
            ]);
        });

        $this->releaseVolunteerUserIdForOtherVolunteers((int) $user->id, $volunteer);
        $volunteer->forceFill(['user_id' => $user->id])->save();

        return $user;
    }

    public function index(Request $request): Response
    {
        $search = (string) $request->input('search', '');
        $churchId = $this->currentChurchId($request);

        $volunteersQuery = Volunteer::with(['member', 'ministries', 'user:id,email', 'user.roles:id,name', 'user.ministries:id,name'])
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
            ->withQueryString()
            ->through(function (Volunteer $v) {
                return [
                    'id' => $v->id,
                    'member_id' => $v->member_id,
                    'name' => $v->name,
                    'email' => $v->email,
                    'phone' => $v->phone,
                    'role' => $v->role,
                    'active' => (bool) $v->active,
                    'member' => $v->member ? [
                        'id' => $v->member->id,
                        'name' => $v->member->name,
                        'photo_url' => $v->member->photo_url,
                    ] : null,
                    'ministries' => $v->ministries->map(fn (Ministry $m) => [
                        'id' => $m->id,
                        'name' => $m->name,
                    ])->values()->all(),
                    'user' => $v->user ? [
                        'id' => $v->user->id,
                        'email' => $v->user->email,
                        'roles' => $v->user->roles->pluck('name')->values()->all(),
                        'ministry_ids' => $v->user->ministries->pluck('id')->map(fn ($id) => (int) $id)->values()->all(),
                    ] : null,
                ];
            });

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
            'appRoles' => Role::query()->orderBy('name')->get(['id', 'name']),
            'filters' => [
                'search' => $search,
            ],
        ]);
    }

    public function store(StoreVolunteerRequest $request)
    {
        $data = collect($request->validated())->except('photo_file', 'ministry_ids', 'enable_app_access', 'app_email', 'app_role', 'app_ministry_ids', 'app_password', 'app_password_confirmation', 'is_member', 'first_name', 'last_name')->all();
        $volunteer = Volunteer::create($data);
        $volunteer->ministries()->sync($request->input('ministry_ids', []));
        $this->syncMemberPhoto($request, $volunteer);

        $volunteer->load('member');
        $this->syncVolunteerAppUser($request, $volunteer);

        return redirect()->route('volunteers.index')->with('success', 'Voluntário cadastrado com sucesso!');
    }

    public function update(UpdateVolunteerRequest $request, Volunteer $volunteer)
    {
        $data = collect($request->validated())->except('photo_file', 'ministry_ids', 'enable_app_access', 'app_email', 'app_role', 'app_ministry_ids', 'app_password', 'app_password_confirmation', 'is_member', 'first_name', 'last_name')->all();
        $volunteer->update($data);
        $volunteer->ministries()->sync($request->input('ministry_ids', []));
        $this->syncMemberPhoto($request, $volunteer);

        $volunteer->load('member');
        $this->syncVolunteerAppUser($request, $volunteer->fresh());

        return redirect()->route('volunteers.index')->with('success', 'Voluntário atualizado com sucesso!');
    }

    public function destroy(Volunteer $volunteer)
    {
        $volunteer->delete();

        return redirect()->route('volunteers.index')->with('success', 'Voluntário removido com sucesso!');
    }

    public function invite(Volunteer $volunteer)
    {
        $user = $this->resolveOrCreateAppUserForInvite($volunteer);
        if (! $user) {
            return redirect()->route('volunteers.index')->with('error', 'Não foi possível gerar convite. Informe um nome válido para o voluntário.');
        }

        if ($user->email !== null) {
            return redirect()->route('volunteers.index')->with('error', 'Este voluntário já possui acesso (e-mail definido).');
        }

        Invitation::query()
            ->where('user_id', $user->id)
            ->whereNull('used_at')
            ->delete();

        $token = Invitation::createToken();
        Invitation::create([
            'user_id' => $user->id,
            'email' => null,
            'token' => $token,
            'role' => null,
            'expires_at' => now()->addDays(7),
        ]);

        $link = route('register', ['invitation' => $token], true);

        return redirect()->route('volunteers.index')
            ->with('success', 'Convite criado. Encaminhe o link para o voluntário finalizar o cadastro (e-mail e senha).')
            ->with('invitation_link', $link);
    }
}
