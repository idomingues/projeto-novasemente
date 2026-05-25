<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\BrandMail;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BrandMailTest extends TestCase
{
    use RefreshDatabase;

    public function test_password_reset_mail_renders_brand_variables(): void
    {
        config([
            'brand.name' => 'Igreja Teste',
            'brand.app_url' => 'https://app.exemplo.test',
        ]);

        $user = User::factory()->create();
        $mail = (new ResetPassword('token-teste'))->toMail($user);

        $html = $mail->render();

        $this->assertStringContainsString('Igreja Teste', $html);
        $this->assertStringContainsString('https://app.exemplo.test', $html);
        $this->assertSame('Igreja Teste', BrandMail::viewData()['brandName']);
    }
}
