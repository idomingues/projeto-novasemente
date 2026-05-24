<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class CheckMailConfigCommand extends Command
{
    protected $signature = 'mail:check {--send= : Envia um e-mail de teste para este endereço}';

    protected $description = 'Verifica a configuração de e-mail (.env) e, opcionalmente, envia um teste.';

    public function handle(): int
    {
        $mailer = (string) config('mail.default');
        $fromAddress = (string) config('mail.from.address');
        $fromName = (string) config('mail.from.name');
        $appEnv = (string) config('app.env');

        $this->info('Configuração atual (via config cache):');
        $this->line("  APP_ENV: {$appEnv}");
        $this->line("  MAIL_MAILER: {$mailer}");
        $this->line('  MAIL_FROM_ADDRESS: '.($fromAddress !== '' ? $fromAddress : '(vazio)'));
        $this->line('  MAIL_FROM_NAME: '.($fromName !== '' ? $fromName : '(vazio)'));

        if ($mailer === 'smtp') {
            $host = (string) config('mail.mailers.smtp.host');
            $this->line('  MAIL_HOST: '.$host);
            $this->line('  MAIL_PORT: '.(string) config('mail.mailers.smtp.port'));
            $this->line('  MAIL_SCHEME: '.((string) config('mail.mailers.smtp.scheme') !== '' ? (string) config('mail.mailers.smtp.scheme') : '(vazio)'));
            $this->line('  MAIL_USERNAME: '.((string) config('mail.mailers.smtp.username') !== '' ? 'definido' : '(vazio)'));
            $this->line('  MAIL_PASSWORD: '.((string) config('mail.mailers.smtp.password') !== '' ? 'definido' : '(vazio)'));

            if (str_contains(strtolower($host), 'brevo.com') && (string) config('mail.mailers.smtp.scheme') === '') {
                $this->warn('  Brevo na porta 587: defina MAIL_SCHEME=smtp no .env.');
            }
        }

        if (app()->isProduction() && $mailer === 'log') {
            $this->newLine();
            $this->error('Problema: em produção o MAIL_MAILER está em "log".');
            $this->line('  Os e-mails ficam só em storage/logs/laravel.log — nada chega à caixa de entrada.');
            $this->newLine();
            $this->comment('Ajuste no .env do servidor e rode:');
            $this->line('  php artisan config:clear && php artisan config:cache');

            return self::FAILURE;
        }

        if ($mailer === 'log') {
            $this->newLine();
            $this->warn('MAIL_MAILER=log — adequado para desenvolvimento local. O link fica em storage/logs/laravel.log.');
        }

        $sendTo = $this->option('send');
        if (! is_string($sendTo) || trim($sendTo) === '') {
            $this->newLine();
            $this->info('Para testar envio real: php artisan mail:check --send=seu@email.com');

            return self::SUCCESS;
        }

        $sendTo = trim(strtolower($sendTo));

        try {
            Mail::raw('Teste de e-mail — Nova Semente ('.now()->toDateTimeString().').', function ($message) use ($sendTo): void {
                $message->to($sendTo)->subject('Teste de e-mail — Nova Semente');
            });
        } catch (\Throwable $e) {
            $this->newLine();
            $this->error('Falha ao enviar: '.$e->getMessage());

            return self::FAILURE;
        }

        $this->newLine();
        if ($mailer === 'log') {
            $this->info("Conteúdo registrado em storage/logs/laravel.log (destino informado: {$sendTo}).");
        } else {
            $this->info("E-mail de teste enviado para {$sendTo}. Confira a caixa de entrada e o spam.");
        }

        return self::SUCCESS;
    }
}
