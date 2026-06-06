<?php

namespace App\Http\Controllers;

use App\Domain\Volunteers\Actions\DeleteVolunteer;
use App\Domain\Volunteers\Actions\SyncVolunteerMinistryAttachments;
use App\Http\Requests\StoreVolunteerRequest;
use App\Http\Requests\UpdateVolunteerRequest;
use App\Http\Support\ListModalRedirect;
use App\Models\Church;
use App\Models\Invitation;
use App\Models\Ministry;
use App\Models\User;
use App\Models\Volunteer;
use App\Models\VolunteerSelfSignupToken;
use App\Support\MemberRoleAssignment;
use App\Support\SearchTerm;
use App\Support\StorageUrl;
use App\Support\VolunteerChurchRosterBuilder;
use App\Support\VolunteerContactDuplicateChecker;
use App\Support\VolunteerEncaminhadoMissaoExport;
use App\Support\VolunteerPipelineBootstrap;
use App\Support\VolunteerSignupDetailPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class VolunteerController extends Controller
{
    /**
     * Compatibilidade: em produção antiga, o voluntário tinha `ministry_id` na tabela `volunteers`.
     * No esquema atual, a relação é N:N via `ministry_volunteer`.
     */
    private function syncVolunteerMinistries(Request $request, Volunteer $volunteer): void
    {
        $ministryIds = $request->input('ministry_ids', []);

        if (Schema::hasTable('ministry_volunteer')) {
            app(SyncVolunteerMinistryAttachments::class)($volunteer, is_array($ministryIds) ? $ministryIds : []);

            return;
        }

        if (Schema::hasColumn('volunteers', 'ministry_id')) {
            $first = is_array($ministryIds) ? ($ministryIds[0] ?? null) : null;
            $volunteer->forceFill(['ministry_id' => $first !== null ? (int) $first : null])->save();
        }
    }

    /**
     * Garante que só um registro em volunteers use este user_id (o voluntário atual).
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
        if ($user->hasRole('super_admin') || $user->canAccessAdminMenu()) {
            return;
        }

        $appRole = trim((string) $request->input('app_role', ''));

        if ($appRole !== '') {
            $user->syncRoles([$appRole]);
        } else {
            $guard = (string) config('auth.defaults.guard');
            $defaultMembro = $request->filled('app_password')
                && Role::query()->where('name', 'membro')->where('guard_name', $guard)->exists();
            $user->syncRoles($defaultMembro ? ['membro'] : []);
        }
        $user->syncRoleIdFromSpatieAssignments();

        if ($appRole === 'lider_ministerio') {
            $user->ministries()->sync($request->input('app_ministry_ids', []));
            $user->forceFill(['is_ministry_leader' => true])->save();
            MemberRoleAssignment::applyMinistryLeaderRole($user->fresh());
        } else {
            $user->ministries()->detach();
            $user->forceFill(['is_ministry_leader' => false])->save();
        }
    }

    /** Conta no app ligada a um cadastro de voluntário (serviço em ministérios). */
    private function linkUserToVolunteerService(User $user): void
    {
        if (! $user->is_volunteer) {
            $user->forceFill(['is_volunteer' => true])->save();
        }
        $user->syncVolunteerRecord();
    }

    private function assertVolunteerAppUserLinkable(User $user, Request $request): void
    {
        $msg = VolunteerContactDuplicateChecker::privilegedAccountVolunteerLinkMessage($user, $request->user()?->id);
        if ($msg !== null) {
            throw ValidationException::withMessages([
                'email' => [$msg],
            ]);
        }
    }

    private function currentChurchId(Request $request): ?int
    {
        return Church::resolveWorkingId($request);
    }

    private function resolveExistingUserForVolunteer(Volunteer $volunteer): ?User
    {
        $email = $volunteer->email;
        if (! is_string($email) || trim($email) === '') {
            return null;
        }

        return User::query()->whereRaw('LOWER(email) = ?', [strtolower(trim($email))])->first();
    }

    private function syncVolunteerAppUser(Request $request, Volunteer $volunteer): void
    {
        $password = $request->input('app_password');
        $resolvedEmail = strtolower(trim((string) $request->input('email', (string) ($volunteer->email ?? ''))));

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
                $this->syncLinkedUserAccountFields($request, $user, $volunteer);
                $this->applyAppProfile($user, $request);
                $this->linkUserToVolunteerService($user);
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
            $this->assertVolunteerAppUserLinkable($existingUser, $request);
            $this->releaseVolunteerUserIdForOtherVolunteers((int) $existingUser->id, $volunteer);
            $volunteer->forceFill(['user_id' => $existingUser->id])->save();
            if ($resolvedEmail !== '') {
                $existingUser->email = $resolvedEmail;
            }
            if ($password) {
                $existingUser->password = $password;
            }
            $existingUser->save();
            $this->syncLinkedUserAccountFields($request, $existingUser, $volunteer);
            $this->applyAppProfile($existingUser, $request);
            $this->linkUserToVolunteerService($existingUser);

            return;
        }

        $name = $volunteer->name;
        $email = $resolvedEmail !== '' ? $resolvedEmail : $volunteer->email;
        if (! is_string($email) || trim($email) === '' || ! is_string($name) || trim($name) === '') {
            return;
        }
        if (! $password) {
            return;
        }

        // Sem evento "created": evita criar outro volunteer com o mesmo user_id.
        $user = User::withoutEvents(function () use ($name, $email, $password) {
            return User::create([
                'name' => trim($name),
                'email' => strtolower(trim($email)),
                'password' => $password,
            ]);
        });
        $this->applyAppProfile($user, $request);
        $this->syncLinkedUserAccountFields($request, $user, $volunteer);
        $this->releaseVolunteerUserIdForOtherVolunteers((int) $user->id, $volunteer);
        $volunteer->forceFill(['user_id' => $user->id])->save();
        $this->linkUserToVolunteerService($user);
    }

    private function syncLinkedUserAccountFields(Request $request, User $user, Volunteer $volunteer): void
    {
        if ($user->hasRole('super_admin')) {
            return;
        }

        $name = trim((string) $request->input('name', ''));
        if ($name !== '') {
            $user->name = $name;
        }

        if ($request->has('phone')) {
            $user->phone = $request->input('phone');
        }

        if ($request->filled('user_status')) {
            $user->status = (string) $request->input('user_status');
        }

        if ($request->has('birth_date')) {
            $user->birth_date = $request->input('birth_date') ?: null;
        }

        foreach (['notify_via_app', 'notify_via_email', 'notify_via_whatsapp'] as $key) {
            if ($request->has($key)) {
                $user->{$key} = $request->boolean($key);
            }
        }

        if ($request->hasFile('photo')) {
            $this->deleteStoredUserPhoto($user->photo_url);
            $user->photo_url = $this->storeUserPhoto($request->file('photo'));
        }

        $user->save();

        if ($request->has('birth_date')) {
            $volunteer->forceFill(['birth_date' => $request->input('birth_date') ?: null])->save();
        }
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

    private function resolveOrCreateAppUserForInvite(Volunteer $volunteer): ?User
    {
        if ($volunteer->user_id) {
            return User::query()->find($volunteer->user_id);
        }

        $existing = $this->resolveExistingUserForVolunteer($volunteer);
        if ($existing) {
            $this->releaseVolunteerUserIdForOtherVolunteers((int) $existing->id, $volunteer);
            $volunteer->forceFill(['user_id' => $existing->id])->save();
            $this->linkUserToVolunteerService($existing);

            return $existing;
        }

        $name = trim((string) ($volunteer->name ?? ''));
        if ($name === '') {
            return null;
        }

        $email = VolunteerContactDuplicateChecker::normalizeEmail((string) ($volunteer->email ?? ''));

        $user = User::withoutEvents(function () use ($name, $email) {
            return User::create([
                'name' => $name,
                'email' => $email,
                'password' => Str::random(64),
            ]);
        });

        $this->releaseVolunteerUserIdForOtherVolunteers((int) $user->id, $volunteer);
        $volunteer->forceFill(['user_id' => $user->id])->save();
        $this->linkUserToVolunteerService($user);

        return $user;
    }

    public function index(Request $request): Response
    {
        $search = (string) $request->input('search', '');
        $churchId = $this->currentChurchId($request);

        $volunteersQuery = ($churchId === null
            ? Volunteer::query()->whereRaw('1 = 0')
            : VolunteerChurchRosterBuilder::volunteersVisibleInChurchQuery((int) $churchId)
        )->with([
            'ministries',
            'user:id,email,is_ministry_leader,status,birth_date,photo_url,phone,notify_via_app,notify_via_email,notify_via_whatsapp',
            'user.roles:id,name',
            'user.ministries:id,name',
        ]);

        if ($search !== '') {
            SearchTerm::whereAnyColumnLike($volunteersQuery, ['name', 'email', 'phone'], $search);
        }

        $volunteers = $volunteersQuery
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString()
            ->through(function (Volunteer $v) {
                return [
                    'id' => $v->id,
                    'name' => $v->name,
                    'email' => $v->email,
                    'phone' => $v->phone,
                    'role' => $v->role,
                    'active' => (bool) $v->active,
                    'app_access_only' => (bool) ($v->app_access_only ?? false),
                    'ministries' => $v->ministries->map(fn (Ministry $m) => [
                        'id' => $m->id,
                        'name' => $m->name,
                    ])->values()->all(),
                    'user' => $v->user ? [
                        'id' => $v->user->id,
                        'email' => $v->user->email,
                        'is_ministry_leader' => (bool) ($v->user->is_ministry_leader ?? false),
                        'status' => $v->user->status ?? 'active',
                        'birth_date' => $v->user->birth_date?->format('Y-m-d'),
                        'photo_url' => $v->user->photo_url,
                        'phone' => $v->user->phone,
                        'notify_via_app' => (bool) ($v->user->notify_via_app ?? true),
                        'notify_via_email' => (bool) ($v->user->notify_via_email ?? true),
                        'notify_via_whatsapp' => (bool) ($v->user->notify_via_whatsapp ?? false),
                        'roles' => $v->user->roles->pluck('name')->values()->all(),
                        'ministry_ids' => $v->user->ministries->pluck('id')->map(fn ($id) => (int) $id)->values()->all(),
                    ] : null,
                ];
            });

        $ministriesQuery = Ministry::query()
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'));

        return Inertia::render('Volunteers/Index', [
            'volunteers' => $volunteers,
            'ministries' => $ministriesQuery->orderBy('name')->get(['id', 'name']),
            'appRoles' => Role::query()
                ->where('name', '!=', 'super_admin')
                ->orderBy('name')
                ->get(['id', 'name']),
            'publicVolunteerSignupUrl' => $churchId !== null
                ? VolunteerSelfSignupToken::ensurePublicSignupUrl($churchId)
                : null,
            'filters' => [
                'search' => $search,
            ],
            'detailUrlPattern' => route('volunteers.detail', ['volunteer' => 0]),
            'exportEncaminhadoMissaoUrl' => $churchId !== null
                ? route('volunteers.export-encaminhado-missao')
                : null,
        ]);
    }

    public function exportEncaminhadoMissao(Request $request): StreamedResponse
    {
        abort_unless($request->user()?->can('volunteers.view') || $request->user()?->can('volunteers.manage'), 403);

        $churchId = $this->currentChurchId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');

        return VolunteerEncaminhadoMissaoExport::streamedDownload((int) $churchId);
    }

    public function show(Request $request, Volunteer $volunteer): RedirectResponse
    {
        $churchId = $this->currentChurchId($request);
        if (! $this->volunteerVisibleInWorkingChurch($volunteer, $churchId)) {
            abort(404);
        }

        return redirect()->route('volunteers.index', ['voluntario' => $volunteer->id]);
    }

    public function detail(Request $request, Volunteer $volunteer): JsonResponse
    {
        $churchId = $this->currentChurchId($request);
        if (! $this->volunteerVisibleInWorkingChurch($volunteer, $churchId)) {
            abort(404);
        }

        return response()->json([
            'volunteer' => VolunteerSignupDetailPresenter::forVolunteer($volunteer),
        ]);
    }

    /**
     * Mesma regra de visibilidade que {@see index()}: igreja em contexto e ministérios compatíveis.
     */
    private function volunteerVisibleInWorkingChurch(Volunteer $volunteer, ?int $churchId): bool
    {
        if ($churchId === null) {
            return false;
        }

        return VolunteerChurchRosterBuilder::volunteersVisibleInChurchQuery((int) $churchId)
            ->whereKey($volunteer->getKey())
            ->exists();
    }

    public function store(StoreVolunteerRequest $request)
    {
        $data = collect($request->validated())->except(
            'ministry_ids',
            'app_role',
            'app_ministry_ids',
            'app_password',
            'app_password_confirmation',
            'user_status',
            'notify_via_app',
            'notify_via_email',
            'notify_via_whatsapp',
            'photo',
        )->all();
        $volunteer = Volunteer::create($data);
        $this->syncVolunteerMinistries($request, $volunteer);

        $this->syncVolunteerAppUser($request, $volunteer);

        $churchId = $this->currentChurchId($request);
        if ($churchId !== null) {
            VolunteerPipelineBootstrap::setInteressadoStageForVolunteer($volunteer->fresh(), $churchId);
        }

        return ListModalRedirect::toIndexEdit('volunteers.index', $volunteer, 'Voluntário cadastrado com sucesso!');
    }

    public function update(UpdateVolunteerRequest $request, Volunteer $volunteer)
    {
        $data = collect($request->validated())->except(
            'ministry_ids',
            'app_role',
            'app_ministry_ids',
            'app_password',
            'app_password_confirmation',
            'user_status',
            'notify_via_app',
            'notify_via_email',
            'notify_via_whatsapp',
            'photo',
        )->all();
        $volunteer->update($data);
        if ($request->has('ministry_ids')) {
            $this->syncVolunteerMinistries($request, $volunteer);
        }

        $this->syncVolunteerAppUser($request, $volunteer->fresh());

        $churchId = $this->currentChurchId($request);
        if ($churchId !== null) {
            VolunteerPipelineBootstrap::ensureRowForVolunteerInChurch($volunteer->fresh(), $churchId);
        }

        return ListModalRedirect::toIndexEdit('volunteers.index', $volunteer->fresh(), 'Voluntário atualizado com sucesso!');
    }

    public function destroy(Request $request, Volunteer $volunteer)
    {
        $churchId = $this->currentChurchId($request);
        if (! $this->volunteerVisibleInWorkingChurch($volunteer, $churchId)) {
            abort(404);
        }

        $deleteLinkedUser = $request->boolean('delete_linked_user');
        $linkedUser = $deleteLinkedUser ? User::query()->find($volunteer->user_id) : null;

        if ($linkedUser && (int) $linkedUser->id === (int) $request->user()?->id) {
            return redirect()->route('volunteers.index')->with('error', 'Não pode apagar a sua própria conta desta forma.');
        }

        try {
            app(DeleteVolunteer::class)($volunteer, $deleteLinkedUser && $linkedUser !== null);
        } catch (\Throwable $e) {
            report($e);

            return redirect()->route('volunteers.index')->with(
                'error',
                'Não foi possível excluir o voluntário. Tente novamente ou contate a equipe técnica.'
            );
        }

        $message = ($deleteLinkedUser && $linkedUser)
            ? 'Voluntário e conta de usuário removidos com sucesso.'
            : 'Voluntário removido com sucesso!';

        return redirect()->route('volunteers.index')->with('success', $message);
    }

    public function invite(Volunteer $volunteer)
    {
        $result = $this->createVolunteerInviteLink($volunteer);

        if (! $result['ok']) {
            return match ($result['error']) {
                'no_user' => redirect()->back(fallback: route('volunteers.index'))->with('error', 'Não foi possível gerar convite. Informe um nome válido para o voluntário.'),
                'has_email' => redirect()->back(fallback: route('volunteers.index'))->with('error', 'Este voluntário já possui acesso (e-mail definido).'),
            };
        }

        return redirect()->back(fallback: route('volunteers.index'))
            ->with('success', 'Convite criado. Encaminhe o link para o voluntário finalizar o cadastro (e-mail e senha).')
            ->with('invitation_link', $result['link'])
            ->with('invitation_for_name', $result['name']);
    }

    /**
     * @param  \Illuminate\Http\RedirectResponse  $redirect
     * @return \Illuminate\Http\RedirectResponse
     */
    private function maybeAppendVolunteerInviteFlash(Request $request, Volunteer $volunteer, $redirect)
    {
        if (! $request->boolean('send_invite_after') || $request->boolean('enable_app_access')) {
            return $redirect;
        }

        $result = $this->createVolunteerInviteLink($volunteer);

        if (! $result['ok']) {
            $detail = match ($result['error']) {
                'no_user' => 'Não foi possível gerar o convite. Verifique se o nome do voluntário está completo.',
                'has_email' => 'Não foi possível gerar o convite: já existe e-mail de acesso definido para este voluntário.',
            };

            return redirect()->route('volunteers.index')->with(
                'error',
                'Registro salvo. '.$detail
            );
        }

        return $redirect
            ->with('success', 'Registro salvo. Convite gerado — envie o link para a pessoa concluir o cadastro (e-mail e senha).')
            ->with('invitation_link', $result['link'])
            ->with('invitation_for_name', $result['name']);
    }

    /**
     * @return array{ok: true, link: string, name: string}|array{ok: false, error: 'no_user'|'has_email'}
     */
    private function createVolunteerInviteLink(Volunteer $volunteer): array
    {
        $user = $this->resolveOrCreateAppUserForInvite($volunteer);

        if (! $user) {
            return ['ok' => false, 'error' => 'no_user'];
        }

        if ($user->email !== null) {
            return ['ok' => false, 'error' => 'has_email'];
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
        $name = trim((string) ($volunteer->name ?? ''));
        if ($name === '') {
            $name = 'Voluntário';
        }

        return ['ok' => true, 'link' => $link, 'name' => $name];
    }
}
