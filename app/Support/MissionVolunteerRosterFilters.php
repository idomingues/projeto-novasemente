<?php

namespace App\Support;

use App\Models\MissionVolunteer;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class MissionVolunteerRosterFilters
{
    public const SORT_NAME = 'name';

    public const SORT_CREATED_AT = 'created_at';

    public const SORT_PHASE = 'phase';

    public const SORT_PHASE_ENTERED = 'phase_entered';

    public const DEFAULT_SORT = self::SORT_NAME;

    public const DEFAULT_SORT_DIR = 'asc';

    /**
     * @param  Builder<MissionVolunteer>  $q
     */
    public static function apply(Request $request, Builder $q): void
    {
        $search = trim((string) $request->input('search', ''));
        if ($search !== '') {
            SearchTerm::whereAnyColumnLike($q, ['full_name', 'email', 'phone'], $search);
        }

        foreach ([
            'has_belief',
            'participates_religion',
            'baptized',
            'first_time_nova_semente',
            'studied_bible_structured',
            'lgpd_consent',
        ] as $boolField) {
            self::applyTriStateBool($request, $q, $boolField);
        }

        foreach ([
            'has_email' => 'email',
            'has_phone' => 'phone',
            'has_birth_date' => 'birth_date',
        ] as $flag => $col) {
            $v = $request->input($flag);
            if ($v === '0' || $v === '1' || $v === 0 || $v === 1) {
                $yes = (bool) (int) $v;
                if ($yes) {
                    $q->whereNotNull($col);
                    if ($col !== 'birth_date') {
                        $q->whereRaw('TRIM(COALESCE('.$col.", '')) <> ''");
                    }
                } else {
                    $q->where(function ($sub) use ($col) {
                        $sub->whereNull($col);
                        if ($col !== 'birth_date') {
                            $sub->orWhereRaw('TRIM(COALESCE('.$col.", '')) = ''");
                        }
                    });
                }
            }
        }

        $profession = trim((string) $request->input('profession', ''));
        if ($profession !== '') {
            $known = config('mission.professions', []);
            if (is_array($known) && in_array($profession, $known, true)) {
                $q->where('profession', $profession);
            } elseif (mb_strlen($profession) >= 2) {
                $q->where('profession', 'like', '%'.$profession.'%');
            }
        }

        foreach ([
            'studied_bible' => 'studied_bible',
            'wants_bible_study_partner' => 'wants_bible_study_partner',
            'belief_which' => 'belief_which',
            'religion_which' => 'religion_which',
        ] as $input => $col) {
            $value = trim((string) $request->input($input, ''));
            if ($value !== '') {
                $q->where($col, $value);
            }
        }

        foreach (['profile_type', 'ministry_preference', 'engagement_level'] as $textCol) {
            $value = trim((string) $request->input($textCol, ''));
            if ($value !== '' && mb_strlen($value) >= 2) {
                $q->where($textCol, 'like', '%'.$value.'%');
            }
        }

        $cf = trim((string) $request->input('created_from', ''));
        if ($cf !== '' && strtotime($cf) !== false) {
            $q->whereDate('mission_volunteers.created_at', '>=', $cf);
        }
        $ct = trim((string) $request->input('created_to', ''));
        if ($ct !== '' && strtotime($ct) !== false) {
            $q->whereDate('mission_volunteers.created_at', '<=', $ct);
        }

        $bf = trim((string) $request->input('birth_date_from', ''));
        if ($bf !== '' && strtotime($bf) !== false) {
            $q->whereDate('mission_volunteers.birth_date', '>=', $bf);
        }
        $bt = trim((string) $request->input('birth_date_to', ''));
        if ($bt !== '' && strtotime($bt) !== false) {
            $q->whereDate('mission_volunteers.birth_date', '<=', $bt);
        }
    }

    /**
     * @param  Builder<MissionVolunteer>  $q
     */
    public static function applySort(Request $request, Builder $q): void
    {
        $sort = self::normalizedSort($request);
        $dir = self::normalizedSortDir($request);

        if ($sort === self::SORT_CREATED_AT) {
            $q->orderBy('mission_volunteers.created_at', $dir)->orderBy('mission_volunteers.full_name');

            return;
        }

        if ($sort === self::SORT_PHASE) {
            $q->leftJoin('mission_phases as roster_phase', 'mission_volunteers.mission_phase_id', '=', 'roster_phase.id')
                ->select('mission_volunteers.*')
                ->orderByRaw('COALESCE(roster_phase.sort_order, 999999) '.$dir)
                ->orderByRaw("COALESCE(NULLIF(TRIM(roster_phase.name), ''), 'zzz') {$dir}")
                ->orderBy('mission_volunteers.full_name');

            return;
        }

        if ($sort === self::SORT_PHASE_ENTERED) {
            $q->orderBy('mission_volunteers.phase_entered_at', $dir)
                ->orderBy('mission_volunteers.full_name');

            return;
        }

        $q->orderBy('mission_volunteers.full_name', $dir)->orderBy('mission_volunteers.id', $dir);
    }

    public static function normalizedSort(Request $request): string
    {
        $sort = trim((string) $request->input('sort', self::DEFAULT_SORT));

        return in_array($sort, [
            self::SORT_NAME,
            self::SORT_CREATED_AT,
            self::SORT_PHASE,
            self::SORT_PHASE_ENTERED,
        ], true) ? $sort : self::DEFAULT_SORT;
    }

    public static function normalizedSortDir(Request $request): string
    {
        $dir = strtolower(trim((string) $request->input('sort_dir', self::DEFAULT_SORT_DIR)));

        return $dir === 'desc' ? 'desc' : 'asc';
    }

    /**
     * @param  Builder<MissionVolunteer>  $q
     */
    private static function applyTriStateBool(Request $request, Builder $q, string $field): void
    {
        $v = $request->input($field);
        if ($v === '0' || $v === '1' || $v === 0 || $v === 1) {
            $q->where($field, (bool) (int) $v);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public static function filterState(Request $request): array
    {
        return [
            'search' => trim((string) $request->input('search', '')),
            'mission_phase_id' => trim((string) $request->input('mission_phase_id', '')),
            'overdue' => $request->boolean('overdue'),
            'has_app_account' => (string) $request->input('has_app_account', ''),
            'has_email' => (string) $request->input('has_email', ''),
            'has_phone' => (string) $request->input('has_phone', ''),
            'has_birth_date' => (string) $request->input('has_birth_date', ''),
            'has_belief' => (string) $request->input('has_belief', ''),
            'participates_religion' => (string) $request->input('participates_religion', ''),
            'baptized' => (string) $request->input('baptized', ''),
            'first_time_nova_semente' => (string) $request->input('first_time_nova_semente', ''),
            'studied_bible_structured' => (string) $request->input('studied_bible_structured', ''),
            'lgpd_consent' => (string) $request->input('lgpd_consent', ''),
            'studied_bible' => trim((string) $request->input('studied_bible', '')),
            'wants_bible_study_partner' => trim((string) $request->input('wants_bible_study_partner', '')),
            'belief_which' => trim((string) $request->input('belief_which', '')),
            'religion_which' => trim((string) $request->input('religion_which', '')),
            'profession' => trim((string) $request->input('profession', '')),
            'profile_type' => trim((string) $request->input('profile_type', '')),
            'ministry_preference' => trim((string) $request->input('ministry_preference', '')),
            'engagement_level' => trim((string) $request->input('engagement_level', '')),
            'created_from' => trim((string) $request->input('created_from', '')),
            'created_to' => trim((string) $request->input('created_to', '')),
            'birth_date_from' => trim((string) $request->input('birth_date_from', '')),
            'birth_date_to' => trim((string) $request->input('birth_date_to', '')),
            'sort' => self::normalizedSort($request),
            'sort_dir' => self::normalizedSortDir($request),
        ];
    }
}
