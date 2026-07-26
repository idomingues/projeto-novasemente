<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolePermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        $permissions = [
            'members.view',
            'members.manage',
            'volunteers.view',
            'volunteers.manage',
            'volunteers.ministry_operate',
            'departments.view',
            'departments.manage',
            'rooms.view',
            'rooms.manage',
            'rooms.schedule',
            'programacao.view',
            'programacao.manage',
            'finance.view',
            'finance.manage',
            'escalas.view',
            'escalas.manage',
            'inventory.view',
            'inventory.manage',
            'users.view',
            'users.manage',
            'churches.manage',
            'news.view',
            'news.manage',
            'events.view',
            'events.manage',
            'culto.manage',
            'music.manage',
            'photos.manage',
            'library.manage',
            'communities.view',
            'communities.manage',
            'prayer.manage',
            'notifications.manage',
            'support.view',
            'support.manage',
            'solicitations.view',
            'solicitations.manage',
            'conversations.view',
            'conversations.manage',
            'conversations.admin',
            'polls.view',
            'polls.manage',
            'pastors.view',
            'pastors.manage',
            'pastoral_appointments.manage',
            'roles.manage',
            'mission.view',
            'mission.manage',
            'campaigns.view',
            'campaigns.manage',
            'donations.view',
            'donations.manage',
            'talents.moderate',
            'talents.treasurer',
            'shared_talents.moderate',
            'shared_talents.manage',
        ];

        $guard = config('auth.defaults.guard');
        foreach ($permissions as $permission) {
            Permission::firstOrCreate(
                ['name' => $permission, 'guard_name' => $guard]
            );
        }

        $roles = [
            'admin' => [
                'members.view',
                'members.manage',
                'volunteers.view',
                'volunteers.manage',
                'volunteers.ministry_operate',
                'departments.view',
                'departments.manage',
                'rooms.view',
                'rooms.manage',
                'rooms.schedule',
                'programacao.view',
                'programacao.manage',
                'escalas.view',
                'escalas.manage',
                'inventory.view',
                'inventory.manage',
                'users.view',
                'users.manage',
                'churches.manage',
                'news.view',
                'news.manage',
                'events.view',
                'events.manage',
                'culto.manage',
                'music.manage',
                'photos.manage',
                'library.manage',
                'communities.view',
                'communities.manage',
                'prayer.manage',
                'notifications.manage',
                'solicitations.view',
                'solicitations.manage',
                'conversations.view',
                'conversations.manage',
                'conversations.admin',
                'polls.view',
                'polls.manage',
                'pastors.view',
                'pastors.manage',
                'pastoral_appointments.manage',
                'roles.manage',
                'mission.view',
                'mission.manage',
                'campaigns.view',
                'campaigns.manage',
                'donations.view',
                'donations.manage',
                'finance.view',
                'talents.moderate',
                'talents.treasurer',
                'shared_talents.moderate',
                'shared_talents.manage',
            ],
            'secretaria' => [
                'members.view',
                'members.manage',
                'volunteers.view',
                'volunteers.manage',
                'volunteers.ministry_operate',
                'departments.view',
                'departments.manage',
                'rooms.view',
                'rooms.manage',
                'rooms.schedule',
                'programacao.view',
                'programacao.manage',
                'escalas.view',
                'escalas.manage',
                'inventory.view',
                'inventory.manage',
                'users.view',
                'users.manage',
                'news.view',
                'news.manage',
                'events.view',
                'events.manage',
                'culto.manage',
                'music.manage',
                'photos.manage',
                'library.manage',
                'communities.view',
                'communities.manage',
                'prayer.manage',
                'notifications.manage',
                'solicitations.view',
                'solicitations.manage',
                'conversations.view',
                'conversations.manage',
                'conversations.admin',
                'polls.view',
                'polls.manage',
                'pastors.view',
                'pastors.manage',
                'pastoral_appointments.manage',
                'mission.view',
                'mission.manage',
                'campaigns.view',
                'campaigns.manage',
                'donations.view',
                'donations.manage',
                'finance.view',
                'talents.moderate',
                'talents.treasurer',
                'shared_talents.moderate',
                'shared_talents.manage',
            ],
            'pastor' => [
                'members.view',
                'volunteers.view',
                'departments.view',
                'rooms.view',
                'rooms.schedule',
                'escalas.view',
                'inventory.view',
                'news.view',
                'events.view',
                'events.manage',
                'culto.manage',
                'music.manage',
                'photos.manage',
                'library.manage',
                'communities.view',
                'prayer.manage',
                'notifications.manage',
                'solicitations.view',
                'solicitations.manage',
                'conversations.view',
                'conversations.manage',
                'conversations.admin',
                'polls.view',
                'polls.manage',
                'pastors.view',
                'pastors.manage',
                'pastoral_appointments.manage',
                'mission.view',
            ],
            'membro' => [
                // Conta de membro com app: sem permissões de painel; rotas móveis usam `auth` onde necessário.
            ],
            'lider_ministerio' => [
                'members.view',
                'volunteers.ministry_operate',
                'departments.view',
                'rooms.view',
                'rooms.schedule',
                'escalas.view',
                'escalas.manage',
                'inventory.view',
                'news.view',
                'events.view',
                'culto.manage',
                'photos.manage',
                'library.manage',
                'communities.view',
                'solicitations.view',
                'solicitations.manage',
                'conversations.view',
                'conversations.manage',
                'pastors.view',
                'pastors.manage',
                'mission.view',
                'mission.manage',
            ],
            'financeiro' => [
                'finance.view',
                'campaigns.view',
                'donations.view',
                'talents.treasurer',
            ],
        ];

        foreach ($roles as $roleName => $rolePermissions) {
            $role = Role::firstOrCreate(['name' => $roleName, 'guard_name' => $guard]);
            $role->syncPermissions($rolePermissions);
        }

        $superAdmin = Role::firstOrCreate(['name' => 'super_admin', 'guard_name' => $guard]);
        $superAdmin->syncPermissions(Permission::all());

        $adminUser = User::first();

        if ($adminUser) {
            $adminUser->syncRoles(['admin', 'super_admin']);
            $adminUser->syncRoleIdFromSpatieAssignments();
            $adminUser->ensureVolunteerProfile();
        }
    }
}
