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

        $oldEmail = 'admin@example.com';
        $newEmail = 'ivan@iresult.com.br';
        $password = 'admin123';

        $user = User::query()->where('email', $newEmail)->first();
        if (! $user) {
            $user = User::query()->where('email', $oldEmail)->first();
            if ($user) {
                $user->forceFill(['email' => $newEmail])->save();
            }
        }

        if (! $user) {
            $user = User::query()->create([
                'name' => 'Ivan',
                'email' => $newEmail,
                'password' => Hash::make($password),
            ]);
        }

        $user->forceFill([
            'name' => $user->name ?: 'Ivan',
            'password' => Hash::make($password),
        ])->save();

        $guard = (string) config('auth.defaults.guard', 'web');
        Role::firstOrCreate(['name' => 'admin', 'guard_name' => $guard]);
        Role::firstOrCreate(['name' => 'super_admin', 'guard_name' => $guard]);

        try {
            $user->syncRoles(['admin', 'super_admin']);
        } catch (\Throwable) {
            // ignore
        }
    }

    public function down(): void
    {
        // não reverter automaticamente
    }
};

