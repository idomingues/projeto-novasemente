<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Builder;

trait Publishable
{
    /**
     * Itens ativos (não desativados manualmente).
     *
     * @param  Builder  $query
     * @return Builder
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Itens publicados (data no passado ou agora). Exclui agendados para o futuro e rascunhos.
     *
     * @param  Builder  $query
     * @return Builder
     */
    public function scopePublished(Builder $query): Builder
    {
        return $query->whereNotNull('published_at')->where('published_at', '<=', now());
    }

    /**
     * Visível para app/público: ativo + publicado.
     *
     * @param  Builder  $query
     * @return Builder
     */
    public function scopeVisibleToPublic(Builder $query): Builder
    {
        return $query->active()->published();
    }
}

