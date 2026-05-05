<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;
use Carbon\Carbon;

class MobileAnoBiblicoController extends Controller
{
    private function hasChallengesTables(): bool
    {
        return Schema::hasTable('ano_biblico_desafios')
            && Schema::hasTable('ano_biblico_desafio_usuario')
            && Schema::hasTable('ano_biblico_desafio_itens');
    }

    private function activeChallengeForUser(int $userId): ?object
    {
        if (! $this->hasChallengesTables()) return null;
        return DB::table('ano_biblico_desafio_usuario as du')
            ->join('ano_biblico_desafios as d', 'd.id', '=', 'du.desafio_id')
            ->where('du.usuario_id', $userId)
            ->where('du.status', 'active')
            ->orderByDesc('du.id')
            ->first([
                'du.id',
                'du.desafio_id',
                'du.data_inicio',
                'du.data_fim',
                'du.status',
                'd.nome',
                'd.descricao',
                'd.tipo',
                'd.escopo',
            ]);
    }

    private function hasUserPlanTables(): bool
    {
        return Schema::hasTable('ano_biblico_usuario') && Schema::hasTable('ano_biblico_usuario_itens');
    }

    private function ensureUserPlan(int $userId): void
    {
        if (! $this->hasUserPlanTables()) return;
        if (! Schema::hasTable('plano_leitura')) return;

        $hasUserRow = DB::table('ano_biblico_usuario')->where('usuario_id', $userId)->exists();
        $itemsCount = (int) DB::table('ano_biblico_usuario_itens')->where('usuario_id', $userId)->count();
        if ($hasUserRow && $itemsCount > 0) return;

        DB::transaction(function () use ($userId) {
            $today = now()->toDateString();
            $end = now()->addDays(364)->toDateString();

            DB::table('ano_biblico_usuario')->updateOrInsert(
                ['usuario_id' => $userId],
                ['data_inicio' => $today, 'data_fim' => $end, 'status' => 'active', 'updated_at' => now(), 'created_at' => now()]
            );

            // cria itens por dia (1..365) seguindo a ordem do plano_leitura
            $plan = DB::table('plano_leitura as p')
                ->join('bible_books as b', 'b.id', '=', 'p.livro_id')
                ->orderBy('p.dia')
                ->orderBy('b.position')
                ->orderBy('p.capitulo')
                ->get(['p.dia', 'p.livro_id', 'p.capitulo']);

            // mapa de conclusões existentes (se já houver histórico antigo)
            $doneMap = [];
            if (Schema::hasTable('leitura_usuario_capitulo')) {
                DB::table('leitura_usuario_capitulo')
                    ->where('usuario_id', $userId)
                    ->where('concluido', 1)
                    ->get(['livro_id', 'capitulo', 'data_conclusao'])
                    ->each(function ($r) use (&$doneMap) {
                        $doneMap[((int) $r->livro_id).':'.((int) $r->capitulo)] = $r->data_conclusao ? (string) $r->data_conclusao : (string) now();
                    });
            }

            $rows = [];
            $start = Carbon::parse($today)->startOfDay();
            foreach ($plan as $r) {
                $dia = (int) $r->dia;
                $date = $start->copy()->addDays($dia - 1)->toDateString();
                $key = ((int) $r->livro_id).':'.((int) $r->capitulo);
                $completedAt = $doneMap[$key] ?? null;
                $rows[] = [
                    'usuario_id' => $userId,
                    'dia' => $dia,
                    'data_leitura' => $date,
                    'livro_id' => (int) $r->livro_id,
                    'capitulo' => (int) $r->capitulo,
                    'concluido' => $completedAt ? 1 : 0,
                    'data_conclusao' => $completedAt,
                ];
            }

            // insere em chunks (upsert para ser idempotente)
            foreach (array_chunk($rows, 500) as $chunk) {
                DB::table('ano_biblico_usuario_itens')->upsert(
                    $chunk,
                    ['usuario_id', 'livro_id', 'capitulo'],
                    ['dia', 'data_leitura', 'concluido', 'data_conclusao']
                );
            }
        });
    }

    private function startDateForUser(int $userId): ?string
    {
        if (! Schema::hasTable('ano_biblico_usuario')) return null;
        $v = DB::table('ano_biblico_usuario')->where('usuario_id', $userId)->value('data_inicio');
        return $v ? (string) $v : null;
    }

    private function endDateForUser(int $userId): ?string
    {
        if (! Schema::hasTable('ano_biblico_usuario')) return null;
        $v = DB::table('ano_biblico_usuario')->where('usuario_id', $userId)->value('data_fim');
        return $v ? (string) $v : null;
    }

    private function statusForUser(int $userId): array
    {
        // base: por data do próximo item pendente (comparado ao hoje)
        if (! $this->hasUserPlanTables()) {
            return ['kind' => 'unknown', 'days' => 0, 'label' => ''];
        }

        $today = now()->toDateString();
        $nextPendingDate = DB::table('ano_biblico_usuario_itens')
            ->where('usuario_id', $userId)
            ->where('concluido', 0)
            ->min('data_leitura');

        if (! $nextPendingDate) {
            return ['kind' => 'done', 'days' => 0, 'label' => 'Concluído'];
        }

        $diff = Carbon::parse($nextPendingDate)->startOfDay()->diffInDays(Carbon::parse($today)->startOfDay(), false);
        if ($diff === 0) return ['kind' => 'on_time', 'days' => 0, 'label' => 'Em dia'];
        if ($diff > 0) return ['kind' => 'late', 'days' => $diff, 'label' => "Atrasado em {$diff} dia(s)"];
        return ['kind' => 'ahead', 'days' => abs($diff), 'label' => 'Adiantado'];
    }

    public function index(Request $request): Response
    {
        $userId = $request->user()?->id;
        if (! $userId) {
            // Mantém o padrão do app: visitante ainda pode navegar no "Mais",
            // mas o progresso é por usuário.
            return Inertia::render('Mobile/AnoBiblico', [
                'needsLogin' => true,
            ]);
        }

        $installed = Schema::hasTable('plano_leitura') && Schema::hasTable('leitura_usuario');
        if (! $installed) {
            return Inertia::render('Mobile/AnoBiblico', [
                'installed' => false,
                'needsLogin' => false,
                'setup' => [
                    'sqlPath' => 'database/sql/ano_biblico.sql',
                    'installCmd' => 'php scripts/instalar_ano_biblico.php',
                    'generateCmd' => 'php scripts/gerar_plano_ano_biblico.php',
                ],
            ]);
        }

        // Preferir desafios (múltiplos planos) quando disponível.
        $activeChallenge = $this->activeChallengeForUser((int) $userId);

        if ($activeChallenge) {
            $status = $this->statusForActiveChallenge((int) $activeChallenge->id);
            $today = now()->toDateString();

            $next = DB::table('ano_biblico_desafio_itens')
                ->where('usuario_desafio_id', (int) $activeChallenge->id)
                ->where('concluido', 0)
                ->orderBy('data_leitura')
                ->orderBy('dia')
                ->first(['dia', 'data_leitura']);

            $currentDia = $next ? (int) $next->dia : null;
            $readDate = $next ? (string) $next->data_leitura : null;
            $isToday = $readDate === $today;

            $chapters = [];
            $display = '';
            if ($currentDia) {
                $chapters = DB::table('ano_biblico_desafio_itens as i')
                    ->join('bible_books as b', 'b.id', '=', 'i.livro_id')
                    ->where('i.usuario_desafio_id', (int) $activeChallenge->id)
                    ->where('i.dia', $currentDia)
                    ->orderBy('b.position')
                    ->orderBy('i.capitulo')
                    ->get(['b.key as book_key', 'b.name as book_name', 'b.id as book_id', 'i.capitulo as chapter'])
                    ->map(fn ($r) => [
                        'bookKey' => (string) $r->book_key,
                        'bookName' => (string) $r->book_name,
                        'bookId' => (int) $r->book_id,
                        'chapter' => (int) $r->chapter,
                    ])
                    ->values()
                    ->all();
                $display = $this->formatDisplay($chapters);
            }

            $finished = $currentDia === null;

            $totalItems = (int) DB::table('ano_biblico_desafio_itens')
                ->where('usuario_desafio_id', (int) $activeChallenge->id)
                ->count();
            $doneItems = (int) DB::table('ano_biblico_desafio_itens')
                ->where('usuario_desafio_id', (int) $activeChallenge->id)
                ->where('concluido', 1)
                ->count();
            $remainingItems = max(0, $totalItems - $doneItems);
            $percent = $totalItems > 0 ? (int) floor(($doneItems / $totalItems) * 100) : 0;

            $lastCompletedAt = DB::table('ano_biblico_desafio_itens')
                ->where('usuario_desafio_id', (int) $activeChallenge->id)
                ->where('concluido', 1)
                ->max('data_conclusao');

            return Inertia::render('Mobile/AnoBiblico', [
                'installed' => true,
                'needsLogin' => false,
                'finished' => $finished,
                'day' => $finished ? null : $currentDia,
                'display' => $display,
                'chapters' => $chapters,
                'startDate' => (string) $activeChallenge->data_inicio,
                'endDate' => (string) $activeChallenge->data_fim,
                'status' => $status,
                'readDate' => $readDate,
                'isToday' => $isToday,
                'remainingChapters' => $remainingItems,
                'challenge' => [
                    'enabled' => true,
                    'active' => [
                        'id' => (int) $activeChallenge->id,
                        'challengeId' => (int) $activeChallenge->desafio_id,
                        'name' => (string) $activeChallenge->nome,
                        'description' => (string) $activeChallenge->descricao,
                        'type' => (string) $activeChallenge->tipo,
                        'scope' => (string) $activeChallenge->escopo,
                    ],
                    'mustChoose' => false,
                    'available' => [],
                ],
                'progress' => [
                    'done' => $doneItems,
                    'remaining' => $remainingItems,
                    'percent' => $percent,
                    'lastCompletedAt' => $lastCompletedAt ? (string) $lastCompletedAt : null,
                ],
            ]);
        }

        $this->ensureUserPlan((int) $userId);

        $status = $this->statusForUser((int) $userId);
        $startDate = $this->startDateForUser((int) $userId);
        $endDate = $this->endDateForUser((int) $userId);

        $today = now()->toDateString();
        $next = null;
        if ($this->hasUserPlanTables()) {
            $next = DB::table('ano_biblico_usuario_itens')
                ->where('usuario_id', $userId)
                ->where('concluido', 0)
                ->orderBy('data_leitura')
                ->orderBy('dia')
                ->first(['dia', 'data_leitura']);
        }

        $currentDia = $next ? (int) $next->dia : null;
        $readDate = $next ? (string) $next->data_leitura : null;
        $isToday = $readDate === $today;

        $chapters = [];
        $display = '';
        if ($currentDia && $this->hasUserPlanTables()) {
            $chapters = DB::table('ano_biblico_usuario_itens as i')
                ->join('bible_books as b', 'b.id', '=', 'i.livro_id')
                ->where('i.usuario_id', $userId)
                ->where('i.dia', $currentDia)
                ->orderBy('b.position')
                ->orderBy('i.capitulo')
                ->get(['b.key as book_key', 'b.name as book_name', 'i.capitulo as chapter', 'b.id as book_id'])
                ->map(fn ($r) => [
                    'bookKey' => (string) $r->book_key,
                    'bookName' => (string) $r->book_name,
                    'bookId' => (int) $r->book_id,
                    'chapter' => (int) $r->chapter,
                ])
                ->values()
                ->all();
            $display = $this->formatDisplay($chapters);
        }

        $finished = $currentDia === null;

        $done = (int) (DB::table('leitura_usuario')
            ->where('usuario_id', $userId)
            ->where('concluido', 1)
            ->distinct()
            ->count('dia'));

        $lastCompletedAt = DB::table('leitura_usuario')
            ->where('usuario_id', $userId)
            ->where('concluido', 1)
            ->max('data_conclusao');

        $remainingChapters = $this->hasUserPlanTables()
            ? (int) DB::table('ano_biblico_usuario_itens')->where('usuario_id', $userId)->where('concluido', 0)->count()
            : 0;

        $total = 365;
        $remaining = max(0, $total - $done);
        $percent = (int) floor(($done / $total) * 100);

        return Inertia::render('Mobile/AnoBiblico', [
            'installed' => true,
            'needsLogin' => false,
            'finished' => $finished,
            'day' => $finished ? null : $currentDia,
            'display' => $display,
            'chapters' => $chapters,
            'startDate' => $startDate,
            'endDate' => $endDate,
            'status' => $status,
            'readDate' => $readDate,
            'isToday' => $isToday,
            'remainingChapters' => $remainingChapters,
            'challenge' => [
                'enabled' => $this->hasChallengesTables(),
                'active' => null,
                'mustChoose' => $this->hasChallengesTables()
                    ? !DB::table('ano_biblico_desafio_usuario')->where('usuario_id', $userId)->exists()
                    : false,
                'available' => $this->hasChallengesTables()
                    ? DB::table('ano_biblico_desafios')->where('ativo', 1)->orderBy('id')->get(['id', 'chave', 'nome', 'descricao', 'tipo', 'duracao_dias', 'escopo'])
                        ->map(fn ($r) => [
                            'id' => (int) $r->id,
                            'key' => (string) $r->chave,
                            'name' => (string) $r->nome,
                            'description' => (string) $r->descricao,
                            'type' => (string) $r->tipo,
                            'durationDays' => $r->duracao_dias !== null ? (int) $r->duracao_dias : null,
                            'scope' => (string) $r->escopo,
                        ])->values()->all()
                    : [],
            ],
            'progress' => [
                'done' => $done,
                'remaining' => $remaining,
                'percent' => $percent,
                'lastCompletedAt' => $lastCompletedAt ? (string) $lastCompletedAt : null,
            ],
        ]);
    }

    private function statusForActiveChallenge(int $userChallengeId): array
    {
        $today = now()->toDateString();
        $nextPendingDate = DB::table('ano_biblico_desafio_itens')
            ->where('usuario_desafio_id', $userChallengeId)
            ->where('concluido', 0)
            ->min('data_leitura');

        if (! $nextPendingDate) return ['kind' => 'done', 'days' => 0, 'label' => 'Concluído'];

        $diff = Carbon::parse($nextPendingDate)->startOfDay()->diffInDays(Carbon::parse($today)->startOfDay(), false);
        if ($diff === 0) return ['kind' => 'on_time', 'days' => 0, 'label' => 'Em dia'];
        if ($diff > 0) return ['kind' => 'late', 'days' => $diff, 'label' => "Atrasado em {$diff} dia(s)"];
        return ['kind' => 'ahead', 'days' => abs($diff), 'label' => "Adiantado em ".abs($diff)." dia(s)"];
    }

    public function challenges(Request $request)
    {
        $userId = $request->user()?->id;
        abort_unless($userId, 403);
        abort_unless($this->hasChallengesTables(), 409);

        $items = DB::table('ano_biblico_desafios')
            ->where('ativo', 1)
            ->orderBy('id')
            ->get(['id', 'chave', 'nome', 'descricao', 'tipo', 'duracao_dias', 'escopo'])
            ->map(fn ($r) => [
                'id' => (int) $r->id,
                'key' => (string) $r->chave,
                'name' => (string) $r->nome,
                'description' => (string) $r->descricao,
                'type' => (string) $r->tipo,
                'durationDays' => $r->duracao_dias !== null ? (int) $r->duracao_dias : null,
                'scope' => (string) $r->escopo,
            ])
            ->values()
            ->all();

        return response()->json(['items' => $items]);
    }

    public function startChallenge(Request $request)
    {
        $userId = $request->user()?->id;
        abort_unless($userId, 403);
        abort_unless($this->hasChallengesTables(), 409);

        $challengeId = (int) $request->input('challengeId');
        $dataFim = $request->input('dataFim');
        $resetReadings = (bool) $request->input('resetReadings', false);

        $challenge = DB::table('ano_biblico_desafios')->where('id', $challengeId)->where('ativo', 1)->first();
        abort_unless($challenge, 404);

        $today = Carbon::now()->startOfDay();
        $tipo = (string) $challenge->tipo;
        $end = null;

        if ($tipo === 'fim_do_ano') {
            $end = Carbon::create($today->year, 12, 31)->startOfDay();
        } elseif ($tipo === 'um_ano') {
            $end = $today->copy()->addDays(365);
        } elseif ($tipo === 'data_personalizada') {
            abort_unless(is_string($dataFim) && $dataFim !== '', 422);
            $end = Carbon::parse($dataFim)->startOfDay();
            abort_unless($end->gt($today), 422);
        } elseif ($tipo === 'noventa_dias') {
            $end = $today->copy()->addDays(90);
        } elseif ($tipo === 'novo_testamento_30') {
            $end = $today->copy()->addDays(30);
        } else {
            abort(422);
        }

        DB::transaction(function () use ($userId, $challengeId, $resetReadings, $today, $end, $challenge) {
            // Sempre substitui: só pode haver um desafio em andamento por usuário.
            DB::table('ano_biblico_desafio_usuario')
                ->where('usuario_id', $userId)
                ->where('status', 'active')
                ->update(['status' => 'archived', 'arquivado_em' => now(), 'atualizado_em' => now()]);

            $userChallengeId = (int) DB::table('ano_biblico_desafio_usuario')->insertGetId([
                'usuario_id' => $userId,
                'desafio_id' => $challengeId,
                'data_inicio' => $today->toDateString(),
                'data_fim' => $end->toDateString(),
                'status' => 'active',
                'criado_em' => now(),
                'atualizado_em' => now(),
            ]);

            $scope = (string) $challenge->escopo;
            $books = DB::table('bible_books')
                ->when($scope === 'new', fn ($q) => $q->where('testament', 'new'))
                ->orderBy('position')
                ->get(['id', 'chapters_count']);

            $chapters = [];
            foreach ($books as $b) {
                for ($c = 1; $c <= (int) $b->chapters_count; $c++) {
                    $chapters[] = ['book_id' => (int) $b->id, 'chapter' => $c];
                }
            }

            // Se NÃO for "reiniciar leituras", aproveita capítulos já lidos (histórico).
            $doneMap = [];
            if (! $resetReadings && Schema::hasTable('leitura_usuario_capitulo')) {
                DB::table('leitura_usuario_capitulo')
                    ->where('usuario_id', $userId)
                    ->where('concluido', 1)
                    ->whereNotNull('data_conclusao')
                    ->get(['livro_id', 'capitulo', 'data_conclusao'])
                    ->each(function ($r) use (&$doneMap) {
                        $doneMap[((int) $r->livro_id).':'.((int) $r->capitulo)] = (string) $r->data_conclusao;
                    });
            }

            $days = max(1, $today->diffInDays($end) + 1);
            $perDay = (int) ceil(count($chapters) / $days);
            if ($perDay < 1) $perDay = 1;

            $rows = [];
            $idx = 0;
            for ($d = 1; $d <= $days && $idx < count($chapters); $d++) {
                $date = $today->copy()->addDays($d - 1)->toDateString();
                for ($k = 0; $k < $perDay && $idx < count($chapters); $k++, $idx++) {
                    $key = $chapters[$idx]['book_id'].':'.$chapters[$idx]['chapter'];
                    $completedAt = $doneMap[$key] ?? null;
                    $rows[] = [
                        'usuario_desafio_id' => $userChallengeId,
                        'usuario_id' => $userId,
                        'dia' => $d,
                        'data_leitura' => $date,
                        'livro_id' => $chapters[$idx]['book_id'],
                        'capitulo' => $chapters[$idx]['chapter'],
                        'concluido' => $completedAt ? 1 : 0,
                        'data_conclusao' => $completedAt,
                    ];
                }
            }

            foreach (array_chunk($rows, 500) as $chunk) {
                DB::table('ano_biblico_desafio_itens')->insert($chunk);
            }
        });

        return redirect()->route('mobile.ano-biblico')->with('success', 'Desafio iniciado!');
    }

    public function day(Request $request, int $day): Response
    {
        $userId = $request->user()?->id;
        abort_unless($userId, 403);

        abort_unless(Schema::hasTable('plano_leitura') && Schema::hasTable('leitura_usuario'), 409);
        abort_unless($day >= 1 && $day <= 365, 404);

        // Se houver desafio ativo, o "dia" e os checkboxes vêm do desafio.
        $activeChallenge = $this->activeChallengeForUser((int) $userId);
        if ($activeChallenge) {
            $items = DB::table('ano_biblico_desafio_itens as i')
                ->join('bible_books as b', 'b.id', '=', 'i.livro_id')
                ->where('i.usuario_desafio_id', (int) $activeChallenge->id)
                ->where('i.dia', $day)
                ->orderBy('b.position')
                ->orderBy('i.capitulo')
                ->get([
                    'b.key as book_key',
                    'b.name as book_name',
                    'b.id as book_id',
                    'i.capitulo as chapter',
                    'i.concluido as done',
                    'i.data_conclusao as completed_at',
                ])
                ->map(fn ($r) => [
                    'bookKey' => (string) $r->book_key,
                    'bookName' => (string) $r->book_name,
                    'bookId' => (int) $r->book_id,
                    'chapter' => (int) $r->chapter,
                    'done' => (int) $r->done === 1,
                    'completedAt' => $r->completed_at ? (string) $r->completed_at : null,
                ])
                ->values()
                ->all();

            $chapters = array_map(fn ($c) => [
                'bookKey' => (string) $c['bookKey'],
                'bookName' => (string) $c['bookName'],
                'bookId' => (int) $c['bookId'],
                'chapter' => (int) $c['chapter'],
            ], $items);

            $checkedDetails = collect($items)
                ->filter(fn ($c) => (bool) $c['done'])
                ->map(fn ($c) => [
                    'bookId' => (int) $c['bookId'],
                    'chapter' => (int) $c['chapter'],
                    'completedAt' => $c['completedAt'],
                ])
                ->values()
                ->all();

            $checked = collect($checkedDetails)
                ->map(fn ($r) => ((int) $r['bookId']).':'.((int) $r['chapter']))
                ->values()
                ->all();

            $checkedCount = count($checked);
            $total = count($chapters);
            $percent = $total > 0 ? (int) floor(($checkedCount / $total) * 100) : 0;

            $completedAt = DB::table('ano_biblico_desafio_itens')
                ->where('usuario_desafio_id', (int) $activeChallenge->id)
                ->where('dia', $day)
                ->where('concluido', 1)
                ->max('data_conclusao');

            $nextDay = (int) (DB::table('ano_biblico_desafio_itens')
                ->where('usuario_desafio_id', (int) $activeChallenge->id)
                ->where('dia', '>', $day)
                ->where('concluido', 0)
                ->min('dia') ?? 0);

            return Inertia::render('Mobile/AnoBiblicoDay', [
                'day' => $day,
                'display' => $this->formatDisplay($chapters),
                'chapters' => $chapters,
                'checked' => $checked,
                'checkedDetails' => $checkedDetails,
                'completedAt' => $completedAt ? (string) $completedAt : null,
                'nextDay' => $nextDay > 0 ? $nextDay : null,
                'progress' => [
                    'done' => $checkedCount,
                    'total' => $total,
                    'percent' => $percent,
                ],
            ]);
        }

        $this->ensureUserPlan((int) $userId);
        abort_unless($this->hasUserPlanTables(), 409);

        $chapters = DB::table('ano_biblico_usuario_itens as i')
            ->join('bible_books as b', 'b.id', '=', 'i.livro_id')
            ->where('i.usuario_id', $userId)
            ->where('i.dia', $day)
            ->orderBy('b.position')
            ->orderBy('i.capitulo')
            ->get([
                'b.key as book_key',
                'b.name as book_name',
                'b.id as book_id',
                'i.capitulo as chapter',
            ])
            ->map(fn ($r) => [
                'bookKey' => (string) $r->book_key,
                'bookName' => (string) $r->book_name,
                'bookId' => (int) $r->book_id,
                'chapter' => (int) $r->chapter,
            ])
            ->values()
            ->all();

        $checked = [];
        $checkedDetails = [];
        if (Schema::hasTable('leitura_usuario_capitulo')) {
            $checkedDetails = DB::table('leitura_usuario_capitulo')
                ->where('usuario_id', $userId)
                ->where('dia', $day)
                ->where('concluido', 1)
                ->get(['livro_id', 'capitulo', 'data_conclusao'])
                ->map(fn ($r) => [
                    'bookId' => (int) $r->livro_id,
                    'chapter' => (int) $r->capitulo,
                    'completedAt' => $r->data_conclusao ? (string) $r->data_conclusao : null,
                ])
                ->values()
                ->all();

            $checked = collect($checkedDetails)
                ->map(fn ($r) => ((int) $r['bookId']).':'.((int) $r['chapter']))
                ->values()
                ->all();
        }

        $checkedCount = 0;
        if ($chapters) {
            $set = array_fill_keys($checked, true);
            foreach ($chapters as $c) {
                $key = ((int) $c['bookId']).':'.((int) $c['chapter']);
                if (isset($set[$key])) $checkedCount++;
            }
        }
        $total = count($chapters);
        $percent = $total > 0 ? (int) floor(($checkedCount / $total) * 100) : 0;

        $completedAt = DB::table('leitura_usuario')
            ->where('usuario_id', $userId)
            ->where('dia', $day)
            ->where('concluido', 1)
            ->value('data_conclusao');

        $nextDay = (int) (DB::table('plano_leitura as p')
            ->leftJoin('leitura_usuario as lu', function ($join) use ($userId) {
                $join->on('lu.dia', '=', 'p.dia')
                    ->where('lu.usuario_id', '=', $userId)
                    ->where('lu.concluido', '=', 1);
            })
            ->where('p.dia', '>', $day)
            ->whereNull('lu.id')
            ->min('p.dia') ?? 0);

        return Inertia::render('Mobile/AnoBiblicoDay', [
            'day' => $day,
            'display' => $this->formatDisplay($chapters),
            'chapters' => $chapters,
            'checked' => $checked,
            'checkedDetails' => $checkedDetails,
            'completedAt' => $completedAt ? (string) $completedAt : null,
            'nextDay' => $nextDay > 0 ? $nextDay : null,
            'progress' => [
                'done' => $checkedCount,
                'total' => $total,
                'percent' => $percent,
            ],
        ]);
    }

    public function history(Request $request): Response
    {
        $userId = $request->user()?->id;
        abort_unless($userId, 403);

        abort_unless(Schema::hasTable('leitura_usuario_capitulo'), 409);

        $rows = DB::table('leitura_usuario_capitulo as luc')
            ->join('bible_books as b', 'b.id', '=', 'luc.livro_id')
            ->where('luc.usuario_id', $userId)
            ->where('luc.concluido', 1)
            ->whereNotNull('luc.data_conclusao')
            ->orderByDesc('luc.data_conclusao')
            ->limit(200)
            ->get([
                'luc.dia as day',
                'luc.livro_id as book_id',
                'luc.capitulo as chapter',
                'luc.data_conclusao as completed_at',
                'b.key as book_key',
                'b.name as book_name',
            ])
            ->map(fn ($r) => [
                'day' => (int) $r->day,
                'bookId' => (int) $r->book_id,
                'bookKey' => (string) $r->book_key,
                'bookName' => (string) $r->book_name,
                'chapter' => (int) $r->chapter,
                'completedAt' => $r->completed_at ? (string) $r->completed_at : null,
            ])
            ->values()
            ->all();

        return Inertia::render('Mobile/AnoBiblicoHistory', [
            'items' => $rows,
        ]);
    }

    public function start(Request $request)
    {
        $userId = $request->user()?->id;
        abort_unless($userId, 403);
        abort_unless(Schema::hasTable('ano_biblico_usuario'), 409);

        abort_unless($this->hasUserPlanTables(), 409);

        DB::table('ano_biblico_usuario')->updateOrInsert(
            ['usuario_id' => $userId],
            [
                'data_inicio' => now()->toDateString(),
                'data_fim' => now()->addDays(364)->toDateString(),
                'status' => 'active',
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );

        // garante itens
        $this->ensureUserPlan((int) $userId);

        return redirect()->route('mobile.ano-biblico')->with('success', 'Ano Bíblico iniciado!');
    }

    public function resetToday(Request $request)
    {
        $userId = $request->user()?->id;
        abort_unless($userId, 403);
        abort_unless(Schema::hasTable('ano_biblico_usuario'), 409);

        DB::transaction(function () use ($userId) {
            DB::table('ano_biblico_usuario')->updateOrInsert(
                ['usuario_id' => $userId],
                [
                    'data_inicio' => now()->toDateString(),
                    'data_fim' => now()->addDays(364)->toDateString(),
                    'status' => 'active',
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );

            // Zera progresso do usuário (recomeçar hoje).
            if (Schema::hasTable('leitura_usuario_capitulo')) {
                DB::table('leitura_usuario_capitulo')->where('usuario_id', $userId)->delete();
            }
            if (Schema::hasTable('leitura_usuario')) {
                DB::table('leitura_usuario')->where('usuario_id', $userId)->delete();
            }
            if (Schema::hasTable('ano_biblico_usuario_itens')) {
                DB::table('ano_biblico_usuario_itens')->where('usuario_id', $userId)->delete();
            }
        });

        $this->ensureUserPlan((int) $userId);
        return redirect()->route('mobile.ano-biblico')->with('success', 'Plano reiniciado para hoje.');
    }

    public function restartZero(Request $request)
    {
        $userId = $request->user()?->id;
        abort_unless($userId, 403);
        abort_unless($this->hasUserPlanTables(), 409);

        DB::transaction(function () use ($userId) {
            if (Schema::hasTable('leitura_usuario_capitulo')) DB::table('leitura_usuario_capitulo')->where('usuario_id', $userId)->delete();
            if (Schema::hasTable('leitura_usuario')) DB::table('leitura_usuario')->where('usuario_id', $userId)->delete();
            DB::table('ano_biblico_usuario_itens')->where('usuario_id', $userId)->delete();
            DB::table('ano_biblico_usuario')->updateOrInsert(
                ['usuario_id' => $userId],
                [
                    'data_inicio' => now()->toDateString(),
                    'data_fim' => now()->addDays(364)->toDateString(),
                    'status' => 'active',
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
        });

        $this->ensureUserPlan((int) $userId);
        return redirect()->route('mobile.ano-biblico')->with('success', 'Você recomeçou do zero.');
    }

    public function reprogram(Request $request)
    {
        $userId = $request->user()?->id;
        abort_unless($userId, 403);
        abort_unless($this->hasUserPlanTables(), 409);

        $mode = (string) $request->input('mode', 'keep_end');
        $newEnd = $request->input('data_fim');

        $this->ensureUserPlan((int) $userId);

        $today = Carbon::now()->startOfDay();
        $currentEnd = $this->endDateForUser((int) $userId);
        $targetEnd = $currentEnd ? Carbon::parse($currentEnd)->startOfDay() : $today->copy()->addDays(364);

        if ($mode === 'new_end') {
            abort_unless(is_string($newEnd) && $newEnd !== '', 422);
            $targetEnd = Carbon::parse((string) $newEnd)->startOfDay();
        } elseif ($mode === 'start_today_keep_end') {
            // só muda início lógico para hoje (redistribui restante a partir de hoje mantendo data final)
        } elseif ($mode !== 'keep_end') {
            abort(422);
        }

        abort_unless($targetEnd->gte($today), 422);

        DB::transaction(function () use ($userId, $today, $targetEnd) {
            // capítulos já concluídos
            $done = [];
            if (Schema::hasTable('leitura_usuario_capitulo')) {
                DB::table('leitura_usuario_capitulo')
                    ->where('usuario_id', $userId)
                    ->where('concluido', 1)
                    ->get(['livro_id', 'capitulo', 'data_conclusao'])
                    ->each(function ($r) use (&$done) {
                        $done[((int) $r->livro_id).':'.((int) $r->capitulo)] = $r->data_conclusao ? (string) $r->data_conclusao : (string) now();
                    });
            }

            // lista completa do plano em ordem canônica
            $all = DB::table('plano_leitura as p')
                ->join('bible_books as b', 'b.id', '=', 'p.livro_id')
                ->orderBy('p.dia')
                ->orderBy('b.position')
                ->orderBy('p.capitulo')
                ->get(['p.livro_id', 'p.capitulo']);

            $remaining = [];
            foreach ($all as $r) {
                $k = ((int) $r->livro_id).':'.((int) $r->capitulo);
                if (!isset($done[$k])) $remaining[] = ['livro_id' => (int) $r->livro_id, 'capitulo' => (int) $r->capitulo];
            }

            $daysRemaining = max(1, $today->diffInDays($targetEnd) + 1); // inclui hoje
            $chaptersRemaining = count($remaining);
            $perDay = (int) ceil($chaptersRemaining / $daysRemaining);
            if ($perDay < 1) $perDay = 1;

            // remove itens não concluídos (mantém concluídos como histórico do próprio plano)
            DB::table('ano_biblico_usuario_itens')->where('usuario_id', $userId)->where('concluido', 0)->delete();

            // dia sequencial continua 1..365 (preserva dia dos concluídos existentes)
            $maxDia = (int) DB::table('ano_biblico_usuario_itens')->where('usuario_id', $userId)->max('dia');
            $dia = max(1, $maxDia + 1);

            $rows = [];
            $date = $today->copy();
            $idx = 0;
            while ($idx < $chaptersRemaining) {
                $count = 0;
                while ($idx < $chaptersRemaining && $count < $perDay) {
                    $rows[] = [
                        'usuario_id' => $userId,
                        'dia' => $dia,
                        'data_leitura' => $date->toDateString(),
                        'livro_id' => $remaining[$idx]['livro_id'],
                        'capitulo' => $remaining[$idx]['capitulo'],
                        'concluido' => 0,
                        'data_conclusao' => null,
                    ];
                    $idx++;
                    $count++;
                }
                $dia++;
                $date = $date->addDay();
                if ($date->gt($targetEnd) && $idx < $chaptersRemaining) {
                    // ultrapassou a data final; força continuar no último dia (não ideal, mas garante integridade)
                    $date = $targetEnd->copy();
                }
            }

            foreach (array_chunk($rows, 500) as $chunk) {
                DB::table('ano_biblico_usuario_itens')->insert($chunk);
            }

            DB::table('ano_biblico_usuario')->updateOrInsert(
                ['usuario_id' => $userId],
                [
                    'data_inicio' => DB::table('ano_biblico_usuario')->where('usuario_id', $userId)->value('data_inicio') ?? now()->toDateString(),
                    'data_fim' => $targetEnd->toDateString(),
                    'status' => 'active',
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
        });

        return redirect()->route('mobile.ano-biblico')->with('success', 'Plano reprogramado.');
    }

    public function toggleChapter(Request $request)
    {
        $userId = $request->user()?->id;
        abort_unless($userId, 403);

        abort_unless(Schema::hasTable('plano_leitura') && Schema::hasTable('leitura_usuario_capitulo'), 409);

        $valid = $request->validate([
            'day' => ['required', 'integer', 'min:1', 'max:365'],
            'bookId' => ['required', 'integer', 'min:1'],
            'chapter' => ['required', 'integer', 'min:1'],
            'checked' => ['required', 'boolean'],
        ]);

        $day = (int) $valid['day'];
        $bookId = (int) $valid['bookId'];
        $chapter = (int) $valid['chapter'];
        $checked = (bool) $valid['checked'];

        // Desafio ativo: marca/desmarca no desafio (não mexe no histórico global).
        $activeChallenge = $this->activeChallengeForUser((int) $userId);
        if ($activeChallenge) {
            $existsInChallenge = DB::table('ano_biblico_desafio_itens')
                ->where('usuario_desafio_id', (int) $activeChallenge->id)
                ->where('dia', $day)
                ->where('livro_id', $bookId)
                ->where('capitulo', $chapter)
                ->exists();
            abort_unless($existsInChallenge, 404);

            DB::table('ano_biblico_desafio_itens')
                ->where('usuario_desafio_id', (int) $activeChallenge->id)
                ->where('dia', $day)
                ->where('livro_id', $bookId)
                ->where('capitulo', $chapter)
                ->update([
                    'concluido' => $checked ? 1 : 0,
                    'data_conclusao' => $checked ? now() : null,
                ]);

            return back();
        }

        // Garante que este capítulo pertence ao dia no plano.
        $existsInPlan = DB::table('plano_leitura')
            ->where('dia', $day)
            ->where('livro_id', $bookId)
            ->where('capitulo', $chapter)
            ->exists();
        abort_unless($existsInPlan, 404);

        DB::table('leitura_usuario_capitulo')->updateOrInsert(
            ['usuario_id' => $userId, 'dia' => $day, 'livro_id' => $bookId, 'capitulo' => $chapter],
            ['concluido' => $checked ? 1 : 0, 'data_conclusao' => $checked ? now() : null]
        );

        // Se o usuário desmarcar algo, removemos a conclusão do dia (e o timestamp).
        // Se ele marcar tudo (100%), concluímos o dia automaticamente com timestamp.
        if (Schema::hasTable('leitura_usuario')) {
            $total = (int) DB::table('plano_leitura')->where('dia', $day)->count();
            $done = (int) DB::table('leitura_usuario_capitulo')
                ->where('usuario_id', $userId)
                ->where('dia', $day)
                ->where('concluido', 1)
                ->count();

            if ($total > 0 && $done >= $total) {
                DB::table('leitura_usuario')->updateOrInsert(
                    ['usuario_id' => $userId, 'dia' => $day],
                    ['concluido' => 1, 'data_conclusao' => now()]
                );
            } else {
                DB::table('leitura_usuario')->updateOrInsert(
                    ['usuario_id' => $userId, 'dia' => $day],
                    ['concluido' => 0, 'data_conclusao' => null]
                );
            }
        }

        return back();
    }

    public function complete(Request $request)
    {
        $userId = $request->user()?->id;
        abort_unless($userId, 403);

        abort_unless(Schema::hasTable('leitura_usuario') && Schema::hasTable('plano_leitura'), 409);

        $valid = $request->validate([
            'day' => ['required', 'integer', 'min:1', 'max:365'],
        ]);

        $day = (int) $valid['day'];

        // Desafio ativo: concluir o dia no desafio.
        $activeChallenge = $this->activeChallengeForUser((int) $userId);
        if ($activeChallenge) {
            DB::table('ano_biblico_desafio_itens')
                ->where('usuario_desafio_id', (int) $activeChallenge->id)
                ->where('dia', $day)
                ->where('concluido', 0)
                ->update(['concluido' => 1, 'data_conclusao' => now()]);

            return redirect()->route('mobile.ano-biblico')->with('success', 'Dia marcado como concluído!');
        }

        DB::transaction(function () use ($userId, $day) {
            // Se existir a tabela por capítulo, marcar tudo do dia como lido (atalho).
            if (Schema::hasTable('leitura_usuario_capitulo')) {
                $chapters = DB::table('plano_leitura')
                    ->where('dia', $day)
                    ->get(['livro_id', 'capitulo']);

                foreach ($chapters as $c) {
                    DB::table('leitura_usuario_capitulo')->updateOrInsert(
                        [
                            'usuario_id' => $userId,
                            'dia' => $day,
                            'livro_id' => (int) $c->livro_id,
                            'capitulo' => (int) $c->capitulo,
                        ],
                        [
                            'concluido' => 1,
                            'data_conclusao' => now(),
                        ]
                    );
                }
            }

            // Marca o dia como concluído.
            DB::table('leitura_usuario')->updateOrInsert(
                ['usuario_id' => $userId, 'dia' => $day],
                ['concluido' => 1, 'data_conclusao' => now()]
            );
        });

        return redirect()->route('mobile.ano-biblico')->with('success', 'Dia marcado como concluído!');
    }

    /**
     * @param array<int, array{bookKey:string, bookName:string, chapter:int}> $chapters
     */
    private function formatDisplay(array $chapters): string
    {
        if (! $chapters) return '';

        $out = [];
        $book = null;
        $nums = [];

        $flush = function () use (&$out, &$book, &$nums) {
            if (! $book || ! $nums) return;
            $nums = array_values(array_unique(array_map('intval', $nums)));
            sort($nums);
            $ranges = [];
            $start = null;
            $prev = null;
            foreach ($nums as $n) {
                if ($start === null) {
                    $start = $n;
                    $prev = $n;
                    continue;
                }
                if ($n === $prev + 1) {
                    $prev = $n;
                    continue;
                }
                $ranges[] = [$start, $prev];
                $start = $n;
                $prev = $n;
            }
            if ($start !== null && $prev !== null) $ranges[] = [$start, $prev];
            $parts = array_map(fn ($r) => $r[0] === $r[1] ? (string) $r[0] : ($r[0].'–'.$r[1]), $ranges);
            $out[] = trim($book.' '.implode(', ', $parts));
        };

        foreach ($chapters as $c) {
            if ($book === null) {
                $book = $c['bookName'];
                $nums = [$c['chapter']];
                continue;
            }
            if ($c['bookName'] !== $book) {
                $flush();
                $book = $c['bookName'];
                $nums = [$c['chapter']];
                continue;
            }
            $nums[] = $c['chapter'];
        }
        $flush();

        return implode('; ', $out);
    }
}

