<?php

namespace App\Http\Controllers;

use App\Domain\Users\Actions\CreateChurchUserProfile;
use App\Domain\Users\Actions\DeleteChurchUserProfile;
use App\Domain\Users\Actions\UpdateChurchUserProfile;
use App\Http\Requests\StoreMemberRequest;
use App\Http\Requests\UpdateMemberRequest;
use App\Models\Church;
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

        return Inertia::render('Members/Index', [
            'canManageLeaderSignupLink' => $canManageLeaderSignupLink,
            'leaderSelfSignupUrl' => $leaderSelfSignupUrl,
            'leaderSelfSignupChurch' => $leaderSelfSignupChurch,
            'members' => $users->through(function (User $user) {
                $volunteerMinistryIds = $user->volunteerProfile
                    ? $user->volunteerProfile->ministries()->pluck('ministries.id')->map(fn ($id) => (int) $id)->values()->all()
                    : [];
                $appMinistryIds = $user->ministries()->pluck('ministries.id')->map(fn ($id) => (int) $id)->values()->all();

                $roleName = $user->getRoleNames()->first();

                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
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
                ];
            }),
            'assignableRoles' => $assignableRoles,
            'ministryOptions' => $ministryOptions,
            'filters' => [
                'search' => $search,
            ],
        ]);
    }

    public function store(StoreMemberRequest $request, CreateChurchUserProfile $createChurchUserProfile)
    {
        $churchId = $this->currentChurchId($request);
        if ($churchId === null) {
            return redirect()->route('members.index')->with('error', 'Nenhuma igreja ativa. Selecione uma igreja para trabalhar.');
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

        // Líder não é mais perfil; departamentos liderados vêm sempre de `app_ministry_ids`.
        $user->ministries()->sync($request->input('app_ministry_ids', []));

        return redirect()->route('members.index')->with('success', 'Usuário criado com sucesso!');
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

            // Evita auto-rebaixamento/acesso perdido no ecrã de membros.
            if ((int) $request->user()->id === (int) $user->id && $normalizedCurrentRole !== $normalizedNextRole) {
                return redirect()
                    ->route('members.index')
                    ->with('error', 'Não pode alterar o seu próprio perfil de acesso. Peça a outro administrador.');
            }

            if ($next === null || (is_string($next) && trim($next) === '')) {
                if ($user->hasRole('super_admin') && ! $request->user()->hasRole('super_admin')) {
                    abort(403, 'Não autorizado a alterar o perfil deste utilizador.');
                }
                $user->syncRoles([]);
                app(PermissionRegistrar::class)->forgetCachedPermissions();
                $user->syncRoleIdFromSpatieAssignments();
            } elseif (is_string($next)) {
                MemberRoleAssignment::syncUserRole($request->user(), $user->fresh(), $next);
            }
        }

        // Sincronizar departamentos que o usuário lidera (ministry_user) quando for líder de ministério.
        // Líder não é mais perfil; departamentos liderados vêm sempre de `app_ministry_ids`.
        $user->ministries()->sync($request->input('app_ministry_ids', []));

        return redirect()->route('members.index')->with('success', 'Usuário atualizado com sucesso!');
    }

    public function destroy(Request $request, User $user, DeleteChurchUserProfile $deleteChurchUserProfile)
    {
        $this->assertUserBelongsToWorkingChurch($request, $user);
        $deleteChurchUserProfile($user);

        return redirect()->route('members.index')->with('success', 'Usuário removido com sucesso!');
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
