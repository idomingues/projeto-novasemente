<?php

namespace App\Support;

/**
 * Valores padrão da história "Construção da Igreja".
 * Espelha resources/js/data/construcaoIgrejaStory.ts.
 */
final class ConstrucaoIgrejaStoryDefaults
{
    /**
     * @return array{
     *     launch_date: string,
     *     as_of_date: string,
     *     raised_amount: float,
     *     eyebrow: string,
     *     title: string,
     *     paragraphs: list<string>,
     *     highlights: list<string>
     * }
     */
    public static function story(): array
    {
        return [
            'launch_date' => '2023-11-01',
            'as_of_date' => '2026-06-27',
            'raised_amount' => 5_866_737.86,
            'eyebrow' => 'Campanha da construção',
            'title' => 'Uma casa construída com fidelidade',
            'paragraphs' => [
                'Desde o lançamento oficial da campanha da construção, a Igreja Adventista da Nova Semente tem caminhado unida para erguer um espaço permanente de culto, evangelismo e acolhimento.',
                'Cada contribuição fortalece a missão, reduz a dívida da obra e amplia o alcance do evangelho para milhares de pessoas que ainda precisam conhecer Jesus.',
            ],
            'highlights' => [
                'Templo preparado para receber milhares de pessoas semanalmente.',
                'Estrutura que sustenta cultos, transmissões e ações missionárias.',
                'Obra sustentada pela generosidade e fidelidade do povo de Deus.',
            ],
        ];
    }
}
