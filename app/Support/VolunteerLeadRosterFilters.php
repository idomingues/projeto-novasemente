<?php

namespace App\Support;

use App\Models\Volunteer;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class VolunteerLeadRosterFilters
{
    /**
     * @param  Builder<Volunteer>  $q
     */
    public static function apply(Request $request, Builder $q, int $churchId): void
    {
        $search = trim((string) $request->input('search', ''));
        if ($search !== '') {
            $q->where(function ($sub) use ($search) {
                $sub->where('name', 'like', '%'.$search.'%')
                    ->orWhere('email', 'like', '%'.$search.'%')
                    ->orWhere('phone', 'like', '%'.$search.'%');
            });
        }

        $hasUserAccount = $request->input('has_user_account');
        if ($hasUserAccount === '0' || $hasUserAccount === '1' || $hasUserAccount === 0 || $hasUserAccount === 1) {
            if ((bool) (int) $hasUserAccount) {
                $q->whereNotNull('user_id');
            } else {
                $q->whereNull('user_id');
            }
        }

        foreach ([
            'has_whatsapp',
            'has_social_networks',
            'is_official_member',
            'member_record_at_nova_semente',
            'has_previous_ministry_volunteer_experience',
            'needs_pastoral_guidance',
            'lgpd_data_consent',
            'active',
            'app_access_only',
        ] as $boolField) {
            $v = $request->input($boolField);
            if ($v === '0' || $v === '1' || $v === 0 || $v === 1) {
                $q->where($boolField, (bool) (int) $v);
            }
        }

        $role = trim((string) $request->input('role', ''));
        if ($role !== '' && mb_strlen($role) >= 2) {
            $q->where('role', 'like', '%'.$role.'%');
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

        $att = trim((string) $request->input('attendance_duration', ''));
        if ($att !== '') {
            // Se o valor for um dos slugs do cadastro, filtra por igualdade (melhor UX em select).
            // Caso contrário, permite busca livre (compatibilidade com dados antigos).
            $known = [
                'less_than_3_months',
                'months_3_6',
                'months_6_12',
                'years_1_3',
                'more_than_3_years',
            ];
            if (in_array($att, $known, true)) {
                $q->where('attendance_duration', $att);
            } else {
                $q->where('attendance_duration', 'like', '%'.$att.'%');
            }
        }

        $attText = trim((string) $request->input('attendance_duration_text', ''));
        if ($attText !== '' && mb_strlen($attText) >= 2) {
            $q->where('attendance_duration', 'like', '%'.$attText.'%');
        }

        $cf = trim((string) $request->input('created_from', ''));
        if ($cf !== '' && strtotime($cf) !== false) {
            $q->whereDate('volunteers.created_at', '>=', $cf);
        }
        $ct = trim((string) $request->input('created_to', ''));
        if ($ct !== '' && strtotime($ct) !== false) {
            $q->whereDate('volunteers.created_at', '<=', $ct);
        }

        $bf = trim((string) $request->input('birth_date_from', ''));
        if ($bf !== '' && strtotime($bf) !== false) {
            $q->whereDate('volunteers.birth_date', '>=', $bf);
        }
        $bt = trim((string) $request->input('birth_date_to', ''));
        if ($bt !== '' && strtotime($bt) !== false) {
            $q->whereDate('volunteers.birth_date', '<=', $bt);
        }

        $rc = trim((string) $request->input('member_record_church', ''));
        if ($rc !== '' && mb_strlen($rc) >= 2) {
            $q->where('member_record_church', 'like', '%'.$rc.'%');
        }

        $pa = trim((string) $request->input('professional_area', ''));
        if ($pa !== '' && mb_strlen($pa) >= 2) {
            $q->where('professional_area', 'like', '%'.$pa.'%');
        }

        $ministryIdsRaw = $request->input('ministry_ids', []);
        $ministryIds = [];
        if (is_string($ministryIdsRaw)) {
            $ministryIds = array_values(array_filter(array_map(
                fn ($x) => is_numeric($x) ? (int) $x : null,
                preg_split('/[,\s]+/', $ministryIdsRaw) ?: []
            )));
        } elseif (is_array($ministryIdsRaw)) {
            $ministryIds = array_values(array_filter(array_map(fn ($x) => is_numeric($x) ? (int) $x : null, $ministryIdsRaw)));
        }
        $ministryIds = array_values(array_unique(array_filter($ministryIds, fn ($x) => $x > 0)));
        if ($ministryIds !== []) {
            $q->whereHas('ministries', fn ($mq) => $mq->whereIn('ministries.id', $ministryIds)->where('church_id', $churchId));
        }

        $ti = trim((string) $request->input('text_interest', ''));
        if ($ti !== '' && mb_strlen($ti) >= 2) {
            $like = '%'.$ti.'%';
            $q->where(function ($sub) use ($like) {
                $sub->where('ministry_involvement', 'like', $like)
                    ->orWhere('other_ministry_interest', 'like', $like)
                    ->orWhere('gifts_to_develop', 'like', $like)
                    ->orWhere('previous_ministry_details', 'like', $like);
            });
        }

        $sid = $request->input('pipeline_stage_id');
        if ($sid !== null && $sid !== '' && is_numeric($sid)) {
            $q->whereHas('churchPipelines', fn ($p) => $p->where('church_id', $churchId)->where('stage_id', (int) $sid));
        }
    }

    /**
     * @return array<string, string>
     */
    public static function filterState(Request $request): array
    {
        return [
            'search' => trim((string) $request->input('search', '')),
            'has_user_account' => (string) $request->input('has_user_account', ''),
            'has_whatsapp' => (string) $request->input('has_whatsapp', ''),
            'has_social_networks' => (string) $request->input('has_social_networks', ''),
            'is_official_member' => (string) $request->input('is_official_member', ''),
            'member_record_at_nova_semente' => (string) $request->input('member_record_at_nova_semente', ''),
            'has_previous_ministry_volunteer_experience' => (string) $request->input('has_previous_ministry_volunteer_experience', ''),
            'needs_pastoral_guidance' => (string) $request->input('needs_pastoral_guidance', ''),
            'lgpd_data_consent' => (string) $request->input('lgpd_data_consent', ''),
            'active' => (string) $request->input('active', ''),
            'app_access_only' => (string) $request->input('app_access_only', ''),
            'role' => trim((string) $request->input('role', '')),
            'has_email' => (string) $request->input('has_email', ''),
            'has_phone' => (string) $request->input('has_phone', ''),
            'has_birth_date' => (string) $request->input('has_birth_date', ''),
            'attendance_duration' => trim((string) $request->input('attendance_duration', '')),
            'attendance_duration_text' => trim((string) $request->input('attendance_duration_text', '')),
            'created_from' => trim((string) $request->input('created_from', '')),
            'created_to' => trim((string) $request->input('created_to', '')),
            'birth_date_from' => trim((string) $request->input('birth_date_from', '')),
            'birth_date_to' => trim((string) $request->input('birth_date_to', '')),
            'member_record_church' => trim((string) $request->input('member_record_church', '')),
            'professional_area' => trim((string) $request->input('professional_area', '')),
            'ministry_ids' => (string) $request->input('ministry_ids', ''),
            'text_interest' => trim((string) $request->input('text_interest', '')),
            'pipeline_stage_id' => (string) $request->input('pipeline_stage_id', ''),
        ];
    }
}
