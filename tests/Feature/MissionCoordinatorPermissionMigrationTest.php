<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class MissionCoordinatorPermissionMigrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_migration_grants_manage_to_mission_named_view_only_roles(): void
    {
        $this->seed();

        $guard = (string) config('auth.defaults.guard');
        $view = Permission::findOrCreate('mission.view', $guard);
        Permission::findOrCreate('mission.manage', $guard);

        $missionRole = Role::create(['name' => 'Missão', 'guard_name' => $guard]);
        $missionRole->syncPermissions([$view]);

        $coordRole = Role::create(['name' => 'Coordenador local', 'guard_name' => $guard]);
        $coordRole->syncPermissions([$view]);

        $observer = Role::create(['name' => 'Observador geral', 'guard_name' => $guard]);
        $observer->syncPermissions([
            $view,
            Permission::findOrCreate('members.view', $guard),
        ]);

        $migration = require database_path(
            'migrations/2026_07_17_201000_grant_mission_manage_to_mission_coordinator_roles.php'
        );
        $migration->up();

        $this->assertTrue($missionRole->fresh()->hasPermissionTo('mission.manage'));
        $this->assertTrue($coordRole->fresh()->hasPermissionTo('mission.manage'));
        $this->assertFalse($observer->fresh()->hasPermissionTo('mission.manage'));

        $pastor = Role::findByName('pastor', $guard);
        $this->assertTrue($pastor->hasPermissionTo('mission.view'));
        $this->assertFalse($pastor->hasPermissionTo('mission.manage'));
    }
}
