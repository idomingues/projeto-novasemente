<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\User;
use App\Models\UserFaceIdentity;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class FaceAiTest extends TestCase
{
    use RefreshDatabase;

    private function adminWithPhotosManage(): User
    {
        $this->seed();
        $church = Church::query()->firstOrFail();
        Permission::firstOrCreate(['name' => 'photos.manage']);
        $user = User::factory()->create(['church_id' => $church->id]);
        $user->assignRole(Role::firstOrCreate(['name' => 'admin']));
        $user->givePermissionTo('photos.manage');

        return $user;
    }

    public function test_guest_cannot_open_face_ai(): void
    {
        $this->get(route('face-ai.index'))->assertRedirect();
    }

    public function test_user_without_permission_is_forbidden(): void
    {
        $this->seed();
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('face-ai.index'))
            ->assertForbidden();
    }

    public function test_admin_can_store_face_identity(): void
    {
        Storage::fake('public');
        $user = $this->adminWithPhotosManage();
        $embedding = array_fill(0, 128, 0.01);
        $photoUrlBefore = $user->photo_url;

        $response = $this->actingAs($user)
            ->withSession(['working_church_id' => $user->church_id])
            ->postJson(route('face-ai.store'), [
                'photo' => UploadedFile::fake()->image('face.jpg', 400, 400),
                'embedding_json' => json_encode($embedding),
                'model_version' => 'face-api-recognition-v1',
                'liveness_passed' => '1',
            ]);

        $response->assertOk()->assertJsonPath('identity.embedding_dim', 128);

        $this->assertDatabaseHas('user_face_identities', [
            'user_id' => $user->id,
            'embedding_dim' => 128,
            'model_version' => 'face-api-recognition-v1',
        ]);

        $identity = UserFaceIdentity::query()->where('user_id', $user->id)->first();
        $this->assertNotNull($identity);
        $this->assertTrue(Storage::disk('public')->exists($identity->reference_photo_path));
        $this->assertSame($photoUrlBefore, $user->fresh()->photo_url);
    }

    public function test_admin_can_destroy_face_identity(): void
    {
        Storage::fake('public');
        $user = $this->adminWithPhotosManage();
        $path = 'face-id/1/'.$user->id.'.jpg';
        Storage::disk('public')->put($path, 'fake');

        UserFaceIdentity::query()->create([
            'user_id' => $user->id,
            'church_id' => $user->church_id,
            'reference_photo_path' => $path,
            'embedding' => array_fill(0, 128, 0.1),
            'embedding_dim' => 128,
            'model_version' => 'face-api-recognition-v1',
            'liveness_passed_at' => now(),
        ]);

        $this->actingAs($user)
            ->delete(route('face-ai.destroy'))
            ->assertRedirect(route('face-ai.index'));

        $this->assertDatabaseMissing('user_face_identities', ['user_id' => $user->id]);
        $this->assertFalse(Storage::disk('public')->exists($path));
    }
}
