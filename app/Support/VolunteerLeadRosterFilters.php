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

        foreach ([
            'has_whatsapp',
            'has_social_networks',
            'is_official_member',
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

        $att = trim((string) $request->input('attendance_duration', ''));
        if ($att !== '') {
            $q->where('attendance_duration', 'like', '%'.$att.'%');
        }

        $cf = trim((string) $request->input('created_from', ''));
        if ($cf !== '' && strtotime($cf) !== false) {
            $q->whereDate('volunteers.created_at', '>=', $cf);
        }
        $ct = trim((string) $request->input('created_to', ''));
        if ($ct !== '' && strtotime($ct) !== false) {
            $q->whereDate('volunteers.created_at', '<=', $ct);
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
            'has_whatsapp' => (string) $request->input('has_whatsapp', ''),
            'has_social_networks' => (string) $request->input('has_social_networks', ''),
            'is_official_member' => (string) $request->input('is_official_member', ''),
            'has_previous_ministry_volunteer_experience' => (string) $request->input('has_previous_ministry_volunteer_experience', ''),
            'needs_pastoral_guidance' => (string) $request->input('needs_pastoral_guidance', ''),
            'lgpd_data_consent' => (string) $request->input('lgpd_data_consent', ''),
            'active' => (string) $request->input('active', ''),
            'app_access_only' => (string) $request->input('app_access_only', ''),
            'attendance_duration' => trim((string) $request->input('attendance_duration', '')),
            'created_from' => trim((string) $request->input('created_from', '')),
            'created_to' => trim((string) $request->input('created_to', '')),
            'text_interest' => trim((string) $request->input('text_interest', '')),
            'pipeline_stage_id' => (string) $request->input('pipeline_stage_id', ''),
        ];
    }
}
