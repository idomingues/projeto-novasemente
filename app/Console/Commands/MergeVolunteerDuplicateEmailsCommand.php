<?php

namespace App\Console\Commands;

use App\Models\Church;
use App\Models\Volunteer;
use App\Support\VolunteerChurchRosterBuilder;
use Illuminate\Console\Attributes\AsCommand;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Junta registos de voluntário com o mesmo e-mail (normalizado) dentro do âmbito visível da igreja.
 * Ignora grupos com mais do que um `user_id` distinto não nulo.
 */
#[AsCommand(
    name: 'volunteers:merge-duplicate-emails',
    description: 'Junta voluntários duplicados pelo mesmo e-mail (âmbito da igreja).',
)]
class MergeVolunteerDuplicateEmailsCommand extends Command
{
    protected $signature = 'volunteers:merge-duplicate-emails
                            {--church= : ID da igreja (obrigatório se existir mais do que uma igreja)}
                            {--dry-run : Apenas listar o que seria feito}';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $churchOption = $this->option('church');
        $churchId = $churchOption !== null && $churchOption !== ''
            ? (int) $churchOption
            : null;

        if ($churchId === null) {
            if (Church::query()->count() <= 1) {
                $churchId = (int) Church::query()->value('id');
            } else {
                $this->error('Indique --church=<id> quando existir mais do que uma igreja.');

                return self::FAILURE;
            }
        }

        if (! Church::query()->whereKey($churchId)->exists()) {
            $this->error("Igreja #{$churchId} não encontrada.");

            return self::FAILURE;
        }

        $scopeIds = VolunteerChurchRosterBuilder::volunteersVisibleInChurchQuery($churchId)
            ->pluck('volunteers.id');

        /** @var \Illuminate\Support\Collection<int, Volunteer> $volunteers */
        $volunteers = Volunteer::query()
            ->whereIn('id', $scopeIds)
            ->whereNotNull('email')
            ->where('email', '!=', '')
            ->orderBy('id')
            ->get();

        /** @var array<string, list<Volunteer>> $groups */
        $groups = [];
        foreach ($volunteers as $v) {
            $key = $this->normalizeEmail((string) $v->email);
            if ($key === '') {
                continue;
            }
            $groups[$key] ??= [];
            $groups[$key][] = $v;
        }

        $mergedGroups = 0;
        $mergedRows = 0;

        foreach ($groups as $emailKey => $list) {
            if (count($list) < 2) {
                continue;
            }

            $nonNullUserIds = collect($list)
                ->pluck('user_id')
                ->filter(fn ($id) => $id !== null)
                ->unique()
                ->values();

            if ($nonNullUserIds->count() > 1) {
                $ids = collect($list)->pluck('id')->implode(', ');
                $this->warn("Ignorado (vários user_id): e-mail «{$emailKey}» — voluntários: {$ids}");

                continue;
            }

            usort($list, function (Volunteer $a, Volunteer $b) {
                $aHas = $a->user_id !== null ? 0 : 1;
                $bHas = $b->user_id !== null ? 0 : 1;
                if ($aHas !== $bHas) {
                    return $aHas <=> $bHas;
                }

                return $a->id <=> $b->id;
            });

            $keeper = $list[0];
            $dupes = array_slice($list, 1);

            foreach ($dupes as $dupe) {
                $this->line(($dryRun ? '[dry-run] ' : '')."{$emailKey}: manter #{$keeper->id}, remover #{$dupe->id}");
                if (! $dryRun) {
                    DB::transaction(fn () => $this->mergeOneVolunteerInto($keeper->id, $dupe->id));
                    $keeper->refresh();
                }
                $mergedRows++;
            }
            $mergedGroups++;
        }

        if ($mergedRows === 0) {
            $this->info($dryRun ? 'Nada a fundir (dry-run).' : 'Nenhum duplicado encontrado no âmbito da igreja.');

            return self::SUCCESS;
        }

        $this->info($dryRun
            ? "Dry-run: {$mergedGroups} grupo(s), {$mergedRows} remoção(ões) prevista(s). Execute sem --dry-run para aplicar."
            : "Concluído: {$mergedGroups} grupo(s), {$mergedRows} voluntário(s) fundido(s).");

        return self::SUCCESS;
    }

    private function normalizeEmail(string $email): string
    {
        return mb_strtolower(trim($email));
    }

    private function mergeOneVolunteerInto(int $keeperId, int $dupeId): void
    {
        $keeper = Volunteer::query()->findOrFail($keeperId);
        $dupe = Volunteer::query()->findOrFail($dupeId);

        if ($keeper->user_id === null && $dupe->user_id !== null) {
            $keeper->forceFill(['user_id' => $dupe->user_id])->save();
        }

        $this->fillKeeperGapsFromDupe($keeper, $dupe);

        if (Schema::hasTable('ministry_volunteer')) {
            $this->reassignPivotPreferKeeper('ministry_volunteer', $keeperId, $dupeId, ['ministry_id']);
        }

        if (Schema::hasTable('volunteer_clearance_checks')) {
            $this->reassignPivotPreferKeeper('volunteer_clearance_checks', $keeperId, $dupeId, ['ministry_id', 'criterion_id']);
        }

        if (Schema::hasTable('volunteer_church_pipelines')) {
            foreach (DB::table('volunteer_church_pipelines')->where('volunteer_id', $dupeId)->get() as $row) {
                $exists = DB::table('volunteer_church_pipelines')
                    ->where('volunteer_id', $keeperId)
                    ->where('church_id', $row->church_id)
                    ->exists();
                if ($exists) {
                    DB::table('volunteer_church_pipelines')->where('id', $row->id)->delete();
                } else {
                    DB::table('volunteer_church_pipelines')->where('id', $row->id)->update(['volunteer_id' => $keeperId]);
                }
            }
        }

        if (Schema::hasTable('volunteer_leader_notes')) {
            DB::table('volunteer_leader_notes')->where('volunteer_id', $dupeId)->update(['volunteer_id' => $keeperId]);
        }

        if (Schema::hasTable('volunteer_ministry_invitations')) {
            DB::table('volunteer_ministry_invitations')->where('volunteer_id', $dupeId)->update(['volunteer_id' => $keeperId]);
        }

        if (Schema::hasTable('volunteer_ministry_invitation_status_histories')) {
            DB::table('volunteer_ministry_invitation_status_histories')->where('volunteer_id', $dupeId)->update(['volunteer_id' => $keeperId]);
        }

        if (Schema::hasTable('schedule_assignments')) {
            DB::table('schedule_assignments')->where('volunteer_id', $dupeId)->update(['volunteer_id' => $keeperId]);
        }

        if (Schema::hasTable('service_schedules')) {
            DB::table('service_schedules')->where('volunteer_id', $dupeId)->update(['volunteer_id' => $keeperId]);
        }

        if (Schema::hasTable('church_solicitations')) {
            DB::table('church_solicitations')->where('assigned_volunteer_id', $dupeId)->update(['assigned_volunteer_id' => $keeperId]);
        }

        if (Schema::hasTable('churches')) {
            DB::table('churches')->where('solicitations_handler_volunteer_id', $dupeId)->update(['solicitations_handler_volunteer_id' => $keeperId]);
        }

        $dupe->delete();
    }

    /**
     * @param  list<string>  $otherKeyColumns
     */
    private function reassignPivotPreferKeeper(string $table, int $keeperId, int $dupeId, array $otherKeyColumns): void
    {
        foreach (DB::table($table)->where('volunteer_id', $dupeId)->get() as $row) {
            $q = DB::table($table)->where('volunteer_id', $keeperId);
            foreach ($otherKeyColumns as $col) {
                $q->where($col, $row->{$col});
            }
            if ($q->exists()) {
                DB::table($table)->where('id', $row->id)->delete();
            } else {
                DB::table($table)->where('id', $row->id)->update(['volunteer_id' => $keeperId]);
            }
        }
    }

    private function fillKeeperGapsFromDupe(Volunteer $keeper, Volunteer $dupe): void
    {
        $stringFill = [
            'name', 'email', 'phone', 'role',
            'attendance_duration', 'previous_ministry_details', 'ministry_involvement',
            'other_ministry_interest', 'gifts_to_develop', 'professional_area',
            'member_record_church',
        ];

        $updates = [];
        foreach ($stringFill as $col) {
            $cur = $keeper->getAttribute($col);
            $incoming = $dupe->getAttribute($col);
            if (($cur === null || $cur === '') && $incoming !== null && $incoming !== '') {
                $updates[$col] = $incoming;
            }
        }

        if ($keeper->birth_date === null && $dupe->birth_date !== null) {
            $updates['birth_date'] = $dupe->birth_date;
        }

        $boolCols = [
            'has_whatsapp', 'has_social_networks', 'is_official_member',
            'member_record_at_nova_semente', 'has_previous_ministry_volunteer_experience',
            'needs_pastoral_guidance', 'lgpd_data_consent', 'active', 'app_access_only',
        ];
        foreach ($boolCols as $col) {
            if (! $keeper->getAttribute($col) && $dupe->getAttribute($col)) {
                $updates[$col] = true;
            }
        }

        if ($updates !== []) {
            $keeper->forceFill($updates)->save();
        }
    }
}
