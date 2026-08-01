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
            'brand.tagline' => 'Não deve aparecer no cabeçalho',
        ]);

        $user = User::factory()->create();
        $mail = (new ResetPassword('token-teste'))->toMail($user);

        $html = $mail->render();

        $this->assertStringContainsString('Igreja Teste', $html);
        $this->assertStringContainsString('https://app.exemplo.test', $html);
        $this->assertStringNotContainsString('Não deve aparecer no cabeçalho', $html);
        $this->assertStringNotContainsString('Comunidade Adventista', $html);
        $this->assertStringNotContainsString('Laravel', $html);
        $this->assertSame('Igreja Teste', BrandMail::viewData()['brandName']);
        $this->assertSame('Redefinir senha — Igreja Teste', $mail->subject);
    }

    public function test_brand_mail_ignores_laravel_placeholder_name(): void
    {
        config([
            'brand.name' => 'Laravel',
            'app.name' => 'Laravel',
        ]);

        $this->assertSame('Nova Semente', BrandMail::displayName());
        $this->assertSame('Nova Semente', BrandMail::viewData()['brandName']);
    }

    public function test_password_reset_mail_uses_nova_semente_when_app_name_is_laravel(): void
    {
        config([
            'brand.name' => 'Laravel',
            'app.name' => 'Laravel',
            'brand.tagline' => 'Comunidade Adventista',
        ]);

        $user = User::factory()->create();
        $mail = (new ResetPassword('token-teste'))->toMail($user);
        $html = $mail->render();

        $this->assertStringContainsString('Nova Semente', $html);
        $this->assertStringNotContainsString('Laravel', $html);
        $this->assertStringNotContainsString('Comunidade Adventista', $html);
        $this->assertSame('Redefinir senha — Nova Semente', $mail->subject);
    }
}
