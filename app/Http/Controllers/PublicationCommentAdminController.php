<?php

namespace App\Http\Controllers;

use App\Models\PublicationComment;
use App\Support\PublicationSubject;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PublicationCommentAdminController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('news.manage');

        $churchId = \App\Models\Church::resolveWorkingId($request);
        $search = trim((string) $request->query('q', ''));
        $type = trim((string) $request->query('type', ''));

        $query = PublicationComment::query()
            ->with(['user:id,name'])
            ->orderByDesc('created_at');

        if ($churchId !== null) {
            $query->where(function ($q) use ($churchId) {
                $q->where('church_id', $churchId)->orWhereNull('church_id');
            });
        }

        if ($type !== '' && array_key_exists($type, \App\Support\PublicationFeed::TYPE_DEFINITIONS)) {
            $query->where('subject_type', $type);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('body', 'like', '%'.$search.'%')
                    ->orWhereHas('user', fn ($uq) => $uq->where('name', 'like', '%'.$search.'%'));
            });
        }

        $paginator = $query->paginate(30)->withQueryString();

        $rows = collect($paginator->items())->map(function (PublicationComment $c) {
            return [
                'id' => $c->id,
                'body' => $c->body,
                'author_name' => $c->user?->name ?? 'Usuário',
                'subject_type' => $c->subject_type,
                'subject_type_label' => PublicationSubject::typeLabel($c->subject_type),
                'subject_id' => $c->subject_id,
                'feed_id' => PublicationSubject::feedId($c->subject_type, (int) $c->subject_id),
                'publication_title' => PublicationSubject::title($c->subject_type, (int) $c->subject_id) ?? '—',
                'created_at' => $c->created_at?->timezone('America/Sao_Paulo')->format('d/m/Y H:i'),
            ];
        })->values()->all();

        return Inertia::render('PublicationComments/Index', [
            'comments' => [
                'data' => $rows,
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'total' => $paginator->total(),
            ],
            'filters' => [
                'q' => $search !== '' ? $search : null,
                'type' => $type !== '' ? $type : null,
            ],
            'typeOptions' => collect(\App\Support\PublicationFeed::TYPE_DEFINITIONS)
                ->map(fn (array $def, string $key) => ['value' => $key, 'label' => $def['label']])
                ->values()
                ->all(),
        ]);
    }

    public function destroy(Request $request, PublicationComment $publicationComment): RedirectResponse
    {
        $this->authorize('news.manage');

        $publicationComment->deleted_by = $request->user()?->id;
        $publicationComment->save();
        $publicationComment->delete();

        return redirect()
            ->route('publication-comments.index', $request->only(['q', 'type', 'page']))
            ->with('success', 'Comentário removido.');
    }
}
