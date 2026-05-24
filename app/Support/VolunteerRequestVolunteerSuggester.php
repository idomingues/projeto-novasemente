<?php

namespace App\Support;

use App\Models\ChurchSolicitation;
use App\Models\Ministry;
use App\Models\ScheduleRole;
use App\Models\Volunteer;
use App\Models\VolunteerMinistryInvitation;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Ranqueia voluntários para um pedido com base no departamento, função, observações
 * e campos do questionário (regras locais + correspondência de texto).
 */
final class VolunteerRequestVolunteerSuggester
{
    private const int MAX_SUGGESTIONS = 10;

    private const int MIN_SCORE_TO_LIST = 12;

    /** @var list<string> */
    private const STOPWORDS = [
        'de', 'da', 'do', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas', 'para', 'com', 'sem',
        'um', 'uma', 'uns', 'umas', 'o', 'a', 'os', 'as', 'e', 'ou', 'que', 'por', 'se', 'ao',
        'aos', 'à', 'às', 'pelo', 'pela', 'pelos', 'pelas', 'este', 'esta', 'esse', 'essa',
    ];

    /**
     * @return array{
     *     suggestions: list<array{
     *         id: int,
     *         name: string,
     *         email: string|null,
     *         score: int,
     *         reasons: list<string>,
     *         stageName: string,
     *         clearanceStatus: string|null,
     *         interestPreview: string|null,
     *         ministryNames: list<string>
     *     }>,
     *     ministryName: string|null,
     *     roleName: string|null,
     *     candidatesEvaluated: int,
     *     message: string|null
     * }
     */
    public static function suggest(ChurchSolicitation $solicitation, int $churchId): array
    {
        if (! VolunteerChurchRosterBuilder::volunteersTableExists()) {
            return self::emptyPayload(null, null, 0, 'Cadastro de voluntários indisponível.');
        }

        $meta = $solicitation->meta ?? [];
        $ministryId = isset($meta['ministry_id']) ? (int) $meta['ministry_id'] : 0;
        if ($ministryId <= 0) {
            return self::emptyPayload(null, null, 0, 'Defina o departamento no pedido antes de usar sugestões.');
        }

        $ministry = Ministry::query()->where('church_id', $churchId)->whereKey($ministryId)->first();
        if (! $ministry) {
            return self::emptyPayload(null, null, 0, 'Departamento do pedido não encontrado nesta igreja.');
        }

        $scheduleRoleId = isset($meta['schedule_role_id']) ? (int) $meta['schedule_role_id'] : 0;
        $roleName = null;
        if ($scheduleRoleId > 0) {
            $roleName = ScheduleRole::query()
                ->where('ministry_id', $ministryId)
                ->whereKey($scheduleRoleId)
                ->value('name');
            $roleName = is_string($roleName) && trim($roleName) !== '' ? trim($roleName) : null;
        }

        $searchTerms = self::buildSearchTerms(
            (string) $solicitation->subject,
            (string) $solicitation->message,
            (string) $ministry->name,
            $roleName,
        );

        $volunteers = self::candidateQuery($churchId)
            ->with([
                'ministries' => fn ($m) => $m->where('church_id', $churchId),
                'churchPipelines' => fn ($p) => $p->where('church_id', $churchId)->with('stage'),
            ])
            ->orderBy('volunteers.name')
            ->limit(400)
            ->get();

        $volunteerIds = $volunteers->pluck('id')->map(fn ($id) => (int) $id)->values()->all();
        $blockingByVolunteer = VolunteerMinistryInvitation::blockingMinistryIdsByVolunteerIds($churchId, $volunteerIds);

        $scored = [];
        foreach ($volunteers as $volunteer) {
            $evaluation = self::scoreVolunteer(
                $volunteer,
                $churchId,
                $ministry,
                $roleName,
                $searchTerms,
                $blockingByVolunteer[(int) $volunteer->id] ?? [],
            );
            if ($evaluation === null) {
                continue;
            }
            $scored[] = $evaluation;
        }

        usort($scored, fn (array $a, array $b) => $b['score'] <=> $a['score'] ?: strcmp($a['name'], $b['name']));

        $filtered = array_values(array_filter($scored, fn (array $row) => $row['score'] >= self::MIN_SCORE_TO_LIST));
        $top = array_slice($filtered, 0, self::MAX_SUGGESTIONS);

        $message = null;
        if ($top === [] && $scored !== []) {
            $message = 'Nenhuma correspondência forte com o pedido. Revise o cadastro ou use Filtros para buscar manualmente.';
        } elseif ($top === []) {
            $message = 'Não há voluntários elegíveis para sugestão nesta igreja (ativos, não arquivados, sem bloqueio no departamento).';
        }

        return [
            'suggestions' => $top,
            'ministryName' => $ministry->name,
            'roleName' => $roleName,
            'candidatesEvaluated' => count($scored),
            'message' => $message,
        ];
    }

    /**
     * @return Builder<Volunteer>
     */
    private static function candidateQuery(int $churchId): Builder
    {
        $q = VolunteerChurchRosterBuilder::volunteersVisibleInChurchQuery($churchId)
            ->where(function ($activeQ): void {
                $activeQ->where('volunteers.active', true)->orWhereNull('volunteers.active');
            });

        if (Schema::hasTable('volunteer_church_pipelines') && Schema::hasColumn('volunteer_church_pipelines', 'staff_archived_at')) {
            $q->whereDoesntHave('churchPipelines', function ($pipeQ) use ($churchId): void {
                $pipeQ->where('church_id', $churchId)->whereNotNull('staff_archived_at');
            });
        }

        return $q;
    }

    /**
     * @param  list<string>  $searchTerms
     * @param  list<int>  $blockingMinistryIds
     * @return array{
     *     id: int,
     *     name: string,
     *     email: string|null,
     *     score: int,
     *     reasons: list<string>,
     *     stageName: string,
     *     clearanceStatus: string|null,
     *     interestPreview: string|null,
     *     ministryNames: list<string>
     * }|null
     */
    private static function scoreVolunteer(
        Volunteer $volunteer,
        int $churchId,
        Ministry $ministry,
        ?string $roleName,
        array $searchTerms,
        array $blockingMinistryIds,
    ): ?array {
        $ministryId = (int) $ministry->id;

        if (in_array($ministryId, $blockingMinistryIds, true)) {
            return null;
        }

        $pivot = $volunteer->ministries->firstWhere('id', $ministryId);
        $clearance = is_string($pivot?->pivot?->clearance_status ?? null)
            ? (string) $pivot->pivot->clearance_status
            : null;

        if ($clearance === 'blocked') {
            return null;
        }

        $stageName = self::stageNameForVolunteer($volunteer, $churchId);
        if (self::isRefusalStage($stageName)) {
            return null;
        }

        $score = 0;
        /** @var list<string> $reasons */
        $reasons = [];

        if ($pivot !== null) {
            $score += 38;
            $reasons[] = 'Já vinculado ao departamento «'.$ministry->name.'».';
            if ($clearance === 'cleared') {
                $score += 32;
                $reasons[] = 'Liberação concedida para servir neste departamento.';
            } elseif ($clearance === 'pending') {
                $score += 10;
                $reasons[] = 'No departamento; liberação ainda pendente.';
            }
        }

        $stageBonus = self::stageScoreBonus($stageName);
        if ($stageBonus !== null && $stageBonus['points'] > 0) {
            $score += $stageBonus['points'];
            $reasons[] = $stageBonus['reason'];
        }

        $signals = VolunteerRosterSignals::forVolunteer($volunteer);
        if ($signals['memberNs']) {
            $score += 8;
            $reasons[] = 'Membro oficial com registro na Nova Semente.';
        }
        if ($signals['sixMonthsInChurchOrLetter']) {
            $score += 6;
            $reasons[] = 'Frequenta há pelo menos 6 meses (conta na app).';
        }
        if ($signals['ministryExperienceDeclared']) {
            $score += 14;
            $reasons[] = 'Declarou experiência anterior em ministério.';
        }

        if ((bool) $volunteer->has_whatsapp) {
            $score += 4;
            $reasons[] = 'Indicou WhatsApp no cadastro.';
        }

        if ($volunteer->lgpd_data_consent === false) {
            $score -= 25;
            $reasons[] = 'Sem consentimento LGPD registrado.';
        }

        if ((bool) $volunteer->needs_pastoral_guidance) {
            $score -= 6;
            $reasons[] = 'Pediu orientação pastoral no questionário (avaliar com o pastor).';
        }

        $interestBlob = self::volunteerInterestBlob($volunteer);
        $textMatches = self::countTermMatches($searchTerms, $interestBlob);
        if ($textMatches > 0) {
            $textPoints = min(28, 10 + ($textMatches * 6));
            $score += $textPoints;
            $reasons[] = 'Interesses ou experiência no cadastro combinam com o pedido ('.$textMatches.' termo(s)).';
        }

        if ($roleName !== null && self::textContainsNormalized($interestBlob, $roleName)) {
            $score += 12;
            $reasons[] = 'Citou algo relacionado à função «'.$roleName.'».';
        }

        $name = trim((string) ($volunteer->name ?? '')) ?: 'Voluntário #'.$volunteer->id;

        return [
            'id' => (int) $volunteer->id,
            'name' => $name,
            'email' => is_string($volunteer->email) && trim($volunteer->email) !== '' ? trim($volunteer->email) : null,
            'score' => max(0, $score),
            'reasons' => array_values(array_unique($reasons)),
            'stageName' => $stageName,
            'clearanceStatus' => $clearance,
            'interestPreview' => self::truncateInterestPreview($volunteer),
            'ministryNames' => $volunteer->ministries->pluck('name')->values()->all(),
            'profile' => VolunteerQuestionnaireProfilePayload::fromVolunteer($volunteer),
        ];
    }

    private static function stageNameForVolunteer(Volunteer $volunteer, int $churchId): string
    {
        $pipe = $volunteer->churchPipelines->firstWhere('church_id', $churchId);

        return trim((string) ($pipe?->stage?->name ?? 'Não definido'));
    }

    private static function isRefusalStage(string $stageName): bool
    {
        $n = mb_strtolower(trim($stageName));

        return str_contains($n, 'recusado');
    }

    /**
     * @return array{points: int, reason: string}|null
     */
    private static function stageScoreBonus(string $stageName): ?array
    {
        $n = mb_strtolower(trim($stageName));

        return match (true) {
            str_contains($n, 'pronto para servir') => ['points' => 22, 'reason' => 'Fase «Pronto para servir» no pipeline.'],
            str_contains($n, 'a servir') => ['points' => 22, 'reason' => 'Fase «A servir» no pipeline.'],
            str_contains($n, 'em treinamento') => ['points' => 14, 'reason' => 'Fase «Em treinamento».'],
            str_contains($n, 'encaminhado') => ['points' => 8, 'reason' => 'Fase «Encaminhado».'],
            str_contains($n, 'interessado') => ['points' => 5, 'reason' => 'Fase «Interessado».'],
            str_contains($n, 'finalizado') => ['points' => 0, 'reason' => 'Fase «Finalizado».'],
            default => null,
        };
    }

    private static function volunteerInterestBlob(Volunteer $volunteer): string
    {
        return implode(' ', array_filter([
            $volunteer->ministry_involvement,
            $volunteer->other_ministry_interest,
            $volunteer->gifts_to_develop,
            $volunteer->previous_ministry_details,
            $volunteer->professional_area,
            $volunteer->role,
        ], fn ($t) => is_string($t) && trim($t) !== ''));
    }

    /**
     * @return list<string>
     */
    private static function buildSearchTerms(string $subject, string $message, string $ministryName, ?string $roleName): array
    {
        $raw = implode(' ', array_filter([$subject, $message, $ministryName, $roleName ?? '']));
        $tokens = preg_split('/[\s,;.!?()[\]{}"\'«»\/\-–—]+/u', self::normalize($raw)) ?: [];
        $terms = [];
        foreach ($tokens as $token) {
            $token = trim($token);
            if (mb_strlen($token) < 3) {
                continue;
            }
            if (in_array($token, self::STOPWORDS, true)) {
                continue;
            }
            $terms[] = $token;
        }

        foreach (preg_split('/[\s\-–—]+/u', self::normalize($ministryName)) ?: [] as $part) {
            $part = trim($part);
            if (mb_strlen($part) >= 3 && ! in_array($part, self::STOPWORDS, true)) {
                $terms[] = $part;
            }
        }

        return array_values(array_unique($terms));
    }

    /**
     * @param  list<string>  $terms
     */
    private static function countTermMatches(array $terms, string $haystack): int
    {
        if ($terms === [] || trim($haystack) === '') {
            return 0;
        }

        $normalizedHaystack = self::normalize($haystack);
        $count = 0;
        foreach ($terms as $term) {
            if ($term !== '' && str_contains($normalizedHaystack, $term)) {
                $count++;
            }
        }

        return $count;
    }

    private static function textContainsNormalized(string $haystack, string $needle): bool
    {
        $n = self::normalize($needle);
        if ($n === '') {
            return false;
        }

        return str_contains(self::normalize($haystack), $n);
    }

    private static function normalize(string $text): string
    {
        $text = mb_strtolower(trim($text));
        $ascii = Str::ascii($text);

        return $ascii !== '' ? $ascii : $text;
    }

    private static function truncateInterestPreview(Volunteer $volunteer): ?string
    {
        $parts = array_filter([
            $volunteer->other_ministry_interest,
            $volunteer->ministry_involvement,
            $volunteer->gifts_to_develop,
        ], fn ($t) => is_string($t) && trim($t) !== '');

        if ($parts === []) {
            return null;
        }

        $text = implode(' · ', array_map(fn ($p) => trim((string) $p), $parts));

        return mb_strlen($text) > 120 ? mb_substr($text, 0, 117).'…' : $text;
    }

    /**
     * @return array{
     *     suggestions: list<empty>,
     *     ministryName: string|null,
     *     roleName: string|null,
     *     candidatesEvaluated: int,
     *     message: string|null
     * }
     */
    private static function emptyPayload(?string $ministryName, ?string $roleName, int $evaluated, ?string $message): array
    {
        return [
            'suggestions' => [],
            'ministryName' => $ministryName,
            'roleName' => $roleName,
            'candidatesEvaluated' => $evaluated,
            'message' => $message,
        ];
    }
}
