<?php

namespace App\Http\Controllers;

use App\Domain\Users\Actions\CreateChurchUserProfile;
use App\Domain\Users\Actions\DeleteChurchUserProfile;
use App\Domain\Users\Actions\UpdateChurchUserProfile;
use App\Http\Requests\StoreMemberRequest;
use App\Http\Requests\UpdateMemberRequest;
use App\Models\Church;
use App\Models\User;
use Illuminate\Http\Request;
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

        return Inertia::render('Members/Index', [
            'members' => $users->through(function (User $user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'birth_date' => $user->birth_date?->toIso8601String(),
                    'address' => $user->address,
                    'status' => $user->status ?? 'active',
                    'is_volunteer' => (bool) ($user->is_volunteer ?? false),
                    'created_at' => $user->created_at->toIso8601String(),
                ];
            }),
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
        $data = array_merge($request->validated(), [
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
                'created_at' => $user->created_at->toIso8601String(),
            ],
        ]);
    }

    public function update(UpdateMemberRequest $request, User $user, UpdateChurchUserProfile $updateChurchUserProfile)
    {
        $this->assertUserBelongsToWorkingChurch($request, $user);
        $updateChurchUserProfile($user, $request->validated());

        return redirect()->route('members.index')->with('success', 'Usuário atualizado com sucesso!');
    }

    public function destroy(Request $request, User $user, DeleteChurchUserProfile $deleteChurchUserProfile)
    {
        $this->assertUserBelongsToWorkingChurch($request, $user);
        $deleteChurchUserProfile($user);

        return redirect()->route('members.index')->with('success', 'Usuário removido com sucesso!');
    }
}
