<?php

namespace App\Http\Controllers;

use App\Domain\Volunteers\Actions\SyncVolunteerMinistryAttachments;
use App\Http\Requests\StoreVolunteerRequest;
use App\Http\Requests\UpdateVolunteerRequest;
use App\Models\Church;
use App\Models\Invitation;
use App\Models\Ministry;
use App\Models\User;
use App\Models\Volunteer;
use App\Models\VolunteerSelfSignupToken;
use App\Support\VolunteerPipelineBootstrap;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
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
        if ($user->hasRole('super_admin')) {
            return;
        }

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
                $this->applyAppProfile($user, $request);
                $user->ensureVolunteerProfile();
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
            $existingUser->ensureVolunteerProfile();

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

        // Sem evento "created": evita ensureVolunteerProfile() criar outro volunteer com o mesmo user_id.
        $user = User::withoutEvents(function () use ($name, $email, $password) {
            return User::create([
                'name' => trim($name),
                'email' => strtolower(trim($email)),
                'password' => $password,
            ]);
        });
        $this->applyAppProfile($user, $request);
        $this->releaseVolunteerUserIdForOtherVolunteers((int) $user->id, $volunteer);
        $volunteer->forceFill(['user_id' => $user->id])->save();
        $user->ensureVolunteerProfile();
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
            $existing->ensureVolunteerProfile();

            return $existing;
        }

        $name = trim((string) ($volunteer->name ?? ''));
        if ($name === '') {
            return null;
        }

        $user = User::withoutEvents(function () use ($name) {
            return User::create([
                'name' => $name,
                'email' => null,
                'password' => Str::random(64),
            ]);
        });

        $this->releaseVolunteerUserIdForOtherVolunteers((int) $user->id, $volunteer);
        $volunteer->forceFill(['user_id' => $user->id])->save();
        $user->ensureVolunteerProfile();

        return $user;
    }

    public function index(Request $request): Response
    {
        $search = (string) $request->input('search', '');
        $churchId = $this->currentChurchId($request);

        $volunteersQuery = Volunteer::with(['ministries', 'user:id,email', 'user.roles:id,name', 'user.ministries:id,name'])
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->when($churchId !== null, function ($q) use ($churchId) {
                $q->where(function ($q2) use ($churchId) {
                    $q2->whereDoesntHave('ministries')
                        ->orWhereHas('ministries', fn ($mq) => $mq->where('church_id', $churchId));
                });
            });

        if ($search !== '') {
            $volunteersQuery->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
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
        ]);
    }

    public function show(Request $request, Volunteer $volunteer): Response
    {
        $churchId = $this->currentChurchId($request);
        if (! $this->volunteerVisibleInWorkingChurch($volunteer, $churchId)) {
            abort(404);
        }

        $volunteer->load([
            'ministries',
            'user:id,email,name',
            'user.roles:id,name',
            'user.ministries:id,name',
        ]);

        return Inertia::render('Volunteers/Show', [
            'volunteer' => $this->volunteerDetailPayload($volunteer),
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

        return Volunteer::query()
            ->whereKey($volunteer->getKey())
            ->where(function ($q2) use ($churchId) {
                $q2->whereDoesntHave('ministries')
                    ->orWhereHas('ministries', fn ($mq) => $mq->where('church_id', $churchId));
            })
            ->exists();
    }

    /**
     * @return array<string, mixed>
     */
    private function volunteerDetailPayload(Volunteer $v): array
    {
        return [
            'id' => $v->id,
            'name' => $v->name,
            'email' => $v->email,
            'phone' => $v->phone,
            'birth_date' => $v->birth_date?->format('Y-m-d'),
            'has_whatsapp' => $v->has_whatsapp,
            'has_social_networks' => $v->has_social_networks,
            'attendance_duration' => $v->attendance_duration,
            'is_official_member' => $v->is_official_member,
            'member_record_at_nova_semente' => $v->member_record_at_nova_semente,
            'member_record_church' => $v->member_record_church,
            'has_previous_ministry_volunteer_experience' => $v->has_previous_ministry_volunteer_experience,
            'previous_ministry_details' => $v->previous_ministry_details,
            'ministry_involvement' => $v->ministry_involvement,
            'other_ministry_interest' => $v->other_ministry_interest,
            'gifts_to_develop' => $v->gifts_to_develop,
            'professional_area' => $v->professional_area,
            'needs_pastoral_guidance' => $v->needs_pastoral_guidance,
            'lgpd_data_consent' => $v->lgpd_data_consent,
            'role' => $v->role,
            'active' => (bool) $v->active,
            'app_access_only' => (bool) ($v->app_access_only ?? false),
            'created_at' => $v->created_at?->toIso8601String(),
            'updated_at' => $v->updated_at?->toIso8601String(),
            'ministries' => $v->ministries->map(fn (Ministry $m) => [
                'id' => $m->id,
                'name' => $m->name,
            ])->values()->all(),
            'user' => $v->user ? [
                'id' => $v->user->id,
                'email' => $v->user->email,
                'name' => $v->user->name,
                'roles' => $v->user->roles->pluck('name')->values()->all(),
                'ministry_ids' => $v->user->ministries->pluck('id')->map(fn ($id) => (int) $id)->values()->all(),
            ] : null,
        ];
    }

    public function store(StoreVolunteerRequest $request)
    {
        $data = collect($request->validated())->except('ministry_ids', 'app_role', 'app_ministry_ids', 'app_password', 'app_password_confirmation')->all();
        $volunteer = Volunteer::create($data);
        $this->syncVolunteerMinistries($request, $volunteer);

        $this->syncVolunteerAppUser($request, $volunteer);

        $churchId = $this->currentChurchId($request);
        if ($churchId !== null) {
            VolunteerPipelineBootstrap::ensureRowForVolunteerInChurch($volunteer->fresh(), $churchId);
        }

        $redirect = redirect()->route('volunteers.index')->with('success', 'Voluntário cadastrado com sucesso!');

        return $redirect;
    }

    public function update(UpdateVolunteerRequest $request, Volunteer $volunteer)
    {
        $data = collect($request->validated())->except('ministry_ids', 'app_role', 'app_ministry_ids', 'app_password', 'app_password_confirmation')->all();
        $volunteer->update($data);
        $this->syncVolunteerMinistries($request, $volunteer);

        $this->syncVolunteerAppUser($request, $volunteer->fresh());

        $churchId = $this->currentChurchId($request);
        if ($churchId !== null) {
            VolunteerPipelineBootstrap::ensureRowForVolunteerInChurch($volunteer->fresh(), $churchId);
        }

        $redirect = redirect()->route('volunteers.index')->with('success', 'Voluntário atualizado com sucesso!');

        return $redirect;
    }

    public function destroy(Volunteer $volunteer)
    {
        $volunteer->delete();

        return redirect()->route('volunteers.index')->with('success', 'Voluntário removido com sucesso!');
    }

    public function invite(Volunteer $volunteer)
    {
        $result = $this->createVolunteerInviteLink($volunteer);

        if (! $result['ok']) {
            return match ($result['error']) {
                'no_user' => redirect()->route('volunteers.index')->with('error', 'Não foi possível gerar convite. Informe um nome válido para o voluntário.'),
                'has_email' => redirect()->route('volunteers.index')->with('error', 'Este voluntário já possui acesso (e-mail definido).'),
            };
        }

        return redirect()->route('volunteers.index')
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
                'Registo guardado. '.$detail
            );
        }

        return $redirect
            ->with('success', 'Registo guardado. Convite gerado — envie o link para a pessoa concluir o cadastro (e-mail e senha).')
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
