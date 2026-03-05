<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\Member;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Domain\Members\Actions\CreateMember;
use App\Domain\Members\Actions\UpdateMember;
use App\Domain\Members\Actions\DeleteMember;
use App\Http\Requests\StoreMemberRequest;
use App\Http\Requests\UpdateMemberRequest;

class MemberController extends Controller
{
    private function currentChurchId(): ?int
    {
        return Church::where('active', true)->orderBy('name')->value('id');
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $search = (string) $request->input('search', '');
        $churchId = $this->currentChurchId();

        $query = Member::query()->when($churchId, fn ($q) => $q->where('church_id', $churchId));
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        return Inertia::render('Members/Index', [
            'members' => $query->latest()->paginate(10)->withQueryString(),
            'filters' => [
                'search' => $search,
            ],
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreMemberRequest $request, CreateMember $createMember)
    {
        $data = array_merge($request->validated(), [
            'church_id' => $this->currentChurchId(),
        ]);
        $createMember($data);

        return redirect()->route('members.index')->with('success', 'Membro criado com sucesso!');
    }

    /**
     * Display the specified resource.
     */
    public function show(Member $member)
    {
        return Inertia::render('Members/Show', [
            'member' => $member,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateMemberRequest $request, Member $member, UpdateMember $updateMember)
    {
        $updateMember($member, $request->validated());

        return redirect()->route('members.index')->with('success', 'Membro atualizado com sucesso!');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Member $member, DeleteMember $deleteMember)
    {
        $deleteMember($member);

        return redirect()->route('members.index')->with('success', 'Membro removido com sucesso!');
    }
}
