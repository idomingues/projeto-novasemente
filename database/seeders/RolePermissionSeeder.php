<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use App\Models\User;

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
            ],
            'pastor' => [
                'members.view',
                'volunteers.view',
                'departments.view',
                'rooms.view',
                'finance.view',
                'escalas.view',
                'inventory.view',
                'news.view',
                'events.view',
                'events.manage',
                'culto.manage',
                'music.manage',
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
                'escalas.view',
                'escalas.manage',
                'inventory.view',
                'news.view',
                'events.view',
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

