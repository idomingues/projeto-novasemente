<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Garante permissões de Publicação (e outras do seeder) que faltam na grade de Perfis.
 * Ex.: photos.manage, music.manage, communities.*, notifications.manage.
 */
return new class extends Migration
{
    /** @var list<string> */
    private const PERMISSIONS = [
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

    /** @var list<string> */
    private const GRANT_TO_ADMIN = [
        'volunteers.ministry_operate',
        'prayer.manage',
        'music.manage',
        'photos.manage',
        'communities.view',
        'communities.manage',
        'notifications.manage',
    ];

    public function up(): void
    {
        $guard = (string) config('auth.defaults.guard', 'web');

        foreach (self::PERMISSIONS as $name) {
            Permission::findOrCreate($name, $guard);
        }

        $admin = Role::query()->where('name', 'admin')->where('guard_name', $guard)->first();
        if ($admin) {
            $admin->givePermissionTo(self::GRANT_TO_ADMIN);
        }

        $secretaria = Role::query()->where('name', 'secretaria')->where('guard_name', $guard)->first();
        if ($secretaria) {
            $secretaria->givePermissionTo([
                'music.manage',
                'photos.manage',
                'communities.view',
                'communities.manage',
                'notifications.manage',
                'prayer.manage',
            ]);
        }

        $super = Role::query()->where('name', 'super_admin')->where('guard_name', $guard)->first();
        if ($super) {
            $super->syncPermissions(Permission::query()->where('guard_name', $guard)->get());
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        // Não remove permissões: podem já estar em uso.
    }
};
