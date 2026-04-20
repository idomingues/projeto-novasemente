<?php

namespace App\Http\Controllers;

use App\Models\AuthLoginEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class OperationsDashboardController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()?->hasRole('super_admin'), 403);

        $activeMinutes = max(1, (int) config('operations.session_active_minutes', 5));
        $sinceTs = now()->subMinutes($activeMinutes)->getTimestamp();
        $sessionDriver = (string) config('session.driver');

        $sessionsTotal = 0;
        $sessionsDistinctUsers = 0;
        $sessionsNote = null;

        if ($sessionDriver === 'database' && Schema::hasTable('sessions')) {
            $sessionsTotal = (int) DB::table('sessions')
                ->where('last_activity', '>=', $sinceTs)
                ->count();
            $sessionsDistinctUsers = (int) DB::table('sessions')
                ->where('last_activity', '>=', $sinceTs)
                ->whereNotNull('user_id')
                ->selectRaw('count(distinct user_id) as c')
                ->value('c');
        } else {
            $sessionsNote = 'Sessões em tempo real requerem SESSION_DRIVER=database e tabela `sessions`. Driver actual: '.$sessionDriver.'.';
        }

        $todayStart = now()->startOfDay();

        $loginsSuccessToday = AuthLoginEvent::query()
            ->where('outcome', AuthLoginEvent::OUTCOME_SUCCESS)
            ->where('created_at', '>=', $todayStart)
            ->count();

        $loginsFailedToday = AuthLoginEvent::query()
            ->where('outcome', AuthLoginEvent::OUTCOME_FAILED)
            ->where('created_at', '>=', $todayStart)
            ->count();

        $lockoutsToday = AuthLoginEvent::query()
            ->whereIn('outcome', [AuthLoginEvent::OUTCOME_LOCKOUT, AuthLoginEvent::OUTCOME_IP_BLOCKED])
            ->where('created_at', '>=', $todayStart)
            ->count();

        $distinctUsersSuccessToday = (int) AuthLoginEvent::query()
            ->where('outcome', AuthLoginEvent::OUTCOME_SUCCESS)
            ->where('created_at', '>=', $todayStart)
            ->whereNotNull('user_id')
            ->selectRaw('count(distinct user_id) as c')
            ->value('c');

        $recentEvents = AuthLoginEvent::query()
            ->with('user:id,name')
            ->orderByDesc('id')
            ->limit(80)
            ->get()
            ->map(fn (AuthLoginEvent $e) => [
                'id' => $e->id,
                'outcome' => $e->outcome,
                'outcomeLabel' => match ($e->outcome) {
                    AuthLoginEvent::OUTCOME_SUCCESS => 'Login OK',
                    AuthLoginEvent::OUTCOME_FAILED => 'Falha',
                    AuthLoginEvent::OUTCOME_LOCKOUT => 'Bloqueio (conta)',
                    AuthLoginEvent::OUTCOME_IP_BLOCKED => 'Bloqueio (IP)',
                    AuthLoginEvent::OUTCOME_HONEYPOT => 'Honeypot',
                    default => $e->outcome,
                },
                'userName' => $e->user?->name,
                'userId' => $e->user_id,
                'ip' => $e->ip_address,
                'userAgent' => $e->user_agent !== null ? mb_strimwidth($e->user_agent, 0, 120, '…') : null,
                'createdAt' => $e->created_at?->toIso8601String(),
            ])
            ->values()
            ->all();

        return Inertia::render('Operations/Index', [
            'sessionDriver' => $sessionDriver,
            'sessionActiveWindowMinutes' => $activeMinutes,
            'sessionsTotalApprox' => $sessionsTotal,
            'sessionsDistinctUsersApprox' => $sessionsDistinctUsers,
            'sessionsNote' => $sessionsNote,
            'loginsSuccessToday' => $loginsSuccessToday,
            'loginsFailedToday' => $loginsFailedToday,
            'lockoutsToday' => $lockoutsToday,
            'distinctUsersSuccessToday' => $distinctUsersSuccessToday,
            'recentEvents' => $recentEvents,
            'security' => [
                'maxAttemptsPerIdentity' => (int) config('operations.login_max_attempts_per_identity', 5),
                'decayMinutes' => (int) ceil(((int) config('operations.login_decay_seconds', 900)) / 60),
                'maxAttemptsPerIp' => (int) config('operations.login_max_attempts_per_ip', 40),
                'ipDecayMinutes' => (int) ceil(((int) config('operations.login_ip_decay_seconds', 900)) / 60),
            ],
        ]);
    }
}
