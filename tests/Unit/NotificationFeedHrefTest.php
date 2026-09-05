<?php

namespace Tests\Unit;

use App\Support\NotificationFeed;
use Illuminate\Http\Request;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class NotificationFeedHrefTest extends TestCase
{
    #[DataProvider('storedUrlProvider')]
    public function test_inertia_href_strips_foreign_hosts(string $stored, string $expected): void
    {
        $request = Request::create('http://127.0.0.1:8000/mobile/profile');

        $this->assertSame(
            $expected,
            NotificationFeed::inertiaHrefFromStoredUrl($request, $stored),
        );
    }

    /**
     * @return array<string, array{0: string, 1: string}>
     */
    public static function storedUrlProvider(): array
    {
        return [
            'relative path' => ['/suporte?modal=abc&inbox=1', '/suporte?modal=abc&inbox=1'],
            'production host' => [
                'https://app.novasemente.com.br/suporte?modal=abc&inbox=1094',
                '/suporte?modal=abc&inbox=1094',
            ],
            'localhost while browsing 127' => [
                'http://localhost:8000/suporte?modal=xyz',
                '/suporte?modal=xyz',
            ],
            'path only root' => ['https://app.novasemente.com.br/', '/'],
            'with fragment' => [
                'https://example.test/mobile/notifications#top',
                '/mobile/notifications#top',
            ],
        ];
    }
}
