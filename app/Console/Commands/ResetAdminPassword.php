<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class ResetAdminPassword extends Command
{
    protected $signature = 'admin:reset-password {email=admin@example.com} {password=admin123}';

    protected $description = 'Redefine a senha do usuário admin (para recuperar acesso).';

    public function handle(): int
    {
        $email = $this->argument('email');
        $password = $this->argument('password');

        $user = User::where('email', $email)->first();

        if (!$user) {
            $this->error("Usuário com e-mail \"{$email}\" não encontrado.");
            return self::FAILURE;
        }

        $user->password = Hash::make($password);
        $user->save();

        $this->info("Senha do usuário \"{$user->name}\" ({$email}) foi redefinida com sucesso.");
        $this->line("Use a senha: {$password}");
        return self::SUCCESS;
    }
}
