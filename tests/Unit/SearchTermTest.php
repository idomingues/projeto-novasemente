<?php

namespace Tests\Unit;

use App\Support\SearchTerm;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class SearchTermTest extends TestCase
{
    #[Test]
    public function normalize_strips_accents_for_portuguese_names(): void
    {
        $this->assertSame('jonatas', SearchTerm::normalize('Jônatas'));
        $this->assertSame('joao', SearchTerm::normalize('João'));
        $this->assertSame('maria', SearchTerm::normalize('Mária'));
    }

    #[Test]
    public function like_pattern_escapes_wildcards(): void
    {
        $this->assertSame('%100\%%', SearchTerm::likePattern('100%'));
        $this->assertNull(SearchTerm::likePattern('   '));
    }
}
