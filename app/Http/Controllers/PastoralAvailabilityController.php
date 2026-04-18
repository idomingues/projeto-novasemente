<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\Pastor;
use App\Models\PastoralAvailability;
use App\Support\PastorWeeklySchedule;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PastoralAvailabilityController extends Controller
{
    public function store(Request $request, Pastor $pastor): RedirectResponse
    {
        $this->authorize('updateWeeklySchedule', $pastor);

        $churchId = Church::resolveWorkingId($request);
        if ($churchId === null || (int) $pastor->church_id !== (int) $churchId) {
            abort(403);
        }

        $data = $request->validate([
            'date' => ['required', 'date_format:Y-m-d'],
            'start' => ['required', 'date_format:H:i'],
            'end' => ['required', 'date_format:H:i'],
            'modality' => ['nullable', 'string', Rule::in(PastorWeeklySchedule::MODALITIES)],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        if (strtotime($data['end']) <= strtotime($data['start'])) {
            return back()->withErrors(['end' => 'A hora de fim deve ser depois da hora de início.']);
        }

        $note = isset($data['note']) && trim((string) $data['note']) !== '' ? trim((string) $data['note']) : null;
        $bookable = $request->boolean('bookable_by_members', true);

        PastoralAvailability::query()->create([
            'church_id' => (int) $churchId,
            'pastor_id' => (int) $pastor->id,
            'date' => $data['date'],
            'start' => $data['start'],
            'end' => $data['end'],
            'modality' => $data['modality'] ?? 'both',
            'note' => $note,
            'bookable_by_members' => $bookable,
        ]);

        return back()->with('success', 'Disponibilidade adicionada.');
    }

    public function update(Request $request, Pastor $pastor, PastoralAvailability $availability): RedirectResponse
    {
        $this->authorize('updateWeeklySchedule', $pastor);

        $churchId = Church::resolveWorkingId($request);
        if ($churchId === null || (int) $pastor->church_id !== (int) $churchId) {
            abort(403);
        }

        if ((int) $availability->pastor_id !== (int) $pastor->id || (int) $availability->church_id !== (int) $churchId) {
            abort(404);
        }

        $data = $request->validate([
            'date' => ['required', 'date_format:Y-m-d'],
            'start' => ['required', 'date_format:H:i'],
            'end' => ['required', 'date_format:H:i'],
            'modality' => ['nullable', 'string', Rule::in(PastorWeeklySchedule::MODALITIES)],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        if (strtotime($data['end']) <= strtotime($data['start'])) {
            return back()->withErrors(['end' => 'A hora de fim deve ser depois da hora de início.']);
        }

        $note = isset($data['note']) && trim((string) $data['note']) !== '' ? trim((string) $data['note']) : null;
        $bookable = $request->boolean('bookable_by_members', true);

        $availability->date = $data['date'];
        $availability->start = $data['start'];
        $availability->end = $data['end'];
        $availability->modality = $data['modality'] ?? 'both';
        $availability->note = $note;
        $availability->bookable_by_members = $bookable;
        $availability->save();

        return back()->with('success', 'Disponibilidade atualizada.');
    }

    public function destroy(Request $request, Pastor $pastor, PastoralAvailability $availability): RedirectResponse
    {
        $this->authorize('updateWeeklySchedule', $pastor);

        $churchId = Church::resolveWorkingId($request);
        if ($churchId === null || (int) $pastor->church_id !== (int) $churchId) {
            abort(403);
        }

        if ((int) $availability->pastor_id !== (int) $pastor->id || (int) $availability->church_id !== (int) $churchId) {
            abort(404);
        }

        $availability->delete();

        return back()->with('success', 'Disponibilidade removida.');
    }
}
