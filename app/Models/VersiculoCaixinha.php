<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VersiculoCaixinha extends Model
{
    protected $table = 'versiculos_caixinha';

    protected $fillable = [
        'livro',
        'capitulo',
        'versiculo_inicio',
        'versiculo_fim',
        'categoria',
        'nota',
        'peso',
        'ativo',
    ];

    protected function casts(): array
    {
        return [
            'capitulo' => 'integer',
            'versiculo_inicio' => 'integer',
            'versiculo_fim' => 'integer',
            'nota' => 'integer',
            'peso' => 'integer',
            'ativo' => 'boolean',
        ];
    }

    public function referenceKey(): string
    {
        return self::makeReferenceKey(
            (string) $this->livro,
            (int) $this->capitulo,
            (int) $this->versiculo_inicio,
            (int) $this->versiculo_fim,
        );
    }

    public static function makeReferenceKey(string $livro, int $capitulo, int $versiculoInicio, int $versiculoFim): string
    {
        return mb_strtolower(trim($livro)).'|'.$capitulo.'|'.$versiculoInicio.'|'.$versiculoFim;
    }
}
