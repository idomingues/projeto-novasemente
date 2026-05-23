<?php

namespace App\Http\Controllers;

use App\Domain\Users\Actions\CreateChurchUserProfile;
use App\Domain\Users\Actions\DeleteChurchUserProfile;
use App\Domain\Users\Actions\UpdateChurchUserProfile;
use App\Http\Requests\StoreMemberRequest;
use App\Http\Requests\UpdateMemberRequest;
use App\Models\Church;
use App\Models\Invitation;
use App\Models\LeaderSelfSignupToken;
use App\Models\Ministry;
use App\Models\User;
use App\Support\MemberRoleAssignment;
use App\Support\StorageUrl;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class MemberController extends Controller
{
    private function currentChurchId(Request $request): ?int
    {
        return Church::resolveWorkingId($request);
    }

    private function assertUserBelongsToWorkingChurch(Request $request, User $user): void
    {
        $churchId = $this->currentChurchId($request);
        if ($churchId === null || (int) $user->church_id !== (int) $churchId) {
            abort(404);
        }
    }

    public function index(Request $request)
    {
        $search = (string) $request->input('search', '');
        $leadersOnly = $request->boolean('leaders_only');
        $appMembersOnly = $request->boolean('app_members_only');
        $ministryId = $request->filled('ministry_id') ? (int) $request->input('ministry_id') : null;
        $churchId = $this->currentChurchId($request);

        $query = User::query()
            ->with(['volunteerProfile.ministries', 'roles', 'ministries'])
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId));

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if ($leadersOnly) {
            $query->where(function ($q) {
                $q->where('is_ministry_leader', true)
                    ->orWhereHas('roles', fn ($r) => $r->where('name', 'lider_ministerio'));
            });
        }

        if ($appMembersOnly) {
            $query->where('is_volunteer', false)
                ->where('is_ministry_leader', false)
                ->whereDoesntHave('roles', fn ($r) => $r->where('name', 'lider_ministerio'));
        }

        if ($ministryId !== null && $ministryId > 0 && $churchId !== null) {
            $validMinistry = Ministry::query()
                ->where('church_id', $churchId)
                ->whereKey($ministryId)
                ->exists();
            if ($validMinistry) {
                $query->where(function ($q) use ($ministryId) {
                    $q->whereHas('ministries', fn ($m) => $m->where('ministries.id', $ministryId))
                        ->orWhereHas('volunteerProfile.ministries', fn ($m) => $m->where('ministries.id', $ministryId));
                });
            }
        }

        $users = $query->orderByDesc('created_at')->paginate(10)->withQueryString();

        $ministryOptions = [];
        if ($churchId !== null) {
            $ministryOptions = Ministry::query()
                ->where('church_id', $churchId)
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (Ministry $m) => ['id' => (int) $m->id, 'name' => (string) $m->name])
                ->values()
                ->all();
        }

        $assignableRoles = collect(MemberRoleAssignment::assignableRoleNames($request->user()))
            ->map(fn (string $name) => ['name' => $name, 'label' => MemberRoleAssignment::label($name)])
            ->values()
            ->all();

        $canManageLeaderSignupLink = $request->user() !== null
            && ($request->user()->can('members.manage') || $request->user()->can('users.manage'));

        $leaderSelfSignupUrl = null;
        $leaderSelfSignupChurch = null;
        if ($churchId !== null && Schema::hasTable('leader_self_signup_tokens')) {
            $leaderSelfSignupUrl = LeaderSelfSignupToken::ensureSignupUrl($churchId);
            $leaderSelfSignupChurch = Church::query()->whereKey($churchId)->value('name');
        }

        $canManageUsers = $request->user()?->can('users.manage') ?? false;
        $canManageMembers = $request->user()?->can('members.manage') ?? false;

        $invitations = collect();
        if ($churchId !== null && $canManageUsers) {
            $invitations = Invitation::query()
                ->with('user')
                ->where(function ($q) use ($churchId) {
                    $q->whereNull('user_id')
                        ->orWhereHas('user', fn ($uq) => $uq->where('church_id', $churchId));
                })
                ->orderByDesc('id')
                ->limit(100)
                ->get();
        }

        $guard = (string) config('auth.defaults.guard');
        $inviteRoles = $canManageUsers
            ? Role::query()->where('guard_name', $guard)->orderBy('name')->get(['id', 'name'])
            : collect();

        return Inertia::render('Users/Index', [
            'canManageUsers' => $canManageUsers,
            'canManageMembers' => $canManageMembers,
            'canManageLeaderSignupLink' => $canManageLeaderSignupLink,
            'leaderSelfSignupUrl' => $leaderSelfSignupUrl,
            'leaderSelfSignupChurch' => $leaderSelfSignupChurch,
            'invitations' => $invitations->map(function (Invitation $i) {
                $link = route('register', ['invitation' => $i->token], absolute: true);

                return [
                    'id' => $i->id,
                    'email' => $i->email,
                    'user_name' => $i->user?->name,
                    'role' => $i->role,
                    'token' => $i->token,
                    'expires_at' => $i->expires_at?->toIso8601String(),
                    'used_at' => $i->used_at?->toIso8601String(),
                    'link' => $link,
                ];
            })->values()->all(),
            'inviteRoles' => $inviteRoles->map(fn (Role $r) => ['id' => $r->id, 'name' => $r->name])->values()->all(),
            'members' => $users->through(function (User $user) {
                $volunteerMinistryIds = $user->volunteerProfile
                    ? $user->volunteerProfile->ministries()->pluck('ministries.id')->map(fn ($id) => (int) $id)->values()->all()
                    : [];
                $appMinistryIds = $user->ministries()->pluck('ministries.id')->map(fn ($id) => (int) $id)->values()->all();

                $roleName = $user->getRoleNames()->first();
                $volunteerProfile = $user->volunteerProfile;
                $hasOperationalVolunteer = $volunteerProfile !== null
                    && ! (bool) ($volunteerProfile->app_access_only ?? false);
                $profileKind = $hasOperationalVolunteer || (bool) ($user->is_volunteer ?? false)
                    ? 'volunteer'
                    : 'app_only';

                $email = $user->email;

                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'needs_registration' => $email === null || trim((string) $email) === '',
                    'phone' => $user->phone,
                    'birth_date' => $user->birth_date?->toIso8601String(),
                    'address' => $user->address,
                    'status' => $user->status ?? 'active',
                    // Se já há departamentos no perfil de voluntário, tratamos como voluntário para a UI vir marcada.
                    'is_volunteer' => (bool) ($user->is_volunteer ?? false) || count($volunteerMinistryIds) > 0,
                    'is_ministry_leader' => (bool) ($user->is_ministry_leader ?? false),
                    'volunteer_ministry_ids' => $volunteerMinistryIds,
                    'app_ministry_ids' => $appMinistryIds,
                    'photo_url' => $user->photo_url,
                    'notify_via_app' => (bool) ($user->notify_via_app ?? true),
                    'notify_via_email' => (bool) ($user->notify_via_email ?? true),
                    'notify_via_whatsapp' => (bool) ($user->notify_via_whatsapp ?? false),
                    'lgpd_accepted_at' => $user->lgpd_accepted_at?->toIso8601String(),
                    'created_at' => $user->created_at->toIso8601String(),
                    'role_name' => $roleName,
                    'role_label' => $roleName ? MemberRoleAssignment::label((string) $roleName) : null,
                    'profile_kind' => $profileKind,
                    'volunteer_profile_id' => $hasOperationalVolunteer ? (int) $volunteerProfile->id : null,
                ];
            }),
            'assignableRoles' => $assignableRoles,
            'ministryOptions' => $ministryOptions,
            'filters' => [
                'search' => $search,
                'leaders_only' => $leadersOnly ? '1' : '',
                'app_members_only' => $appMembersOnly ? '1' : '',
                'ministry_id' => $ministryId !== null && $ministryId > 0 ? (string) $ministryId : '',
            ],
        ]);
    }

    public function store(StoreMemberRequest $request, CreateChurchUserProfile $createChurchUserProfile)
    {
        $churchId = $this->currentChurchId($request);
        if ($churchId === null) {
            return redirect()->route('users.index')->with('error', 'Nenhuma igreja ativa. Selecione uma igreja para trabalhar.');
        }
        $validated = $request->validated();
        $assignable = MemberRoleAssignment::assignableRoleNames($request->user());
        $roleName = $assignable !== [] ? ($validated['role_name'] ?? null) : null;
        unset($validated['role_name']);

        if ($request->hasFile('photo')) {
            $validated['photo_url'] = $this->storeUserPhoto($request->file('photo'));
        }
        unset($validated['photo']);

        $data = array_merge($validated, [
            'church_id' => $churchId,
        ]);
        $user = $createChurchUserProfile($data);

        if ($assignable !== [] && is_string($roleName) && trim($roleName) !== '') {
            MemberRoleAssignment::syncUserRole($request->user(), $user, (string) $roleName);
        }

        $user->ministries()->sync($request->input('app_ministry_ids', []));

        if ((bool) ($user->is_ministry_leader ?? false)) {
            MemberRoleAssignment::applyMinistryLeaderRole($user->fresh());
        }

        return redirect()->route('users.index')->with('success', 'Usuário criado com sucesso!');
    }

    public function show(Request $request, User $user)
    {
        $this->assertUserBelongsToWorkingChurch($request, $user);

        $roleName = $user->getRoleNames()->first();

        return Inertia::render('Members/Show', [
            'member' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'birth_date' => $user->birth_date?->toIso8601String(),
                'address' => $user->address,
                'status' => $user->status ?? 'active',
                'is_volunteer' => (bool) ($user->is_volunteer ?? false),
                'is_ministry_leader' => (bool) ($user->is_ministry_leader ?? false),
                'photo_url' => $user->photo_url,
                'notify_via_app' => (bool) ($user->notify_via_app ?? true),
                'notify_via_email' => (bool) ($user->notify_via_email ?? true),
                'notify_via_whatsapp' => (bool) ($user->notify_via_whatsapp ?? false),
                'lgpd_accepted_at' => $user->lgpd_accepted_at?->toIso8601String(),
                'created_at' => $user->created_at->toIso8601String(),
                'role_name' => $roleName,
                'role_label' => $roleName ? MemberRoleAssignment::label((string) $roleName) : null,
            ],
        ]);
    }

    public function update(UpdateMemberRequest $request, User $user, UpdateChurchUserProfile $updateChurchUserProfile)
    {
        $this->assertUserBelongsToWorkingChurch($request, $user);
        $validated = $request->validated();
        $assignable = MemberRoleAssignment::assignableRoleNames($request->user());
        $roleFromFormProvided = array_key_exists('role_name', $validated);
        $roleFromForm = $roleFromFormProvided ? $validated['role_name'] : null;
        unset($validated['role_name']);

        $newPasswordPlain = null;
        if ($request->user()?->hasRole('super_admin')) {
            $pw = $validated['password'] ?? null;
            if (is_string($pw) && $pw !== '') {
                $newPasswordPlain = $pw;
            }
        }
        unset($validated['password'], $validated['password_confirmation']);

        unset($validated['lgpd_accepted']);
        if ($request->boolean('lgpd_accepted') && $user->lgpd_accepted_at === null) {
            $validated['lgpd_accepted_at'] = now();
        }
        if ($request->hasFile('photo')) {
            $this->deleteStoredUserPhoto($user->photo_url);
            $validated['photo_url'] = $this->storeUserPhoto($request->file('photo'));
        }
        unset($validated['photo']);

        $updateChurchUserProfile($user, $validated);

        if ($newPasswordPlain !== null) {
            $user->forceFill(['password' => $newPasswordPlain])->save();
        }

        // Aceitar null (ex.: «Sem perfil» após ConvertEmptyStringsToNull); o código antigo exigia is_string e ignorava a actualização.
        if ($assignable !== [] && $roleFromFormProvided) {
            $next = $roleFromForm;
            $normalizedNextRole = null;
            if (is_string($next) && trim($next) !== '') {
                $normalizedNextRole = trim($next);
            }
            $currentRole = $user->getRoleNames()->first();
            $normalizedCurrentRole = is_string($currentRole) && trim($currentRole) !== '' ? trim($currentRole) : null;

            // Evita auto-rebaixamento/acesso perdido no tela de membros.
            if ((int) $request->user()->id === (int) $user->id && $normalizedCurrentRole !== $normalizedNextRole) {
                return redirect()
                    ->route('users.index')
                    ->with('error', 'Não pode alterar o seu próprio perfil de acesso. Peça a outro administrador.');
            }

            if ($next === null || (is_string($next) && trim($next) === '')) {
                if ($user->hasRole('super_admin') && ! $request->user()->hasRole('super_admin')) {
                    abort(403, 'Não autorizado a alterar o perfil deste usuário.');
                }
                $user->syncRoles([]);
                app(PermissionRegistrar::class)->forgetCachedPermissions();
                $user->syncRoleIdFromSpatieAssignments();
            } elseif (is_string($next)) {
                MemberRoleAssignment::syncUserRole($request->user(), $user->fresh(), $next);
            }
        }

        $user->ministries()->sync($request->input('app_ministry_ids', []));

        if ((bool) ($user->is_ministry_leader ?? false)) {
            MemberRoleAssignment::applyMinistryLeaderRole($user->fresh());
        } else {
            MemberRoleAssignment::clearMinistryLeaderRole($user->fresh());
        }

        return redirect()->route('users.index')->with('success', 'Usuário atualizado com sucesso!');
    }

    public function destroy(Request $request, User $user, DeleteChurchUserProfile $deleteChurchUserProfile)
    {
        $this->assertUserBelongsToWorkingChurch($request, $user);
        $deleteChurchUserProfile($user);

        return redirect()->route('users.index')->with('success', 'Usuário removido com sucesso!');
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
}
