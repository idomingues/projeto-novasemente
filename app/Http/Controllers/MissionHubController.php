<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\MissionAboutSection;
use App\Models\MissionEvent;
use App\Actions\Mission\SubmitMissionMessage;
use App\Models\MissionMessage;
use App\Models\MissionWallItem;
use App\Services\DriveFolderCoverService;
use App\Services\DriveFolderImagesService;
use App\Support\MissionAboutBootstrap;
use App\Support\MissionEventMobilePresenter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MissionHubController extends Controller
{
    private function churchId(Request $request): ?int
    {
        return Church::resolveWorkingId($request);
    }

    public function index(Request $request): Response
    {
        return Inertia::render('Mobile/MissionHub', [
            'cards' => [
                [
                    'label' => 'Missão Tailândia & Mianmar',
                    'subtitle' => 'Missão transcultural Nova Semente',
                    'route' => 'mobile.mission.home',
                ],
                [
                    'label' => 'Agenda',
                    'subtitle' => 'Agenda e encontros da missão',
                    'route' => 'mobile.mission.events',
                ],
                [
                    'label' => 'Depoimentos',
                    'subtitle' => 'Histórias e mensagens da comunidade missionária',
                    'route' => 'mobile.mission.messages',
                ],
                [
                    'label' => 'Quem somos',
                    'subtitle' => 'Nossa história, propósito e visão',
                    'route' => 'mobile.mission.about',
                ],
                [
                    'label' => 'Mural',
                    'subtitle' => 'Fotos e momentos da missão',
                    'route' => 'mobile.mission.wall',
                ],
                [
                    'label' => 'Cadastro',
                    'subtitle' => 'Faça parte da equipe missionária',
                    'route' => 'mobile.mission.form',
                ],
            ],
        ]);
    }

    public function home(Request $request): Response
    {
        return Inertia::render('Mobile/MissionHome', [
            'signupUrl' => route('mobile.mission.trip-registration.create'),
        ]);
    }

    public function events(Request $request): Response
    {
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404);

        $events = MissionEvent::query()
            ->where('church_id', $churchId)
            ->missionCalendar2026()
            ->orderBy('starts_at')
            ->get();

        $allChurchEvents = MissionEvent::query()
            ->where('church_id', $churchId)
            ->get();

        $payload = $events
            ->map(fn (MissionEvent $e) => MissionEventMobilePresenter::listRow($e, $allChurchEvents))
            ->values()
            ->all();

        return Inertia::render('Mobile/MissionEvents', [
            'events' => $payload,
        ]);
    }

    public function messages(Request $request): Response
    {
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404);

        $user = $request->user();

        $messages = MissionMessage::query()
            ->with('user:id,name,photo_url')
            ->where('church_id', $churchId)
            ->visible()
            ->orderByDesc('is_team_highlight')
            ->orderByDesc('created_at')
            ->limit(100)
            ->get()
            ->map(fn (MissionMessage $m) => [
                'id' => $m->id,
                'body' => $m->body,
                'authorName' => $m->user?->name ?? 'Membro',
                'authorPhotoUrl' => $m->user?->photo_url,
                'isTeamHighlight' => $m->is_team_highlight,
                'createdAt' => $m->created_at?->toIso8601String(),
            ]);

        $myPending = $user
            ? MissionMessage::query()
                ->where('church_id', $churchId)
                ->where('user_id', $user->id)
                ->where('moderation_status', MissionMessage::STATUS_PENDING_REVIEW)
                ->orderByDesc('created_at')
                ->limit(20)
                ->get()
                ->map(fn (MissionMessage $m) => [
                    'id' => $m->id,
                    'body' => $m->body,
                    'createdAt' => $m->created_at?->toIso8601String(),
                ])
            : [];

        return Inertia::render('Mobile/MissionMessages', [
            'messages' => $messages,
            'myPendingMessages' => $myPending,
            'canPost' => (bool) $user,
            'storeUrl' => route('mobile.mission.messages.store'),
        ]);
    }

    public function storeMessage(Request $request, SubmitMissionMessage $submit): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user, 401, 'Faça login para enviar um depoimento.');

        $churchId = $this->churchId($request);
        abort_unless($churchId, 404);

        $valid = $request->validate([
            'body' => ['required', 'string', 'min:2', 'max:2000'],
        ]);

        $result = $submit((int) $churchId, $user, $valid['body']);

        $redirect = redirect()->route('mobile.mission.messages');

        return $result['level'] === 'info'
            ? $redirect->with('info', $result['flash'])
            : $redirect->with('success', $result['flash']);
    }

    public function about(Request $request): Response
    {
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404);

        $sections = MissionAboutBootstrap::sectionsForChurch((int) $churchId);

        $blocks = collect(MissionAboutSection::DEFAULT_TITLES)
            ->keys()
            ->map(fn (string $key) => [
                'key' => $key,
                'title' => $sections[$key]->title,
                'body' => $sections[$key]->body,
            ])
            ->values()
            ->all();

        return Inertia::render('Mobile/MissionAbout', [
            'blocks' => $blocks,
        ]);
    }

    public function wall(Request $request, DriveFolderCoverService $cover): Response
    {
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404);

        $albums = MissionWallItem::query()
            ->where('church_id', $churchId)
            ->published()
            ->orderBy('sort_order')
            ->orderByDesc('published_at')
            ->orderByDesc('created_at')
            ->get()
            ->map(function (MissionWallItem $item) use ($cover) {
                $autoCoverUrl = null;
                if (! $item->cover_image_url && $item->drive_folder_id) {
                    $autoCoverUrl = $cover->coverUrlForPublicFolder($item->drive_folder_id);
                }

                return [
                    'id' => $item->id,
                    'title' => $item->title,
                    'photographer_name' => $item->photographer_name,
                    'published_at' => $item->published_at?->toIso8601String(),
                    'cover_image_url' => $item->cover_image_url,
                    'auto_cover_url' => $autoCoverUrl,
                    'drive_view_url' => $item->drive_folder_view_url,
                ];
            })
            ->values()
            ->all();

        return Inertia::render('Mobile/MissionWall', [
            'albums' => $albums,
        ]);
    }

    public function wallShow(Request $request, MissionWallItem $missionWallItem, DriveFolderImagesService $driveImages): Response
    {
        $churchId = $this->churchId($request);
        abort_unless($churchId && (int) $missionWallItem->church_id === (int) $churchId, 404);
        abort_unless(
            $missionWallItem->published_at !== null
            && $missionWallItem->published_at->lte(now()),
            404,
        );

        $embedUrl = $missionWallItem->drive_folder_embed_url;
        $folderUrl = $missionWallItem->drive_folder_view_url;
        abort_unless($embedUrl && $folderUrl, 404);

        $images = [];
        if ($missionWallItem->drive_folder_id) {
            $images = $driveImages->listPublicFolderImages($missionWallItem->drive_folder_id);
        }

        return Inertia::render('Mobile/Photos', [
            'title' => $missionWallItem->title,
            'publishedAt' => $missionWallItem->published_at?->toIso8601String(),
            'photographerName' => $missionWallItem->photographer_name,
            'embedUrl' => $embedUrl,
            'folderUrl' => $folderUrl,
            'images' => $images,
            'backLink' => 'mission',
        ]);
    }
}
