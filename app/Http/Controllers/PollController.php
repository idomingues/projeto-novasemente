<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePollRequest;
use App\Http\Requests\UpdatePollRequest;
use App\Http\Support\ListModalRedirect;
use App\Models\Church;
use App\Models\Poll;
use App\Models\PollOption;
use App\Support\PollPresenter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class PollController extends Controller
{
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
                'options.votes' => fn ($q) => $q->orderBy('created_at')->with('user:id,name,photo_url'),
            ])
            ->latest()
            ->get()
            ->map(fn (Poll $poll) => PollPresenter::forAdminDetail($poll))
            ->values()
            ->all();

        return Inertia::render('Polls/Index', [
            'polls' => $polls,
            'statuses' => Poll::STATUSES,
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
                'status' => $data['status'],
                'display_bg_color' => $data['display_bg_color'] ?? '#0f172a',
                'display_font' => $data['display_font'] ?? 'sans',
                'display_chart' => $data['display_chart'] ?? 'bar',
                'display_logo' => $data['display_logo'] ?? 'horizontal-color',
                'display_enabled' => array_key_exists('display_enabled', $data)
                    ? (bool) $data['display_enabled']
                    : true,
            ]);

            $this->syncOptions($poll, $data['options']);

            return $poll;
        });

        return ListModalRedirect::toIndexEdit('polls.index', $poll, 'Enquete criada com sucesso!');
    }

    public function update(UpdatePollRequest $request, Poll $poll)
    {
        $this->assertSameChurch($poll);

        $data = $request->validated();

        DB::transaction(function () use ($poll, $data) {
            $poll->ensurePublicToken();

            $poll->update([
                'question' => $data['question'],
                'allow_multiple' => false,
                'status' => $data['status'],
                'display_bg_color' => $data['display_bg_color'] ?? $poll->display_bg_color ?? '#0f172a',
                'display_font' => $data['display_font'] ?? $poll->display_font ?? 'sans',
                'display_chart' => $data['display_chart'] ?? $poll->display_chart ?? 'bar',
                'display_logo' => $data['display_logo'] ?? $poll->display_logo ?? 'horizontal-color',
                'display_enabled' => array_key_exists('display_enabled', $data)
                    ? (bool) $data['display_enabled']
                    : (bool) $poll->display_enabled,
            ]);

            $this->syncOptions($poll, $data['options']);
        });

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
                    ]);
                    $keptIds[] = $option->id;

                    continue;
                }
            }

            $created = $poll->options()->create([
                'label' => $label,
                'sort_order' => $index,
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
