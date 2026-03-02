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
        $permissions = [
            'members.view',
            'members.manage',
            'volunteers.view',
            'volunteers.manage',
            'rooms.view',
            'rooms.manage',
            'finance.view',
            'finance.manage',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        $roles = [
            'admin' => [
                'members.view',
                'members.manage',
                'volunteers.view',
                'volunteers.manage',
                'rooms.view',
                'rooms.manage',
                'finance.view',
                'finance.manage',
            ],
            'secretaria' => [
                'members.view',
                'members.manage',
                'volunteers.view',
                'volunteers.manage',
                'rooms.view',
                'rooms.manage',
            ],
            'pastor' => [
                'members.view',
                'volunteers.view',
                'rooms.view',
                'finance.view',
            ],
            'financeiro' => [
                'finance.view',
                'finance.manage',
            ],
            'lider_ministerio' => [
                'members.view',
                'volunteers.view',
                'rooms.view',
            ],
        ];

        foreach ($roles as $roleName => $rolePermissions) {
            $role = Role::firstOrCreate(['name' => $roleName]);
            $role->syncPermissions($rolePermissions);
        }

        $adminUser = User::first();

        if ($adminUser) {
            $adminUser->assignRole('admin');
        }
    }
}

