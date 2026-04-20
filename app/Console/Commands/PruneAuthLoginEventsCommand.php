<?php

namespace App\Console\Commands;

use App\Models\AuthLoginEvent;
use Illuminate\Console\Command;

class PruneAuthLoginEventsCommand extends Command
{
    protected $signature = 'auth:prune-login-events';

    protected $description = 'Remove auth_login_events older than the configured retention period.';

    public function handle(): int
    {
        $days = (int) config('operations.login_events_retention_days', 90);
        if ($days < 1) {
            $this->warn('login_events_retention_days must be >= 1; skipping.');

            return self::SUCCESS;
        }

        $deleted = AuthLoginEvent::query()->where('created_at', '<', now()->subDays($days))->delete();
        $this->info("Deleted {$deleted} row(s) older than {$days} days.");

        return self::SUCCESS;
    }
}
