<?php

namespace App\Services;

use App\Models\BibleBook;
use App\Models\BibleVerse;
use App\Models\VersiculoCaixinha;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class PromiseBoxCuratorService
{
    /**
     * @return array<string, array{nota:int, peso:int, categoria?:string}>
     */
    public function popularBoostIndex(): array
    {
        $out = [];
        foreach (config('promise_box.popular_verses', []) as $row) {
            [$livro, $cap, $vStart, $vEnd, $categoria, $nota, $peso] = $row;
            $key = $this->popularKey((string) $livro, (int) $cap, (int) $vStart);
            $out[$key] = [
                'nota' => (int) $nota,
                'peso' => (int) $peso,
                'categoria' => (string) $categoria,
            ];
        }

        return $out;
    }

    /**
     * @param  array<string, array{nota:int, peso:int, categoria?:string}>  $popularBoost
     * @return array{keep:bool, categoria:string, nota:int, peso:int, reasons:string[]}
     */
    public function analyzeVerse(string $book, int $chapter, int $verse, string $text, int $maxChars = 220, ?array $popularBoost = null): array
    {
        $popularBoost ??= $this->popularBoostIndex();
        $reasons = [];
        $t = $this->normalize($text);

        if ($t === '' || mb_strlen($t) < 25) {
            return ['keep' => false, 'categoria' => 'Sabedoria', 'nota' => 1, 'peso' => 1, 'reasons' => ['muito_curto']];
        }

        if (mb_strlen($t) > $maxChars) {
            return ['keep' => false, 'categoria' => 'Sabedoria', 'nota' => 1, 'peso' => 1, 'reasons' => ['muito_longo']];
        }

        if ($this->looksLikeGenealogy($t)) {
            return ['keep' => false, 'categoria' => 'Família', 'nota' => 1, 'peso' => 1, 'reasons' => ['genealogia']];
        }

        if ($this->hasViolence($t)) {
            return ['keep' => false, 'categoria' => 'Coragem', 'nota' => 1, 'peso' => 1, 'reasons' => ['violencia']];
        }

        if ($this->looksTechnicalLaw($t)) {
            return ['keep' => false, 'categoria' => 'Sabedoria', 'nota' => 1, 'peso' => 1, 'reasons' => ['lei_tecnica']];
        }

        $pKey = $this->popularKey($book, $chapter, $verse);
        if (isset($popularBoost[$pKey])) {
            $p = $popularBoost[$pKey];
            $categoria = (string) ($p['categoria'] ?? 'Esperança');
            if ($this->isExcludedCategory($categoria)) {
                return ['keep' => false, 'categoria' => $categoria, 'nota' => 1, 'peso' => 1, 'reasons' => ['categoria_excluida']];
            }

            return [
                'keep' => true,
                'categoria' => $categoria,
                'nota' => (int) $p['nota'],
                'peso' => (int) $p['peso'],
                'reasons' => ['popular_boost'],
            ];
        }

        $scores = $this->categoryScores($t);
        arsort($scores);
        $categoria = array_key_first($scores) ?: 'Esperança';
        if ($this->isExcludedCategory($categoria)) {
            return ['keep' => false, 'categoria' => $categoria, 'nota' => 1, 'peso' => 1, 'reasons' => ['categoria_excluida']];
        }

        $catScore = (int) ($scores[$categoria] ?? 0);
        $nota = 5;
        $peso = 1;
        $clarity = 0;

        if ($this->hasPromiseTone($t)) { $clarity += 2; $reasons[] = 'promessa'; }
        if ($this->hasDevotionalTone($t)) { $clarity += 2; $reasons[] = 'devocional'; }
        if ($this->hasComfortWords($t)) { $clarity += 2; $reasons[] = 'conforto'; }

        $nota += min(4, $clarity);
        $nota += min(2, (int) floor($catScore / 3));

        if ($this->looksContextDependent($t)) {
            $nota -= 2;
            $reasons[] = 'contexto';
        }

        if (mb_strlen($t) <= 120) {
            $nota += 1;
            $peso += 2;
            $reasons[] = 'curto';
        }

        if (preg_match('/\b(deus|senhor|jesus|cristo|esp[ií]rito)\b/u', $t)) {
            $nota += 1;
            $peso += 2;
            $reasons[] = 'teocentrico';
        }

        if (preg_match('/\b(n[aã]o temas|n[aã]o tenha medo|eu estou com voc[eê]|confie|entregue|ore|clame)\b/u', $t)) {
            $nota += 1;
            $peso += 1;
            $reasons[] = 'imperativo_devocional';
        }

        $nota = max(1, min(10, $nota));
        $peso = max(1, min(10, $peso));

        $hasSignal = $clarity >= 2 || $catScore >= 5 || $peso >= 4;
        if (! $hasSignal) {
            return ['keep' => false, 'categoria' => $categoria, 'nota' => 1, 'peso' => 1, 'reasons' => ['pouco_sinal']];
        }

        return ['keep' => true, 'categoria' => $categoria, 'nota' => $nota, 'peso' => $peso, 'reasons' => $reasons];
    }

    public function isExcludedCategory(string $categoria): bool
    {
        return in_array($categoria, config('promise_box.excluded_categories', []), true);
    }

    public function popularKey(string $book, int $chapter, int $verse): string
    {
        return mb_strtolower(trim($book)).'|'.$chapter.'|'.$verse;
    }

    private function normalize(string $text): string
    {
        $t = trim($text);
        $t = preg_replace('/\s+/u', ' ', $t) ?? $t;

        return $t;
    }

    private function looksLikeGenealogy(string $t): bool
    {
        $hits = 0;
        $hits += preg_match_all('/\bfilh[oa]s?\s+de\b/u', $t) ?: 0;
        $hits += preg_match_all('/\bgerou\b/u', $t) ?: 0;
        $hits += preg_match_all('/\be\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+/u', $t) ?: 0;

        return $hits >= 6;
    }

    private function hasViolence(string $t): bool
    {
        return (bool) preg_match('/\b(matar|mate|morte|morrer|sangue|espada|guerra|destruir|vingan[çc]a|aniquilar|ferir|degolar)\b/u', $t);
    }

    private function looksTechnicalLaw(string $t): bool
    {
        return (bool) preg_match('/\b(holocausto|sacrif[ií]cio|oferta|ofertas|levitas|impuro|imund[oa]|circuncid|altar|tabern[aá]culo|unc|purifica[cç][aã]o)\b/u', $t);
    }

    private function looksContextDependent(string $t): bool
    {
        if (preg_match('/^(portanto|assim|por isso|ent[aã]o|logo)\b/u', $t)) {
            return true;
        }

        if (preg_match('/^(e aconteceu|e sucedeu|naquele tempo)\b/u', $t)) {
            return true;
        }

        return false;
    }

    private function hasPromiseTone(string $t): bool
    {
        return (bool) preg_match('/\b(eu (sou|estou) com voc[eê]|n[aã]o te deixarei|n[aã]o te desampararei|eu te ajudarei|eu te sustentarei|eu te guardarei|eu te fortale[cç]erei)\b/u', $t);
    }

    private function hasDevotionalTone(string $t): bool
    {
        return (bool) preg_match('/\b(ore|orai|clame|clamai|busque|buscai|confie|confiai|entregue|entregai|espere|esperai|louve|louvai|agrade[cç]a|agradecei)\b/u', $t);
    }

    private function hasComfortWords(string $t): bool
    {
        return (bool) preg_match('/\b(paz|descanso|consolo|esperan[çc]a|alegria|for[çc]a|ref[uú]gio|socorro|salva[cç][aã]o|gra[çc]a|miseric[oó]rdia)\b/u', $t);
    }

    /**
     * @return array<string, int>
     */
    private function categoryScores(string $t): array
    {
        $cats = [
            'Esperança' => ['esperança', 'futuro', 'amanhã', 'vida eterna', 'nova', 'renovar', 'restaurar', 'promessa'],
            'Fé' => ['fé', 'crer', 'creia', 'crede', 'confessar', 'justo viverá', 'invisível'],
            'Confiança' => ['confie', 'confiança', 'refúgio', 'seguro', 'socorro', 'fortaleza', 'proteção', 'guardar', 'cuidar'],
            'Oração' => ['oração', 'orar', 'ore', 'clamar', 'clame', 'pedir', 'peça', 'suplicar'],
            'Perdão' => ['perdão', 'perdoar', 'perdoe', 'perdoai', 'confessar', 'limpar', 'purificar', 'misericórdia'],
            'Gratidão' => ['gratidão', 'agradeça', 'agradecei', 'louvor', 'louve', 'bendiga', 'exaltar'],
            'Família' => ['pai', 'mãe', 'filhos', 'lar', 'casa', 'esposo', 'esposa', 'casamento'],
            'Salvação' => ['salvação', 'salvar', 'salvo', 'vida eterna', 'graça', 'redenção', 'cruz', 'arrependa', 'arrependimento'],
            'Volta de Jesus' => ['voltarei', 'voltará', 'vinda', 'venho sem demora', 'arrebat', 'nuvens', 'volta'],
            'Consolo' => ['consolo', 'paz', 'não temas', 'não tenha medo', 'cuidarei', 'descanso', 'alívio'],
            'Coragem' => ['coragem', 'forte', 'fortaleça', 'não temas', 'não tenha medo', 'valente', 'ânimo'],
            'Sabedoria' => ['sabedoria', 'entendimento', 'ensina', 'caminho', 'verdade', 'prudência', 'discernimento'],
        ];

        $scores = [];
        foreach ($cats as $cat => $keywords) {
            $score = 0;
            foreach ($keywords as $kw) {
                if (Str::contains(mb_strtolower($t), mb_strtolower((string) $kw))) {
                    $score += 2;
                }
            }
            if ($cat !== 'Família' && preg_match('/\b(deus|senhor|jesus|cristo)\b/u', $t)) {
                $score += 1;
            }
            $scores[$cat] = $score;
        }

        return $scores;
    }
}
