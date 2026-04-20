<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('users')) {
            return;
        }

        $email = 'admin@example.com';
        $user = User::query()->where('email', $email)->first();
        if (! $user) {
            $user = User::query()->create([
                'name' => 'Admin',
                'email' => $email,
                'password' => Hash::make('admin123'),
            ]);
        } else {
            // Garante senha padrão e nome se tiver sido perdido (ambiente local / reset).
            $user->forceFill([
                'name' => $user->name ?: 'Admin',
                'password' => Hash::make('admin123'),
            ])->save();
        }

        // Garante que os roles existam e associa ao utilizador.
        $guard = (string) config('auth.defaults.guard', 'web');
        Role::firstOrCreate(['name' => 'admin', 'guard_name' => $guard]);
        Role::firstOrCreate(['name' => 'super_admin', 'guard_name' => $guard]);

        try {
            $user->syncRoles(['admin', 'super_admin']);
        } catch (\Throwable) {
            // Se Spatie não estiver disponível por qualquer motivo, não bloquear migrações.
        }
    }

    public function down(): void
    {
        // Não remover o utilizador admin por segurança (pode ter sido customizado).
    }
};
