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

    /**
     * @param list<array{book_id:int,chapter:int}> $chaptersOrdered
     * @return array<string,int> key "bookId:chapter" => verse count
     */
    private function verseCountMapForChapters(array $chaptersOrdered): array
    {
        if ($chaptersOrdered === [] || ! Schema::hasTable('bible_verses')) {
            return [];
        }

        $bookIds = array_values(array_unique(array_map(fn (array $c) => (int) $c['book_id'], $chaptersOrdered)));
        if ($bookIds === []) {
            return [];
        }

        $rows = DB::table('bible_verses')
            ->select('book_id', 'chapter', DB::raw('COUNT(*) as c'))
            ->whereIn('book_id', $bookIds)
            ->groupBy('book_id', 'chapter')
            ->get();

        $map = [];
        foreach ($rows as $r) {
            $map[((int) $r->book_id).':'.((int) $r->chapter)] = (int) $r->c;
        }

        return $map;
    }

    /**
     * Distribui capítulos por dias de calendário usando meta de versículos/dia (ceil(total/dias)),
     * empacotando capítulos inteiros até atingir a meta do dia (mínimo 1 capítulo por dia com leitura).
     *
     * @param list<array{book_id:int,chapter:int}> $chaptersOrdered
     * @param array<string,?string> $doneMap "livro:cap" => data_conclusao (marca concluído quando definido)
     * @return list<array{dia:int,data_leitura:string,livro_id:int,capitulo:int,concluido:int,data_conclusao:?string}>
     */
    private function scheduleChaptersByVerseBudget(
        Carbon $firstCalendarDay,
        Carbon $end,
        array $chaptersOrdered,
        array $doneMap,
        int $initialDia
    ): array {
        if ($chaptersOrdered === []) {
            return [];
        }

        $verseMap = $this->verseCountMapForChapters($chaptersOrdered);
        $verseFor = function (array $c) use ($verseMap): int {
            return max(1, (int) ($verseMap[$c['book_id'].':'.$c['chapter']] ?? 1));
        };

        $totalVerses = 0;
        foreach ($chaptersOrdered as $c) {
            $totalVerses += $verseFor($c);
        }

        $days = max(1, $firstCalendarDay->diffInDays($end) + 1);
        $versePerDay = max(1, (int) ceil($totalVerses / $days));

        $rows = [];
        $idx = 0;
        $n = count($chaptersOrdered);
        $diaSeq = $initialDia;
        $calendarOffset = 0;

        while ($idx < $n) {
            $dateCarbon = $firstCalendarDay->copy()->addDays($calendarOffset);
            if ($dateCarbon->gt($end)) {
                $dateCarbon = $end->copy();
            }
            $dateStr = $dateCarbon->toDateString();
            $dayVerses = 0;

            while ($idx < $n) {
                $c = $chaptersOrdered[$idx];
                $vc = $verseFor($c);
                if ($dayVerses > 0 && $dayVerses >= $versePerDay) {
                    break;
                }
                $k = $c['book_id'].':'.$c['chapter'];
                $completedAt = $doneMap[$k] ?? null;
                $rows[] = [
                    'dia' => $diaSeq,
                    'data_leitura' => $dateStr,
                    'livro_id' => $c['book_id'],
                    'capitulo' => $c['chapter'],
                    'concluido' => $completedAt ? 1 : 0,
                    'data_conclusao' => $completedAt,
                ];
                $dayVerses += $vc;
                $idx++;
                if ($dayVerses >= $versePerDay) {
                    break;
                }
            }

            $diaSeq++;
            $calendarOffset++;
        }

        return $rows;
    }

    private function hasUserPlanTables(): bool
    {
        return Schema::hasTable('ano_biblico_usuario') && Schema::hasTable('ano_biblico_usuario_itens');
    }

    /**
     * Próximo dia de leitura pendente (desafio ativo ou plano clássico).
     */
    private function nextPendingDayForUser(int $userId): ?int
    {
        $active = $this->activeChallengeForUser($userId);
        if ($active) {
            $dia = DB::table('ano_biblico_desafio_itens')
                ->where('usuario_desafio_id', (int) $active->id)
                ->where('concluido', 0)
                ->orderBy('data_leitura')
                ->orderBy('dia')
                ->value('dia');

            return $dia !== null ? (int) $dia : null;
        }

        if (! $this->hasUserPlanTables()) {
            return null;
        }

        $dia = DB::table('ano_biblico_usuario_itens')
            ->where('usuario_id', $userId)
            ->where('concluido', 0)
            ->orderBy('data_leitura')
            ->orderBy('dia')
            ->value('dia');

        return $dia !== null ? (int) $dia : null;
    }

    /**
     * Após reprogramar/recomeçar: abre a leitura do dia (não a tela principal).
     */
    private function redirectToNextReading(int $userId, string $message)
    {
        $day = $this->nextPendingDayForUser($userId);
        if ($day !== null) {
            return redirect()
                ->route('mobile.ano-biblico.day', ['day' => $day])
                ->with('success', $message);
        }

        return redirect()->route('mobile.ano-biblico')->with('success', $message);
    }

    /**
     * Capítulos do escopo de um desafio, em ordem canônica.
     *
     * @return list<array{book_id:int,chapter:int}>
     */
    private function chaptersForChallengeScope(string $scope): array
    {
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

        return $chapters;
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
            $scriptBlock = <<<'TXT'
# Na raiz do projeto (mesmo .env do Laravel: DB_HOST, DB_DATABASE, …)

# 1) Tabelas do módulo — recomendado (aplica database/sql/ano_biblico.sql via PDO)
php scripts/instalar_ano_biblico.php

# 2) Plano base de 365 dias em plano_leitura (requer bible_books + bible_verses já importados)
php scripts/gerar_plano_ano_biblico.php

# Alternativa ao passo 1 — importar o SQL no cliente MySQL (ajuste host, usuário e base)
# mysql -h 127.0.0.1 -P 3306 -u USUARIO -p NOME_DA_BASE < database/sql/ano_biblico.sql
TXT;

            return Inertia::render('Mobile/AnoBiblico', [
                'installed' => false,
                'needsLogin' => false,
                'setup' => [
                    'sqlPath' => 'database/sql/ano_biblico.sql',
                    'installCmd' => 'php scripts/instalar_ano_biblico.php',
                    'generateCmd' => 'php scripts/gerar_plano_ano_biblico.php',
                    'scriptBlock' => $scriptBlock,
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

            $pendingVerses = $finished ? 0 : $this->countPendingVersesForDesafio((int) $activeChallenge->id);

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
                    'pendingVerses' => $pendingVerses,
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

        $pendingVerses = $finished ? 0 : $this->countPendingVersesForUsuarioPlan((int) $userId);

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
                'pendingVerses' => $pendingVerses,
            ],
        ]);
    }

    private function countPendingVersesForDesafio(int $userChallengeId): int
    {
        if (! Schema::hasTable('bible_verses')) {
            return 0;
        }

        return (int) DB::table('bible_verses as v')
            ->join('ano_biblico_desafio_itens as i', function ($join) {
                $join->on('i.livro_id', '=', 'v.book_id')
                    ->on('i.capitulo', '=', 'v.chapter');
            })
            ->where('i.usuario_desafio_id', $userChallengeId)
            ->where('i.concluido', 0)
            ->count();
    }

    private function countPendingVersesForUsuarioPlan(int $userId): int
    {
        if (! Schema::hasTable('bible_verses') || ! Schema::hasTable('ano_biblico_usuario_itens')) {
            return 0;
        }

        return (int) DB::table('bible_verses as v')
            ->join('ano_biblico_usuario_itens as i', function ($join) {
                $join->on('i.livro_id', '=', 'v.book_id')
                    ->on('i.capitulo', '=', 'v.chapter');
            })
            ->where('i.usuario_id', $userId)
            ->where('i.concluido', 0)
            ->count();
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

            $scheduled = $this->scheduleChaptersByVerseBudget($today, $end, $chapters, $doneMap, 1);
            $rows = [];
            foreach ($scheduled as $r) {
                $rows[] = [
                    'usuario_desafio_id' => $userChallengeId,
                    'usuario_id' => $userId,
                    'dia' => $r['dia'],
                    'data_leitura' => $r['data_leitura'],
                    'livro_id' => $r['livro_id'],
                    'capitulo' => $r['capitulo'],
                    'concluido' => $r['concluido'],
                    'data_conclusao' => $r['data_conclusao'],
                ];
            }

            foreach (array_chunk($rows, 500) as $chunk) {
                DB::table('ano_biblico_desafio_itens')->insert($chunk);
            }
        });

        return redirect()->route('mobile.ano-biblico')->with('success', 'Desafio iniciado!');
    }

    public function recalculateActiveChallenge(Request $request)
    {
        $userId = $request->user()?->id;
        abort_unless($userId, 403);
        abort_unless($this->hasChallengesTables(), 409);

        $active = $this->activeChallengeForUser((int) $userId);
        abort_unless($active, 404);

        $today = Carbon::now()->startOfDay();
        $end = Carbon::parse((string) $active->data_fim)->startOfDay();
        abort_unless($end->gte($today), 422);

        DB::transaction(function () use ($userId, $active, $today, $end) {
            $ucId = (int) $active->id;

            $pending = DB::table('ano_biblico_desafio_itens as i')
                ->join('bible_books as b', 'b.id', '=', 'i.livro_id')
                ->where('i.usuario_desafio_id', $ucId)
                ->where('i.concluido', 0)
                ->orderBy('b.position')
                ->orderBy('i.capitulo')
                ->get(['i.livro_id', 'i.capitulo']);

            if ($pending->isEmpty()) {
                return;
            }

            $chaptersOrdered = $pending
                ->map(fn ($r) => ['book_id' => (int) $r->livro_id, 'chapter' => (int) $r->capitulo])
                ->all();

            DB::table('ano_biblico_desafio_itens')
                ->where('usuario_desafio_id', $ucId)
                ->where('concluido', 0)
                ->delete();

            $maxDia = (int) (DB::table('ano_biblico_desafio_itens')->where('usuario_desafio_id', $ucId)->max('dia') ?? 0);
            $startDia = max(1, $maxDia + 1);

            $scheduled = $this->scheduleChaptersByVerseBudget($today, $end, $chaptersOrdered, [], $startDia);
            $rows = [];
            foreach ($scheduled as $r) {
                $rows[] = [
                    'usuario_desafio_id' => $ucId,
                    'usuario_id' => (int) $userId,
                    'dia' => $r['dia'],
                    'data_leitura' => $r['data_leitura'],
                    'livro_id' => $r['livro_id'],
                    'capitulo' => $r['capitulo'],
                    'concluido' => 0,
                    'data_conclusao' => null,
                ];
            }

            foreach (array_chunk($rows, 500) as $chunk) {
                DB::table('ano_biblico_desafio_itens')->insert($chunk);
            }
        });

        return redirect()->route('mobile.ano-biblico')->with('success', 'Leituras restantes recalculadas até a data final.');
    }

    public function day(Request $request, int $day): Response
    {
        $userId = $request->user()?->id;
        abort_unless($userId, 403);

        abort_unless(Schema::hasTable('plano_leitura') && Schema::hasTable('leitura_usuario'), 409);
        abort_unless($day >= 1 && $day <= 2000, 404);

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

        $activeChallenge = $this->activeChallengeForUser((int) $userId);

        if ($activeChallenge) {
            $today = Carbon::now()->startOfDay();
            $tipo = (string) $activeChallenge->tipo;
            $end = $today->copy()->addDays(364);
            if ($tipo === 'fim_do_ano') {
                $end = Carbon::create($today->year, 12, 31)->startOfDay();
            } elseif ($tipo === 'um_ano') {
                $end = $today->copy()->addDays(365);
            } elseif ($tipo === 'noventa_dias') {
                $end = $today->copy()->addDays(90);
            } elseif ($tipo === 'novo_testamento_30') {
                $end = $today->copy()->addDays(30);
            } elseif (! empty($activeChallenge->data_fim)) {
                $prevEnd = Carbon::parse((string) $activeChallenge->data_fim)->startOfDay();
                $prevStart = Carbon::parse((string) $activeChallenge->data_inicio)->startOfDay();
                $span = max(1, $prevStart->diffInDays($prevEnd));
                $end = $today->copy()->addDays($span);
            }

            DB::transaction(function () use ($userId, $activeChallenge, $today, $end) {
                if (Schema::hasTable('leitura_usuario_capitulo')) {
                    DB::table('leitura_usuario_capitulo')->where('usuario_id', $userId)->delete();
                }
                if (Schema::hasTable('leitura_usuario')) {
                    DB::table('leitura_usuario')->where('usuario_id', $userId)->delete();
                }

                $ucId = (int) $activeChallenge->id;
                DB::table('ano_biblico_desafio_itens')->where('usuario_desafio_id', $ucId)->delete();

                DB::table('ano_biblico_desafio_usuario')->where('id', $ucId)->update([
                    'data_inicio' => $today->toDateString(),
                    'data_fim' => $end->toDateString(),
                    'status' => 'active',
                    'atualizado_em' => now(),
                ]);

                $chapters = $this->chaptersForChallengeScope((string) $activeChallenge->escopo);
                $scheduled = $this->scheduleChaptersByVerseBudget($today, $end, $chapters, [], 1);
                $rows = [];
                foreach ($scheduled as $r) {
                    $rows[] = [
                        'usuario_desafio_id' => $ucId,
                        'usuario_id' => (int) $userId,
                        'dia' => $r['dia'],
                        'data_leitura' => $r['data_leitura'],
                        'livro_id' => $r['livro_id'],
                        'capitulo' => $r['capitulo'],
                        'concluido' => 0,
                        'data_conclusao' => null,
                    ];
                }
                foreach (array_chunk($rows, 500) as $chunk) {
                    DB::table('ano_biblico_desafio_itens')->insert($chunk);
                }
            });

            return $this->redirectToNextReading((int) $userId, 'Você recomeçou do zero.');
        }

        abort_unless($this->hasUserPlanTables(), 409);

        DB::transaction(function () use ($userId) {
            if (Schema::hasTable('leitura_usuario_capitulo')) {
                DB::table('leitura_usuario_capitulo')->where('usuario_id', $userId)->delete();
            }
            if (Schema::hasTable('leitura_usuario')) {
                DB::table('leitura_usuario')->where('usuario_id', $userId)->delete();
            }
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

        return $this->redirectToNextReading((int) $userId, 'Você recomeçou do zero.');
    }

    public function reprogram(Request $request)
    {
        $userId = $request->user()?->id;
        abort_unless($userId, 403);

        $mode = (string) $request->input('mode', 'keep_end');
        $newEnd = $request->input('data_fim');

        $today = Carbon::now()->startOfDay();
        $activeChallenge = $this->activeChallengeForUser((int) $userId);

        if ($activeChallenge) {
            $targetEnd = Carbon::parse((string) $activeChallenge->data_fim)->startOfDay();

            if ($mode === 'new_end') {
                abort_unless(is_string($newEnd) && $newEnd !== '', 422);
                $targetEnd = Carbon::parse((string) $newEnd)->startOfDay();
            } elseif ($mode === 'start_today_keep_end') {
                // redistribui restante a partir de hoje mantendo data final
            } elseif ($mode !== 'keep_end') {
                abort(422);
            }

            abort_unless($targetEnd->gte($today), 422);

            DB::transaction(function () use ($userId, $activeChallenge, $today, $targetEnd) {
                $ucId = (int) $activeChallenge->id;

                $pending = DB::table('ano_biblico_desafio_itens as i')
                    ->join('bible_books as b', 'b.id', '=', 'i.livro_id')
                    ->where('i.usuario_desafio_id', $ucId)
                    ->where('i.concluido', 0)
                    ->orderBy('b.position')
                    ->orderBy('i.capitulo')
                    ->get(['i.livro_id', 'i.capitulo']);

                DB::table('ano_biblico_desafio_itens')
                    ->where('usuario_desafio_id', $ucId)
                    ->where('concluido', 0)
                    ->delete();

                $maxDia = (int) (DB::table('ano_biblico_desafio_itens')->where('usuario_desafio_id', $ucId)->max('dia') ?? 0);
                $startDia = max(1, $maxDia + 1);

                $chaptersOrdered = $pending
                    ->map(fn ($r) => ['book_id' => (int) $r->livro_id, 'chapter' => (int) $r->capitulo])
                    ->all();

                $scheduled = $this->scheduleChaptersByVerseBudget($today, $targetEnd, $chaptersOrdered, [], $startDia);
                $rows = [];
                foreach ($scheduled as $r) {
                    $rows[] = [
                        'usuario_desafio_id' => $ucId,
                        'usuario_id' => (int) $userId,
                        'dia' => $r['dia'],
                        'data_leitura' => $r['data_leitura'],
                        'livro_id' => $r['livro_id'],
                        'capitulo' => $r['capitulo'],
                        'concluido' => 0,
                        'data_conclusao' => null,
                    ];
                }
                foreach (array_chunk($rows, 500) as $chunk) {
                    DB::table('ano_biblico_desafio_itens')->insert($chunk);
                }

                DB::table('ano_biblico_desafio_usuario')->where('id', $ucId)->update([
                    'data_fim' => $targetEnd->toDateString(),
                    'atualizado_em' => now(),
                ]);
            });

            return $this->redirectToNextReading((int) $userId, 'Plano reprogramado.');
        }

        abort_unless($this->hasUserPlanTables(), 409);

        $this->ensureUserPlan((int) $userId);

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
                if (! isset($done[$k])) {
                    $remaining[] = ['livro_id' => (int) $r->livro_id, 'capitulo' => (int) $r->capitulo];
                }
            }

            // remove itens não concluídos (mantém concluídos como histórico do próprio plano)
            DB::table('ano_biblico_usuario_itens')->where('usuario_id', $userId)->where('concluido', 0)->delete();

            // dia sequencial continua após o último concluído
            $maxDia = (int) (DB::table('ano_biblico_usuario_itens')->where('usuario_id', $userId)->max('dia') ?? 0);
            $dia = max(1, $maxDia + 1);

            $chaptersOrdered = array_map(
                fn (array $x) => ['book_id' => $x['livro_id'], 'chapter' => $x['capitulo']],
                $remaining
            );
            $scheduled = $this->scheduleChaptersByVerseBudget($today, $targetEnd, $chaptersOrdered, [], $dia);
            $rows = [];
            foreach ($scheduled as $r) {
                $rows[] = [
                    'usuario_id' => $userId,
                    'dia' => $r['dia'],
                    'data_leitura' => $r['data_leitura'],
                    'livro_id' => $r['livro_id'],
                    'capitulo' => $r['capitulo'],
                    'concluido' => 0,
                    'data_conclusao' => null,
                ];
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

        return $this->redirectToNextReading((int) $userId, 'Plano reprogramado.');
    }

    public function toggleChapter(Request $request)
    {
        $userId = $request->user()?->id;
        abort_unless($userId, 403);

        abort_unless(Schema::hasTable('plano_leitura') && Schema::hasTable('leitura_usuario_capitulo'), 409);

        $valid = $request->validate([
            'day' => ['required', 'integer', 'min:1', 'max:2000'],
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
            'day' => ['required', 'integer', 'min:1', 'max:2000'],
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

