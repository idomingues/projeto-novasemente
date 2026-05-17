<?php

namespace App\Console\Commands;

use App\Models\AppNotification;
use App\Models\UserInboxNotification;
use App\Services\NativePushNotifier;
use Illuminate\Console\Command;

class ResendNativePushTodayCommand extends Command
{
    protected $signature = 'notifications:resend-native-push-today
                            {--dry-run : Apenas lista o que seria reenviado, sem chamar o FCM}';

    protected $description = 'Reenvia via FCM (iOS/Android) as notificações criadas hoje que ainda não chegaram ao celular.';

    public function handle(NativePushNotifier $notifier): int
    {
        if (! $notifier->isEnabled()) {
            $this->error('FCM não está configurado (FCM_PROJECT_ID, FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY no .env).');

            return self::FAILURE;
        }

        $dryRun = (bool) $this->option('dry-run');
        $since = now()->startOfDay();

        $appRows = AppNotification::query()
            ->where('created_at', '>=', $since)
            ->orderBy('id')
            ->get();

        $inboxRows = UserInboxNotification::query()
            ->where('created_at', '>=', $since)
            ->orderBy('id')
            ->get();

        $this->info('Período: desde '.$since->format('d/m/Y H:i'));

        if ($dryRun) {
            $this->warn('Modo dry-run — nenhum push será enviado.');
        }

        $appSent = 0;
        foreach ($appRows as $notification) {
            $this->line("App #{$notification->id}: {$notification->title}");

            if ($dryRun) {
                continue;
            }

            $appSent += $notifier->notifyChurchBroadcast(
                $notification->church_id !== null ? (int) $notification->church_id : null,
                (string) $notification->title,
                (string) $notification->body,
                [
                    'type' => 'app_notification',
                    'id' => (string) $notification->id,
                    'title' => (string) $notification->title,
                    'body' => (string) $notification->body,
                ],
            );
        }

        $inboxSent = 0;
        foreach ($inboxRows as $notification) {
            $this->line("Caixa #{$notification->id} (usuário {$notification->user_id}): {$notification->title}");

            if ($dryRun) {
                continue;
            }

            $href = is_string($notification->action_url) ? $notification->action_url : '';

            $inboxSent += $notifier->notifyUser(
                (int) $notification->user_id,
                (string) $notification->title,
                (string) $notification->body,
                [
                    'type' => 'inbox_notification',
                    'id' => (string) $notification->id,
                    'title' => (string) $notification->title,
                    'body' => (string) $notification->body,
                    'href' => $href,
                ],
            );
        }

        if ($dryRun) {
            $this->info("Seriam reenviadas: {$appRows->count()} broadcast(s) e {$inboxRows->count()} caixa(s) pessoal(is).");

            return self::SUCCESS;
        }

        $this->info("Enviados {$appSent} push(es) de broadcast e {$inboxSent} push(es) de caixa pessoal.");

        return self::SUCCESS;
    }
}
