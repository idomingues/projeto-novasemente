<?php

namespace Tests\Feature;

use App\Models\Church;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class MobileBibliotecaAcervoResilienceTest extends TestCase
{
    use RefreshDatabase;

    public function test_biblioteca_loads_when_revista_editions_table_is_missing(): void
    {
        $this->seed();
        $churchId = (int) Church::query()->value('id');

        Schema::dropIfExists('revista_adventista_editions');

        $this
            ->withSession(['working_church_id' => $churchId])
            ->get(route('mobile.biblioteca'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/Library')
                ->where('revistaAdventistaAcervo', null)
                ->has('categories')
                ->where('categories', fn ($categories) => collect($categories)->pluck('value')->doesntContain('revista_adventista_acervo'))
            );
    }
}
