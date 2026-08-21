<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\ConvivaCheckin;
use App\Models\ConvivaClass;
use App\Models\ConvivaPreference;
use App\Support\ConvivaSaturday;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ConvivaCheckinController extends Controller
{
    private function resolveChurchId(Request $request): ?int
    {
        $userChurch = $request->user()?->church_id;
        if ($userChurch) {
            return (int) $userChurch;
        }

        return Church::resolveWorkingId($request);
    }

    public function show(Request $request): Response
    {
        $churchId = $this->resolveChurchId($request);
        $user = $request->user();
        $isSaturday = ConvivaSaturday::isSaturday();
        $today = ConvivaSaturday::todayDateString();

        $classes = ConvivaClass::query()
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('room_name')
            ->orderBy('teacher_name')
            ->get(['id', 'room_name', 'teacher_name']);

        $preferenceClassId = null;
        $todayCheckin = null;

        if ($user && $churchId !== null) {
            $preferenceClassId = ConvivaPreference::query()
                ->where('user_id', $user->id)
                ->where('church_id', $churchId)
                ->value('conviva_class_id');

            $todayCheckin = ConvivaCheckin::query()
                ->with('convivaClass:id,room_name,teacher_name')
                ->where('user_id', $user->id)
                ->where('church_id', $churchId)
                ->whereDate('checkin_date', $today)
                ->first();
        }

        $suggestedClassId = $todayCheckin?->conviva_class_id
            ?? $preferenceClassId
            ?? $classes->first()?->id;

        return Inertia::render('Mobile/ConvivaCheckin', [
            'classes' => $classes,
            'suggestedClassId' => $suggestedClassId ? (int) $suggestedClassId : null,
            'isSaturday' => $isSaturday,
            'today' => $today,
            'todayLabel' => ConvivaSaturday::now()->translatedFormat('d \d\e F'),
            'checkin' => $todayCheckin ? [
                'id' => $todayCheckin->id,
                'class_id' => $todayCheckin->conviva_class_id,
                'room_name' => $todayCheckin->convivaClass?->room_name,
                'teacher_name' => $todayCheckin->convivaClass?->teacher_name,
                'checked_in_at' => $todayCheckin->created_at?->timezone(config('app.timezone'))->format('H:i'),
            ] : null,
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $churchId = $this->resolveChurchId($request);

        if (! $user || $churchId === null) {
            throw ValidationException::withMessages([
                'conviva_class_id' => 'Não foi possível identificar a igreja da sua conta.',
            ]);
        }

        if (! ConvivaSaturday::isSaturday()) {
            throw ValidationException::withMessages([
                'conviva_class_id' => 'O check-in do CONVIVA só está disponível aos sábados.',
            ]);
        }

        $data = $request->validate([
            'conviva_class_id' => ['required', 'integer', 'exists:conviva_classes,id'],
        ]);

        $class = ConvivaClass::query()
            ->where('id', $data['conviva_class_id'])
            ->where('church_id', $churchId)
            ->where('is_active', true)
            ->first();

        if (! $class) {
            throw ValidationException::withMessages([
                'conviva_class_id' => 'Turma inválida ou inativa.',
            ]);
        }

        $today = ConvivaSaturday::todayDateString();

        $checkin = ConvivaCheckin::query()
            ->where('church_id', $churchId)
            ->where('user_id', $user->id)
            ->whereDate('checkin_date', $today)
            ->first();

        $created = false;
        if ($checkin) {
            $checkin->update(['conviva_class_id' => $class->id]);
        } else {
            $checkin = ConvivaCheckin::query()->create([
                'church_id' => $churchId,
                'user_id' => $user->id,
                'conviva_class_id' => $class->id,
                'checkin_date' => $today,
            ]);
            $created = true;
        }

        ConvivaPreference::query()->updateOrCreate(
            [
                'user_id' => $user->id,
                'church_id' => $churchId,
            ],
            [
                'conviva_class_id' => $class->id,
            ]
        );

        return redirect()
            ->route('mobile.conviva.checkin')
            ->with('success', $created
                ? 'Check-in CONVIVA realizado!'
                : 'Turma do check-in atualizada!');
    }
}
