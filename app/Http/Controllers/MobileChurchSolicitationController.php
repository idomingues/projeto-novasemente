<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\ChurchSolicitation;
use App\Models\ChurchSolicitationMessage;
use App\Services\SolicitationChatNotifier;
use App\Support\InboxNotificationResolver;
use App\Support\SolicitationAssignees;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MobileChurchSolicitationController extends Controller
{
    private const TYPES = ['baptism', 'baby_presentation', 'pastor_visit', 'bible_study', 'other'];

    private function currentChurchId(Request $request): ?int
    {
        return Church::resolveWorkingId($request);
    }

    public static function typeLabel(string $type): string
    {
        return match ($type) {
            'baptism' => 'Pedido de batismo',
            'baby_presentation' => 'Apresentação de bebé',
            'pastor_visit' => 'Visita aos pastores',
            'bible_study' => 'Estudo bíblico',
            'other' => 'Outros',
            default => $type,
        };
    }

    public static function statusLabel(string $status): string
    {
        return match ($status) {
            'pending' => 'Pendente',
            'in_progress' => 'Em tratamento',
            'completed' => 'Concluído',
            'cancelled' => 'Cancelado',
            default => $status,
        };
    }

    public function hub(Request $request): Response
    {
        $types = collect(self::TYPES)->map(fn (string $t) => [
            'type' => $t,
            'label' => self::typeLabel($t),
        ])->values()->all();

        return Inertia::render('Mobile/Solicitations/Hub', [
            'types' => $types,
            'mineUrl' => route('mobile.solicitations.mine'),
            'createUrls' => collect(self::TYPES)->mapWithKeys(fn (string $t) => [
                $t => route('mobile.solicitations.create', ['type' => $t]),
            ])->all(),
        ]);
    }

    public function create(Request $request, string $type): Response
    {
        abort_unless(in_array($type, self::TYPES, true), 404);

        $churchId = $this->currentChurchId($request);

        return Inertia::render('Mobile/Solicitations/Create', [
            'type' => $type,
            'typeLabel' => self::typeLabel($type),
            'storeUrl' => route('mobile.solicitations.store'),
            'pastorOptions' => SolicitationAssignees::pastorOptions($churchId),
            'volunteerOptions' => [],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user, 401);

        $churchId = $this->currentChurchId($request);
        SolicitationAssignees::normalizeAssignmentRequest($request);

        $valid = $request->validate(array_merge([
            'type' => ['required', 'in:'.implode(',', self::TYPES)],
            'message' => ['required', 'string', 'max:5000'],
            'meta' => ['nullable', 'array'],
        ], SolicitationAssignees::assignmentRules($churchId)));

        SolicitationAssignees::assertSingleAssignee($valid);

        $pastorId = $valid['assigned_pastor_id'] ?? null;
        $volunteerId = $valid['assigned_volunteer_id'] ?? null;

        $solicitation = ChurchSolicitation::create([
            'user_id' => $user->id,
            'member_id' => $user->member_id ? (int) $user->member_id : null,
            'type' => $valid['type'],
            'status' => 'pending',
            'message' => $valid['message'],
            'preferred_date' => $valid['preferred_date'] ?? null,
            'assigned_pastor_id' => $pastorId !== null ? (int) $pastorId : null,
            'assigned_volunteer_id' => $volunteerId !== null ? (int) $volunteerId : null,
            'meta' => $valid['meta'] ?? null,
        ]);

        return redirect()->route('mobile.solicitations.show', $solicitation);
    }

    public function mine(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user, 401);

        $rows = ChurchSolicitation::query()
            ->where('user_id', $user->id)
            ->orderByDesc('updated_at')
            ->limit(50)
            ->get()
            ->map(fn (ChurchSolicitation $s) => [
                'id' => $s->id,
                'type' => $s->type,
                'typeLabel' => self::typeLabel($s->type),
                'status' => $s->status,
                'statusLabel' => self::statusLabel($s->status),
                'messageExcerpt' => mb_strimwidth(strip_tags($s->message), 0, 120, '…'),
                'updatedAt' => $s->updated_at?->toIso8601String(),
                'showUrl' => route('mobile.solicitations.show', $s),
            ])
            ->values()
            ->all();

        return Inertia::render('Mobile/Solicitations/Mine', [
            'solicitations' => $rows,
            'hubUrl' => route('mobile.solicitations.hub'),
        ]);
    }

    public function show(Request $request, ChurchSolicitation $solicitation): Response
    {
        $this->authorize('view', $solicitation);
        InboxNotificationResolver::markReadFromQuery($request);

        return Inertia::render('Mobile/Solicitations/Show', $this->memberShowPayload($solicitation));
    }

    /**
     * @return array<string, mixed>
     */
    private function memberShowPayload(ChurchSolicitation $s): array
    {
        $s->loadMissing([
            'assignedPastor:id,name',
            'assignedVolunteer.member:id,name',
        ]);

        $messages = ChurchSolicitationMessage::query()
            ->where('church_solicitation_id', $s->id)
            ->with('senderUser:id,name')
            ->orderBy('created_at')
            ->get()
            ->map(fn (ChurchSolicitationMessage $m) => [
                'id' => $m->id,
                'senderType' => $m->sender_type,
                'senderUserId' => $m->sender_user_id,
                'senderName' => $m->senderUser?->name,
                'content' => $m->content,
                'createdAt' => $m->created_at?->toIso8601String(),
            ])
            ->values()
            ->all();

        return [
            'solicitation' => [
                'id' => $s->id,
                'type' => $s->type,
                'typeLabel' => self::typeLabel($s->type),
                'status' => $s->status,
                'statusLabel' => self::statusLabel($s->status),
                'message' => $s->message,
                'meta' => $s->meta,
                'preferredDate' => $s->preferred_date?->format('Y-m-d'),
                'assignedPastorName' => $s->assignedPastor?->name,
                'assignedVolunteerName' => $s->assignedVolunteer?->display_name,
                'createdAt' => $s->created_at?->toIso8601String(),
                'completedAt' => $s->completed_at?->toIso8601String(),
            ],
            'messages' => $messages,
            'canChat' => $s->allowsChat(),
            'messageStoreUrl' => route('mobile.solicitations.messages.store', $s),
            'hubUrl' => route('mobile.solicitations.hub'),
            'mineUrl' => route('mobile.solicitations.mine'),
        ];
    }

    public function sendMessage(Request $request, ChurchSolicitation $solicitation): RedirectResponse
    {
        $this->authorize('sendMessageAsMember', $solicitation);

        $valid = $request->validate([
            'content' => ['required', 'string', 'max:5000'],
        ]);

        ChurchSolicitationMessage::create([
            'church_solicitation_id' => $solicitation->id,
            'sender_type' => 'member',
            'sender_user_id' => $request->user()->id,
            'content' => $valid['content'],
        ]);

        $solicitation->touch();

        app(SolicitationChatNotifier::class)->notifyStaffOfMemberMessage($solicitation, $request->user());

        return redirect()->route('mobile.solicitations.show', $solicitation);
    }
}
