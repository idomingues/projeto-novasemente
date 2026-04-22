<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\Pastor;
use App\Models\User;
use App\Support\PastorWeeklySchedule;
use App\Support\StorageUrl;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PastorController extends Controller
{
    /**
     * @param  array<int, array{weekday: int, start: string, end: string, modality: string}>|null  $raw
     */
    private function scheduleSummaryLine(?array $raw): ?string
    {
        $rows = PastorWeeklySchedule::normalize($raw);
        if ($rows === []) {
            return null;
        }

        $wd = [1 => 'Seg', 2 => 'Ter', 3 => 'Qua', 4 => 'Qui', 5 => 'Sex', 6 => 'Sáb', 7 => 'Dom'];
        $parts = [];
        foreach ($rows as $r) {
            $m = (string) ($r['modality'] ?? 'both');
            $mShort = match ($m) {
                'presential' => ' pres.',
                'online' => ' onl.',
                default => '',
            };
            $parts[] = ($wd[$r['weekday']] ?? '?').' '.$r['start'].'–'.$r['end'].$mShort;
        }

        return implode(' · ', $parts);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<int, array{weekday: int, start: string, end: string}>
     */
    private function validatedWeeklySchedule(array $data): array
    {
        $rows = $data['weekly_schedule'] ?? null;
        if ($rows === null) {
            return [];
        }
        if (! is_array($rows)) {
            throw ValidationException::withMessages([
                'weekly_schedule' => 'Formato de horários inválido.',
            ]);
        }

        $validated = validator(
            ['weekly_schedule' => $rows],
            [
                'weekly_schedule' => ['array', 'max:24'],
                'weekly_schedule.*.weekday' => ['required', 'integer', Rule::in([1, 2, 3, 4, 5, 6, 7])],
                'weekly_schedule.*.start' => ['required', 'date_format:H:i'],
                'weekly_schedule.*.end' => ['required', 'date_format:H:i'],
                'weekly_schedule.*.modality' => ['nullable', 'string', Rule::in(PastorWeeklySchedule::MODALITIES)],
            ],
            [
                'weekly_schedule.array' => 'Os horários semanais devem ser uma lista.',
                'weekly_schedule.max' => 'Demasiadas linhas de horário (máx. 24).',
            ],
        )->validate();

        $normalized = PastorWeeklySchedule::normalize($validated['weekly_schedule']);

        foreach ($normalized as $i => $row) {
            $start = strtotime($row['start']);
            $end = strtotime($row['end']);
            if ($start === false || $end === false || $end <= $start) {
                throw ValidationException::withMessages([
                    "weekly_schedule.$i.end" => 'A hora de fim deve ser depois da hora de início.',
                ]);
            }
        }

        return $normalized;
    }

    /**
     * @param  array<int|string>|null  $raw
     * @return list<int>
     */
    private function normalizedAgendaDelegateUserIds(?array $raw, ?int $primaryUserId): array
    {
        if ($raw === null || $raw === []) {
            return [];
        }

        $ids = [];
        foreach ($raw as $v) {
            if (is_numeric($v)) {
                $i = (int) $v;
                if ($i > 0) {
                    $ids[] = $i;
                }
            }
        }

        $ids = array_values(array_unique($ids));
        if ($primaryUserId !== null && $primaryUserId > 0) {
            $ids = array_values(array_filter($ids, fn (int $id) => $id !== (int) $primaryUserId));
        }
        sort($ids);

        return array_slice($ids, 0, 20);
    }

    private function deleteStoredPhoto(?string $photoPath): void
    {
        $relative = StorageUrl::relativePathFromAnyPublicUrl($photoPath);
        if ($relative !== null) {
            Storage::disk('public')->delete($relative);
        }
    }

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Pastor::class);

        $churchId = Church::resolveWorkingId($request);
        $user = $request->user();
        $canManage = $user
            && ($user->hasAnyRole(['super_admin', 'admin']) || $user->can('pastors.manage'));

        $pastors = Pastor::query()
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->with(['linkedUser:id,email'])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn (Pastor $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'bio' => $p->bio,
                'photo_path' => $p->photo_path,
                'sort_order' => $p->sort_order,
                'user_id' => $p->user_id,
                'linked_user_email' => $p->linkedUser?->email,
                'agenda_delegate_user_ids' => $this->normalizedAgendaDelegateUserIds(
                    is_array($p->agenda_delegate_user_ids) ? $p->agenda_delegate_user_ids : null,
                    $p->user_id !== null ? (int) $p->user_id : null
                ),
                'scheduleSummary' => $this->scheduleSummaryLine($p->weekly_schedule),
            ])
            ->values()
            ->all();

        $linkableUsers = [];
        if ($canManage && $churchId !== null) {
            $linkableUsers = User::query()
                ->orderBy('name')
                ->limit(400)
                ->get(['id', 'name', 'email'])
                ->map(fn (User $u) => [
                    'id' => $u->id,
                    'label' => $u->name.($u->email ? ' · '.$u->email : ''),
                ])
                ->values()
                ->all();
        }

        return Inertia::render('Pastors/Index', [
            'pastors' => $pastors,
            'canManage' => $canManage,
            'linkableUsers' => $linkableUsers,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', Pastor::class);

        $churchId = Church::resolveWorkingId($request);
        if ($churchId === null) {
            return redirect()->route('pastors.index')->with('error', 'Nenhuma igreja ativa.');
        }

        if ($request->input('user_id') === '' || $request->input('user_id') === null) {
            $request->merge(['user_id' => null]);
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'bio' => ['nullable', 'string', 'max:20000'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'photo' => ['nullable', 'image', 'max:4096'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'agenda_delegate_user_ids' => ['nullable', 'array', 'max:20'],
            'agenda_delegate_user_ids.*' => ['integer', 'exists:users,id'],
        ]);

        $this->assertUserIdUniqueForChurch($churchId, isset($data['user_id']) ? (int) $data['user_id'] : null, null);

        $primaryUid = isset($data['user_id']) ? (int) $data['user_id'] : null;
        $delegateIds = $this->normalizedAgendaDelegateUserIds($data['agenda_delegate_user_ids'] ?? null, $primaryUid);

        $photoUrl = null;
        if ($request->hasFile('photo')) {
            $path = $request->file('photo')->store('pastors', 'public');
            $photoUrl = StorageUrl::publicMediaUrl($path);
        }

        Pastor::create([
            'church_id' => $churchId,
            'user_id' => isset($data['user_id']) ? (int) $data['user_id'] : null,
            'agenda_delegate_user_ids' => $delegateIds === [] ? null : $delegateIds,
            'name' => $data['name'],
            'bio' => $data['bio'] ?? null,
            'photo_path' => $photoUrl,
            'sort_order' => $data['sort_order'] ?? 0,
            'weekly_schedule' => null,
        ]);

        return redirect()->route('pastors.index')->with('success', 'Pastor adicionado.');
    }

    public function update(Request $request, Pastor $pastor): RedirectResponse
    {
        $this->authorize('update', $pastor);

        $churchId = Church::resolveWorkingId($request);
        if ($churchId === null || (int) $pastor->church_id !== (int) $churchId) {
            abort(403);
        }

        if ($request->input('user_id') === '' || $request->input('user_id') === null) {
            $request->merge(['user_id' => null]);
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'bio' => ['nullable', 'string', 'max:20000'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'photo' => ['nullable', 'image', 'max:4096'],
            'weekly_schedule' => ['sometimes', 'nullable', 'array'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'agenda_delegate_user_ids' => ['nullable', 'array', 'max:20'],
            'agenda_delegate_user_ids.*' => ['integer', 'exists:users,id'],
        ]);

        $this->assertUserIdUniqueForChurch($churchId, isset($data['user_id']) ? (int) $data['user_id'] : null, $pastor->id);

        $primaryUid = isset($data['user_id']) ? (int) $data['user_id'] : null;
        $delegateIds = $this->normalizedAgendaDelegateUserIds($data['agenda_delegate_user_ids'] ?? null, $primaryUid);

        if ($request->hasFile('photo')) {
            $this->deleteStoredPhoto($pastor->photo_path);
            $path = $request->file('photo')->store('pastors', 'public');
            $pastor->photo_path = StorageUrl::publicMediaUrl($path);
        }

        $pastor->name = $data['name'];
        $pastor->bio = $data['bio'] ?? null;
        $pastor->sort_order = $data['sort_order'] ?? 0;
        $pastor->user_id = isset($data['user_id']) ? (int) $data['user_id'] : null;
        $pastor->agenda_delegate_user_ids = $delegateIds === [] ? null : $delegateIds;
        if ($request->has('weekly_schedule')) {
            $weeklySchedule = $this->validatedWeeklySchedule($data);
            $pastor->weekly_schedule = $weeklySchedule === [] ? null : $weeklySchedule;
        }
        $pastor->save();

        return redirect()->route('pastors.index')->with('success', 'Pastor atualizado.');
    }

    public function destroy(Request $request, Pastor $pastor): RedirectResponse
    {
        $this->authorize('delete', $pastor);

        $churchId = Church::resolveWorkingId($request);
        if ($churchId === null || (int) $pastor->church_id !== (int) $churchId) {
            abort(403);
        }

        $this->deleteStoredPhoto($pastor->photo_path);
        $pastor->delete();

        return redirect()->route('pastors.index')->with('success', 'Pastor removido.');
    }

    public function updateWeeklySchedule(Request $request, Pastor $pastor): RedirectResponse
    {
        $this->authorize('updateWeeklySchedule', $pastor);

        $churchId = Church::resolveWorkingId($request);
        if ($churchId === null || (int) $pastor->church_id !== (int) $churchId) {
            abort(403);
        }

        $data = $request->validate([
            'weekly_schedule' => ['nullable', 'array'],
        ]);

        $weeklySchedule = $this->validatedWeeklySchedule($data);
        $pastor->weekly_schedule = $weeklySchedule === [] ? null : $weeklySchedule;
        $pastor->save();

        return redirect()
            ->back()
            ->with('success', 'Disponibilidade semanal atualizada.');
    }

    private function assertUserIdUniqueForChurch(int $churchId, ?int $userId, ?int $ignorePastorId): void
    {
        if ($userId === null || $userId === 0) {
            return;
        }

        $q = Pastor::query()
            ->where('church_id', $churchId)
            ->where('user_id', $userId);
        if ($ignorePastorId !== null) {
            $q->where('id', '!=', $ignorePastorId);
        }
        if ($q->exists()) {
            throw ValidationException::withMessages([
                'user_id' => 'Esta conta já está associada a outro pastor nesta igreja.',
            ]);
        }
    }
}
