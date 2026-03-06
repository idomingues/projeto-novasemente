<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\Member;
use App\Models\Ministry;
use App\Models\Volunteer;
use Illuminate\Http\Request;
use App\Http\Requests\StoreVolunteerRequest;
use App\Http\Requests\UpdateVolunteerRequest;
use Inertia\Inertia;
use Inertia\Response;

class VolunteerController extends Controller
{
    private function currentChurchId(): ?int
    {
        return Church::where('active', true)->orderBy('name')->value('id');
    }

    public function index(Request $request): Response
    {
        $search = (string) $request->input('search', '');
        $churchId = $this->currentChurchId();

        $volunteersQuery = Volunteer::with(['member', 'ministries'])
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
            'members' => $membersQuery->orderBy('name')->get(['id', 'name', 'photo_url']),
            'ministries' => $ministriesQuery->orderBy('name')->get(['id', 'name']),
            'filters' => [
                'search' => $search,
            ],
        ]);
    }

    public function store(StoreVolunteerRequest $request)
    {
        $data = collect($request->validated())->except('photo_url', 'ministry_ids')->all();
        $volunteer = Volunteer::create($data);
        $volunteer->ministries()->sync($request->input('ministry_ids', []));
        if ($volunteer->member_id && $request->filled('photo_url')) {
            $volunteer->member->update(['photo_url' => $request->input('photo_url')]);
        }
        return redirect()->route('volunteers.index')->with('success', 'Voluntário cadastrado com sucesso!');
    }

    public function update(UpdateVolunteerRequest $request, Volunteer $volunteer)
    {
        $data = collect($request->validated())->except('photo_url', 'ministry_ids')->all();
        $volunteer->update($data);
        $volunteer->ministries()->sync($request->input('ministry_ids', []));
        if ($volunteer->member_id && $request->has('photo_url')) {
            $volunteer->member->update(['photo_url' => $request->input('photo_url')]);
        }
        return redirect()->route('volunteers.index')->with('success', 'Voluntário atualizado com sucesso!');
    }

    public function destroy(Volunteer $volunteer)
    {
        $volunteer->delete();
        return redirect()->route('volunteers.index')->with('success', 'Voluntário removido com sucesso!');
    }
}
