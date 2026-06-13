<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            RolePermissionSeeder::class,
            SharedTalentCategorySeeder::class,
            ChurchSeeder::class,
            MinistrySeeder::class,
            ChurchCommunitySeeder::class,
            ScheduleRoleSeeder::class,
            MemberSeeder::class,
            VolunteerSeeder::class,
        ]);

        $user = User::query()->firstOrCreate(
            ['email' => 'ivan@iresult.com.br'],
            [
                'name' => 'Ivan',
                'password' => 'admin123', // o cast 'hashed' do User já faz o hash
            ]
        );

        if (! $user->wasRecentlyCreated) {
            $user->update(['password' => 'admin123', 'name' => 'Ivan']);
        }

        $user->syncRoles(['admin', 'super_admin']);
        $user->syncRoleIdFromSpatieAssignments();
        $user->ensureVolunteerProfile();

        // Garantir que a cache de permissões (Spatie) seja limpa para o menu refletir tudo
        try {
            app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
        } catch (\Throwable $e) {
            // Spatie não registado ou versão diferente
        }
    }
}
