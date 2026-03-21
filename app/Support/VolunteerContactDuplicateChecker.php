<?php

namespace App\Support;

use App\Models\Church;
use App\Models\Member;
use App\Models\User;
use App\Models\Volunteer;
use Illuminate\Http\Request;

class VolunteerContactDuplicateChecker
{
    public static function churchId(Request $request): ?int
    {
        return Church::resolveWorkingId($request)
            ?? Church::where('active', true)->orderBy('name')->value('id');
    }

    public static function normalizeEmail(?string $email): ?string
    {
        if ($email === null) {
            return null;
        }
        $t = trim($email);
        if ($t === '') {
            return null;
        }

        return mb_strtolower($t);
    }

    public static function normalizePhone(?string $phone): ?string
    {
        if ($phone === null) {
            return null;
        }
        $digits = preg_replace('/\D+/', '', $phone);
        if ($digits === '' || strlen($digits) < 8) {
            return null;
        }

        return $digits;
    }

    /**
     * E-mail já usado por outro utilizador, membro ou voluntário (âmbito igreja atual).
     *
     * @param  int|null  $excludeVolunteerId  voluntário em edição
     * @param  int|null  $excludeMemberId  membro vinculado ao voluntário atual
     * @param  int|null  $excludeUserId  utilizador vinculado ao voluntário atual
     */
    public static function emailConflicts(
        Request $request,
        string $emailNorm,
        ?int $excludeVolunteerId = null,
        ?int $excludeMemberId = null,
        ?int $excludeUserId = null,
    ): ?string {
        $churchId = self::churchId($request);
        if ($churchId === null) {
            return null;
        }

        $userQ = User::query()->whereRaw('LOWER(TRIM(COALESCE(email, ""))) = ?', [$emailNorm]);
        if ($excludeUserId) {
            $userQ->where('id', '!=', $excludeUserId);
        }
        if ($userQ->exists()) {
            return 'Este e-mail já está registado a outro utilizador.';
        }

        $memberQ = Member::query()
            ->where('church_id', $churchId)
            ->whereRaw('LOWER(TRIM(COALESCE(email, ""))) = ?', [$emailNorm]);
        if ($excludeMemberId) {
            $memberQ->where('id', '!=', $excludeMemberId);
        }
        if ($memberQ->exists()) {
            return 'Este e-mail já está associado a outro membro nesta igreja.';
        }

        $volQ = Volunteer::query()
            ->whereRaw('LOWER(TRIM(COALESCE(email, ""))) = ?', [$emailNorm])
            ->where(function ($q) use ($churchId) {
                $q->whereHas('member', fn ($m) => $m->where('church_id', $churchId))
                    ->orWhereHas('ministries', fn ($mq) => $mq->where('church_id', $churchId));
            });
        if ($excludeVolunteerId) {
            $volQ->where('id', '!=', $excludeVolunteerId);
        }
        if ($volQ->exists()) {
            return 'Este e-mail já está associado a outro voluntário nesta igreja.';
        }

        return null;
    }

    /**
     * Telefone já usado por outro membro ou voluntário (âmbito igreja atual).
     *
     * @param  int|null  $excludeVolunteerId
     * @param  int|null  $excludeMemberId
     */
    public static function phoneConflicts(
        Request $request,
        string $phoneNorm,
        ?int $excludeVolunteerId = null,
        ?int $excludeMemberId = null,
    ): ?string {
        $churchId = self::churchId($request);
        if ($churchId === null) {
            return null;
        }

        $members = Member::query()
            ->where('church_id', $churchId)
            ->when($excludeMemberId, fn ($q) => $q->where('id', '!=', $excludeMemberId))
            ->get(['id', 'phone']);

        foreach ($members as $m) {
            if (self::normalizePhone($m->phone) === $phoneNorm) {
                return 'Este telefone já está associado a outro membro nesta igreja.';
            }
        }

        $volunteers = Volunteer::query()
            ->where(function ($q) use ($churchId) {
                $q->whereHas('member', fn ($m) => $m->where('church_id', $churchId))
                    ->orWhereHas('ministries', fn ($mq) => $mq->where('church_id', $churchId));
            })
            ->when($excludeVolunteerId, fn ($q) => $q->where('id', '!=', $excludeVolunteerId))
            ->get(['id', 'phone']);

        foreach ($volunteers as $v) {
            if (self::normalizePhone($v->phone) === $phoneNorm) {
                return 'Este telefone já está associado a outro voluntário nesta igreja.';
            }
        }

        return null;
    }

    /**
     * Cadastro público: utilizadores já cobertos por unique:users; aqui só membro/voluntário na igreja.
     */
    public static function emailConflictsMemberVolunteerForChurch(int $churchId, string $emailNorm): ?string
    {
        if (Member::query()
            ->where('church_id', $churchId)
            ->whereRaw('LOWER(TRIM(COALESCE(email, ""))) = ?', [$emailNorm])
            ->exists()) {
            return 'Este e-mail já está associado a outro membro nesta igreja.';
        }

        if (Volunteer::query()
            ->whereRaw('LOWER(TRIM(COALESCE(email, ""))) = ?', [$emailNorm])
            ->where(function ($q) use ($churchId) {
                $q->whereHas('member', fn ($m) => $m->where('church_id', $churchId))
                    ->orWhereHas('ministries', fn ($mq) => $mq->where('church_id', $churchId));
            })
            ->exists()) {
            return 'Este e-mail já está associado a outro voluntário nesta igreja.';
        }

        return null;
    }

    public static function phoneConflictsForChurch(int $churchId, string $phoneNorm): ?string
    {
        $members = Member::query()->where('church_id', $churchId)->get(['id', 'phone']);
        foreach ($members as $m) {
            if (self::normalizePhone($m->phone) === $phoneNorm) {
                return 'Este telefone já está associado a outro membro nesta igreja.';
            }
        }

        $volunteers = Volunteer::query()
            ->where(function ($q) use ($churchId) {
                $q->whereHas('member', fn ($m) => $m->where('church_id', $churchId))
                    ->orWhereHas('ministries', fn ($mq) => $mq->where('church_id', $churchId));
            })
            ->get(['id', 'phone']);

        foreach ($volunteers as $v) {
            if (self::normalizePhone($v->phone) === $phoneNorm) {
                return 'Este telefone já está associado a outro voluntário nesta igreja.';
            }
        }

        return null;
    }

    /**
     * E-mail de acesso ao app (pode diferir do e-mail de contacto do voluntário).
     */
    public static function appEmailConflicts(
        Request $request,
        string $emailNorm,
        ?int $excludeVolunteerId = null,
        ?int $excludeMemberId = null,
        ?int $excludeUserId = null,
    ): ?string {
        return self::emailConflicts($request, $emailNorm, $excludeVolunteerId, $excludeMemberId, $excludeUserId);
    }
}
