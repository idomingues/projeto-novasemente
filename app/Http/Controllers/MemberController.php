<?php

namespace App\Http\Controllers;

use App\Domain\Users\Actions\CreateChurchUserProfile;
use App\Domain\Users\Actions\DeleteChurchUserProfile;
use App\Domain\Users\Actions\UpdateChurchUserProfile;
use App\Http\Requests\StoreMemberRequest;
use App\Http\Requests\UpdateMemberRequest;
use App\Models\Church;
use App\Models\Ministry;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

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
            ->with(['volunteerProfile.ministries'])
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

        return Inertia::render('Members/Index', [
            'members' => $users->through(function (User $user) {
                $volunteerMinistryIds = $user->volunteerProfile
                    ? $user->volunteerProfile->ministries()->pluck('ministries.id')->map(fn ($id) => (int) $id)->values()->all()
                    : [];

                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'birth_date' => $user->birth_date?->toIso8601String(),
                    'address' => $user->address,
                    'status' => $user->status ?? 'active',
                    'is_volunteer' => (bool) ($user->is_volunteer ?? false),
                    'volunteer_ministry_ids' => $volunteerMinistryIds,
                    'photo_url' => $user->photo_url,
                    'notify_via_app' => (bool) ($user->notify_via_app ?? true),
                    'notify_via_email' => (bool) ($user->notify_via_email ?? true),
                    'notify_via_whatsapp' => (bool) ($user->notify_via_whatsapp ?? false),
                    'lgpd_accepted_at' => $user->lgpd_accepted_at?->toIso8601String(),
                    'created_at' => $user->created_at->toIso8601String(),
                ];
            }),
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
        if ($request->hasFile('photo')) {
            $validated['photo_url'] = $this->storeUserPhoto($request->file('photo'));
        }
        unset($validated['photo']);

        $data = array_merge($validated, [
            'church_id' => $churchId,
        ]);
        $createChurchUserProfile($data);

        return redirect()->route('members.index')->with('success', 'Usuário criado com sucesso!');
    }

    public function show(Request $request, User $user)
    {
        $this->assertUserBelongsToWorkingChurch($request, $user);

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
                'photo_url' => $user->photo_url,
                'notify_via_app' => (bool) ($user->notify_via_app ?? true),
                'notify_via_email' => (bool) ($user->notify_via_email ?? true),
                'notify_via_whatsapp' => (bool) ($user->notify_via_whatsapp ?? false),
                'lgpd_accepted_at' => $user->lgpd_accepted_at?->toIso8601String(),
                'created_at' => $user->created_at->toIso8601String(),
            ],
        ]);
    }

    public function update(UpdateMemberRequest $request, User $user, UpdateChurchUserProfile $updateChurchUserProfile)
    {
        $this->assertUserBelongsToWorkingChurch($request, $user);
        $validated = $request->validated();
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
}
