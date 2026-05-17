<?php

namespace App\Console\Commands;

use App\Models\PushToken;
use App\Services\FcmMessaging;
use Illuminate\Console\Command;

class CheckFcmConfigCommand extends Command
{
    protected $signature = 'notifications:check-fcm';

    protected $description = 'Verifica se o FCM (push iOS/Android) está configurado no .env e se o OAuth com o Firebase funciona.';

    public function handle(): int
    {
        $projectId = (string) config('services.fcm.project_id');
        $clientEmail = (string) config('services.fcm.client_email');
        $privateKey = (string) config('services.fcm.private_key');

        $this->info('Variáveis no .env (via config cache):');
        $this->line('  FCM_PROJECT_ID: '.($projectId !== '' ? $projectId : '(vazio)'));
        $this->line('  FCM_CLIENT_EMAIL: '.($clientEmail !== '' ? $clientEmail : '(vazio)'));
        $this->line('  FCM_PRIVATE_KEY: '.($privateKey !== '' ? 'definida ('.strlen($privateKey).' caracteres)' : '(vazia)'));

        if (! FcmMessaging::enabled()) {
            $this->newLine();
            $this->error('FCM incompleto. Preencha as três variáveis no .env do servidor e rode:');
            $this->line('  php artisan config:clear');
            $this->newLine();
            $this->comment('Como obter os valores:');
            $this->line('  1. Firebase Console → seu projeto → Configurações do projeto');
            $this->line('  2. Contas de serviço → Gerar nova chave privada (JSON)');
            $this->line('  3. No JSON: project_id → FCM_PROJECT_ID, client_email → FCM_CLIENT_EMAIL,');
            $this->line('     private_key → FCM_PRIVATE_KEY (uma linha, \\n no lugar das quebras)');

            return self::FAILURE;
        }

        $fcm = new FcmMessaging;
        if (! $fcm->canAuthenticate()) {
            $this->newLine();
            $this->error('Variáveis presentes, mas o OAuth com o Firebase falhou.');
            $this->line('Confira se FCM_PRIVATE_KEY está entre aspas e com \\n nas quebras de linha.');

            return self::FAILURE;
        }

        $tokenCount = PushToken::query()->count();
        $userCount = PushToken::query()->distinct('user_id')->count('user_id');

        $this->newLine();
        $this->info('OAuth OK — o servidor consegue falar com o FCM.');
        $this->line("  Dispositivos registrados: {$tokenCount} token(s), {$userCount} usuário(s).");

        if ($tokenCount === 0) {
            $this->warn('Nenhum token ainda. Os usuários precisam abrir o app no celular,');
            $this->warn('fazer login e aceitar permissão de notificações.');
        }

        return self::SUCCESS;
    }
}
