<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePollRequest;
use App\Http\Requests\UpdatePollRequest;
use App\Http\Support\ListModalRedirect;
use App\Models\Church;
use App\Models\Poll;
use App\Models\PollOption;
use App\Services\PublicationBroadcastNotifier;
use App\Support\PollPresenter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class PollController extends Controller
{
    public function __construct(
        private readonly PublicationBroadcastNotifier $publicationBroadcast,
    ) {}

    private function currentChurchId(): ?int
    {
        return Church::resolveWorkingId(request());
    }

    public function index(Request $request): Response
    {
        $churchId = $this->currentChurchId();

        $polls = Poll::query()
            ->forChurch($churchId)
            ->withCount(['options', 'votes'])
            ->with([
                'options' => fn ($q) => $q->orderBy('sort_order')->orderBy('id'),
                'options.votes',
            ])
            // Enquete de sugestão (texto livre) sempre por último.
            ->orderByRaw("CASE WHEN response_type = ? THEN 1 ELSE 0 END", [Poll::RESPONSE_TEXT])
            ->latest()
            ->get()
            ->map(fn (Poll $poll) => PollPresenter::forAdminDetail($poll))
            ->values()
            ->all();

        return Inertia::render('Polls/Index', [
            'polls' => $polls,
            'statuses' => Poll::STATUSES,
            'responseTypes' => Poll::RESPONSE_TYPES,
            'displayFonts' => Poll::DISPLAY_FONTS,
            'displayCharts' => Poll::DISPLAY_CHARTS,
            'displayLogos' => collect(Poll::DISPLAY_LOGOS)->map(fn (string $label, string $key) => [
                'key' => $key,
                'label' => $label,
                'url' => Poll::displayLogoPath($key),
            ])->values()->all(),
            'canManage' => $request->user()?->can('polls.manage') ?? false,
        ]);
    }

    public function store(StorePollRequest $request)
    {
        $churchId = $this->currentChurchId();
        if ($churchId === null) {
            return redirect()->route('polls.index')->with('error', 'Nenhuma igreja ativa. Selecione uma igreja para trabalhar.');
        }

        $data = $request->validated();

        $poll = DB::transaction(function () use ($data, $churchId, $request) {
            $poll = Poll::create([
                'church_id' => $churchId,
                'created_by' => $request->user()?->id,
                'question' => $data['question'],
                'allow_multiple' => false,
                'response_type' => $data['response_type'] ?? Poll::RESPONSE_CHOICE,
                'status' => $data['status'],
                'display_bg_color' => $data['display_bg_color'] ?? '#0f172a',
                'display_font' => $data['display_font'] ?? 'sans',
                'display_chart' => $data['display_chart'] ?? 'bar',
                'display_logo' => $data['display_logo'] ?? 'horizontal-color',
                'display_enabled' => ($data['response_type'] ?? Poll::RESPONSE_CHOICE) === Poll::RESPONSE_TEXT
                    ? false
                    : (array_key_exists('display_enabled', $data)
                        ? (bool) $data['display_enabled']
                        : true),
                'publish_to_feed' => array_key_exists('publish_to_feed', $data)
                    ? (bool) $data['publish_to_feed']
                    : true,
            ]);

            if (($data['response_type'] ?? Poll::RESPONSE_CHOICE) !== Poll::RESPONSE_TEXT) {
                $this->syncOptions($poll, $data['options'] ?? []);
            }

            return $poll;
        });

        if ($poll->publish_to_feed) {
            $this->publicationBroadcast->notifyPoll($poll, $request->user()?->id);
        }

        return ListModalRedirect::toIndexEdit('polls.index', $poll, 'Enquete criada com sucesso!');
    }

    public function update(UpdatePollRequest $request, Poll $poll)
    {
        $this->assertSameChurch($poll);

        $data = $request->validated();
        $wasOpen = $poll->status === Poll::STATUS_OPEN;
        $wasInFeed = (bool) $poll->publish_to_feed;

        DB::transaction(function () use ($poll, $data) {
            $poll->ensurePublicToken();

            $poll->update([
                'question' => $data['question'],
                'allow_multiple' => false,
                'response_type' => $data['response_type'] ?? Poll::RESPONSE_CHOICE,
                'status' => $data['status'],
                'display_bg_color' => $data['display_bg_color'] ?? $poll->display_bg_color ?? '#0f172a',
                'display_font' => $data['display_font'] ?? $poll->display_font ?? 'sans',
                'display_chart' => $data['display_chart'] ?? $poll->display_chart ?? 'bar',
                'display_logo' => $data['display_logo'] ?? $poll->display_logo ?? 'horizontal-color',
                'display_enabled' => ($data['response_type'] ?? Poll::RESPONSE_CHOICE) === Poll::RESPONSE_TEXT
                    ? false
                    : (array_key_exists('display_enabled', $data)
                        ? (bool) $data['display_enabled']
                        : (bool) $poll->display_enabled),
                'publish_to_feed' => array_key_exists('publish_to_feed', $data)
                    ? (bool) $data['publish_to_feed']
                    : (bool) $poll->publish_to_feed,
            ]);

            if (($data['response_type'] ?? Poll::RESPONSE_CHOICE) === Poll::RESPONSE_TEXT) {
                $poll->options()->delete();
            } else {
                $this->syncOptions($poll, $data['options'] ?? []);
            }
        });

        $poll->refresh();
        if ((! $wasOpen || ! $wasInFeed) && $poll->status === Poll::STATUS_OPEN && $poll->publish_to_feed) {
            $this->publicationBroadcast->notifyPoll($poll, $request->user()?->id);
        }

        return ListModalRedirect::toIndexEdit('polls.index', $poll, 'Enquete atualizada com sucesso!');
    }

    public function destroy(Poll $poll)
    {
        $this->assertSameChurch($poll);
        $poll->delete();

        return redirect()->route('polls.index')->with('success', 'Enquete excluída com sucesso!');
    }

    /**
     * @param  list<array{id?: int|null, label: string}>  $options
     */
    private function syncOptions(Poll $poll, array $options): void
    {
        $keptIds = [];

        foreach (array_values($options) as $index => $optionData) {
            $label = $optionData['label'];
            $existingId = isset($optionData['id']) ? (int) $optionData['id'] : null;

            if ($existingId) {
                $option = PollOption::query()
                    ->where('poll_id', $poll->id)
                    ->where('id', $existingId)
                    ->first();

                if ($option) {
                    $option->update([
                        'label' => $label,
                        'sort_order' => $index,
                        'is_write_in' => Poll::isWriteInLabel($label),
                    ]);
                    $keptIds[] = $option->id;

                    continue;
                }
            }

            $created = $poll->options()->create([
                'label' => $label,
                'sort_order' => $index,
                'is_write_in' => Poll::isWriteInLabel($label),
            ]);
            $keptIds[] = $created->id;
        }

        $query = $poll->options();
        if (count($keptIds) > 0) {
            $query->whereNotIn('id', $keptIds);
        }
        $query->delete();
    }

    private function assertSameChurch(Poll $poll): void
    {
        $churchId = $this->currentChurchId();
        if ($churchId === null || (int) $poll->church_id !== (int) $churchId) {
            abort(404);
        }
    }
}
