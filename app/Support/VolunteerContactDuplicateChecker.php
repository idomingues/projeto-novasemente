<?php

namespace App\Support;

use App\Models\Church;
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
     * E-mail já usado por outro usuário ou voluntário (âmbito igreja atual).
     *
     * @param  int|null  $excludeVolunteerId  voluntário em edição
     * @param  int|null  $excludeChurchUserId  usuário com ficha na igreja (excluir na verificação de duplicados)
     * @param  int|null  $excludeUserId  usuário vinculado ao voluntário atual
     */
    public static function emailConflicts(
        Request $request,
        string $emailNorm,
        ?int $excludeVolunteerId = null,
        ?int $excludeChurchUserId = null,
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
            return 'Este e-mail já está cadastrado a outro usuário.';
        }

        $volQ = Volunteer::query()
            ->whereRaw('LOWER(TRIM(COALESCE(email, ""))) = ?', [$emailNorm])
            ->where(function ($q) use ($churchId) {
                $q->whereHas('user', fn ($uq) => $uq->where('church_id', $churchId))
                    ->orWhereHas('ministries', fn ($mq) => $mq->where('church_id', $churchId));
            });
        if ($excludeVolunteerId) {
            $volQ->where('id', '!=', $excludeVolunteerId);
        }
        if ($volQ->exists()) {
            return 'Este e-mail já está associado a outro voluntário nesta igreja.';
        }

        $volNoScopeQ = Volunteer::query()
            ->whereRaw('LOWER(TRIM(COALESCE(email, ""))) = ?', [$emailNorm])
            ->whereNull('user_id')
            ->whereDoesntHave('ministries');
        if ($excludeVolunteerId) {
            $volNoScopeQ->where('id', '!=', $excludeVolunteerId);
        }
        if ($volNoScopeQ->exists()) {
            return 'Este e-mail já está associado a outro voluntário (sem departamento).';
        }

        return null;
    }

    /**
     * Telefone já usado por outro usuário ou voluntário (âmbito igreja atual).
     */
    public static function phoneConflicts(
        Request $request,
        string $phoneNorm,
        ?int $excludeVolunteerId = null,
        ?int $excludeChurchUserId = null,
    ): ?string {
        $churchId = self::churchId($request);
        if ($churchId === null) {
            return null;
        }

        $users = User::query()
            ->where('church_id', $churchId)
            ->when($excludeChurchUserId, fn ($q) => $q->where('id', '!=', $excludeChurchUserId))
            ->get(['id', 'phone']);

        foreach ($users as $u) {
            if (self::normalizePhone($u->phone) === $phoneNorm) {
                return 'Este telefone já está associado a outro usuário nesta igreja.';
            }
        }

        $volunteers = Volunteer::query()
            ->where(function ($q) use ($churchId) {
                $q->whereHas('user', fn ($uq) => $uq->where('church_id', $churchId))
                    ->orWhereHas('ministries', fn ($mq) => $mq->where('church_id', $churchId));
            })
            ->when($excludeVolunteerId, fn ($q) => $q->where('id', '!=', $excludeVolunteerId))
            ->get(['id', 'phone']);

        foreach ($volunteers as $v) {
            if (self::normalizePhone($v->phone) === $phoneNorm) {
                return 'Este telefone já está associado a outro voluntário nesta igreja.';
            }
        }

        $volNoScope = Volunteer::query()
            ->whereNull('user_id')
            ->whereDoesntHave('ministries')
            ->when($excludeVolunteerId, fn ($q) => $q->where('id', '!=', $excludeVolunteerId))
            ->get(['id', 'phone']);
        foreach ($volNoScope as $v) {
            if (self::normalizePhone($v->phone) === $phoneNorm) {
                return 'Este telefone já está associado a outro voluntário (sem departamento).';
            }
        }

        return null;
    }

    /**
     * Cadastro público: usuários já cobertos por unique:users; aqui voluntário/usuário na igreja.
     */
    public static function emailConflictsMemberVolunteerForChurch(int $churchId, string $emailNorm): ?string
    {
        if (User::query()
            ->where('church_id', $churchId)
            ->whereRaw('LOWER(TRIM(COALESCE(email, ""))) = ?', [$emailNorm])
            ->exists()) {
            return 'Este e-mail já está associado a outro usuário nesta igreja.';
        }

        if (Volunteer::query()
            ->whereRaw('LOWER(TRIM(COALESCE(email, ""))) = ?', [$emailNorm])
            ->where(function ($q) use ($churchId) {
                $q->whereHas('user', fn ($uq) => $uq->where('church_id', $churchId))
                    ->orWhereHas('ministries', fn ($mq) => $mq->where('church_id', $churchId));
            })
            ->exists()) {
            return 'Este e-mail já está associado a outro voluntário nesta igreja.';
        }

        return null;
    }

    public static function phoneConflictsForChurch(int $churchId, string $phoneNorm): ?string
    {
        $users = User::query()->where('church_id', $churchId)->get(['id', 'phone']);
        foreach ($users as $u) {
            if (self::normalizePhone($u->phone) === $phoneNorm) {
                return 'Este telefone já está associado a outro usuário nesta igreja.';
            }
        }

        $volunteers = Volunteer::query()
            ->where(function ($q) use ($churchId) {
                $q->whereHas('user', fn ($uq) => $uq->where('church_id', $churchId))
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
     * E-mail de acesso ao app (pode diferir do e-mail de contato do voluntário).
     */
    public static function appEmailConflicts(
        Request $request,
        string $emailNorm,
        ?int $excludeVolunteerId = null,
        ?int $excludeChurchUserId = null,
        ?int $excludeUserId = null,
    ): ?string {
        return self::emailConflicts($request, $emailNorm, $excludeVolunteerId, $excludeChurchUserId, $excludeUserId);
    }

    /**
     * Impede vincular cadastro de voluntário a contas da equipe ou à própria sessão.
     */
    public static function privilegedAccountVolunteerLinkMessage(?User $user, ?int $actingUserId = null): ?string
    {
        if ($user === null) {
            return null;
        }

        if ($actingUserId !== null && (int) $user->id === (int) $actingUserId) {
            return 'Não é possível usar o e-mail da sua própria conta de equipe neste cadastro de voluntário.';
        }

        if ($user->hasRole('super_admin')) {
            return 'Este e-mail pertence a um super administrador. Use outro e-mail para o cadastro de voluntário.';
        }

        if ($user->canAccessAdminMenu()) {
            return 'Este e-mail já pertence a uma conta da equipe (administração, secretaria ou pastoral). Use outro e-mail ou peça ajuda ao administrador.';
        }

        if ($user->isMinistryLeaderAccount()) {
            return 'Este e-mail já pertence a uma conta de líder de ministério. Use outro e-mail para o cadastro de voluntário.';
        }

        return null;
    }
}
