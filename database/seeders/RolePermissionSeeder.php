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
            'departments.view',
            'departments.manage',
            'rooms.view',
            'rooms.manage',
            'rooms.schedule',
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
            'notifications.manage',
            'support.view',
            'support.manage',
            'solicitations.view',
            'solicitations.manage',
            'pastors.view',
            'pastors.manage',
            'roles.manage',
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
                'departments.view',
                'departments.manage',
                'rooms.view',
                'rooms.manage',
                'rooms.schedule',
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
                'notifications.manage',
                'support.view',
                'support.manage',
                'solicitations.view',
                'solicitations.manage',
                'pastors.view',
                'pastors.manage',
                'roles.manage',
            ],
            'secretaria' => [
                'members.view',
                'members.manage',
                'volunteers.view',
                'volunteers.manage',
                'departments.view',
                'departments.manage',
                'rooms.view',
                'rooms.manage',
                'rooms.schedule',
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
                'notifications.manage',
                'support.view',
                'support.manage',
                'solicitations.view',
                'solicitations.manage',
                'pastors.view',
                'pastors.manage',
            ],
            'pastor' => [
                'members.view',
                'volunteers.view',
                'departments.view',
                'rooms.view',
                'rooms.schedule',
                'finance.view',
                'escalas.view',
                'inventory.view',
                'news.view',
                'events.view',
                'events.manage',
                'culto.manage',
                'music.manage',
                'notifications.manage',
                'support.view',
                'support.manage',
                'solicitations.view',
                'solicitations.manage',
                'pastors.view',
                'pastors.manage',
            ],
            'financeiro' => [
                'finance.view',
                'finance.manage',
                'events.view',
            ],
            'lider_ministerio' => [
                'members.view',
                'volunteers.view',
                'departments.view',
                'rooms.view',
                'rooms.schedule',
                'escalas.view',
                'escalas.manage',
                'inventory.view',
                'news.view',
                'events.view',
                'pastors.view',
                'pastors.manage',
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
        }
    }
}
