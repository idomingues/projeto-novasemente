<?php

namespace App\Support;

/**
 * Calendário missionário Nova Semente — jun a dez/2026.
 */
final class NovaSementeMissionCalendar2026
{
    /**
     * @return list<array{
     *     title: string,
     *     starts_at: string,
     *     ends_at?: string,
     *     description?: string|null,
     *     location?: string|null
     * }>
     */
    public static function events(): array
    {
        return [
            // Junho
            [
                'title' => 'Mission Day',
                'starts_at' => '2026-06-14',
                'location' => 'Rua Cubatão, 48 — Paraíso, São Paulo — SP',
                'description' => <<<'TEXT'
O Mission Day será uma programação especial da Nova Semente pensada para inspirar, conectar e reacender o propósito de viver a missão de forma prática e real.

Teremos momentos de música, reflexão, histórias inspiradoras, lançamento de iniciativas missionais da comunidade e celebração de vidas transformadas.

Mais do que um evento, será um convite para lembrar que fomos chamados para servir, acolher e levar esperança às pessoas.

Uma programação aberta para amigos, famílias, visitantes e todos que desejam viver uma experiência leve, acolhedora e significativa.

O que teremos
Música e adoração
Mensagens inspiradoras
Histórias e testemunhos
Lançamento de iniciativas missionais
Momentos especiais de celebração
Ambiente acolhedor para convidados e visitantes

Domingo, 14 de junho de 2026 · 17 horas
TEXT,
            ],
            [
                'title' => 'Sent Care',
                'starts_at' => '2026-06-27',
                'description' => 'Cantar no hospital (sábado).',
            ],
            [
                'title' => 'Ação Kids na Paulista',
                'starts_at' => '2026-06-28',
                'location' => 'Avenida Paulista, São Paulo',
            ],

            // Julho
            [
                'title' => 'Campanha do Agasalho',
                'starts_at' => '2026-07-03',
                'description' => 'Entrega na sexta-feira.',
            ],
            [
                'title' => 'Sunset na Paulista',
                'starts_at' => '2026-07-18',
                'location' => 'Avenida Paulista, São Paulo',
            ],
            [
                'title' => 'Doar Sangue',
                'starts_at' => '2026-07-25',
                'description' => 'Sábado.',
            ],

            // Agosto
            [
                'title' => 'Sexta Sem Fome',
                'starts_at' => '2026-08-07',
                'description' => 'Sexta-feira.',
            ],
            ['title' => 'Missão 360°', 'starts_at' => '2026-08-08', 'ends_at' => '2026-08-09'],
            ['title' => 'Missão 360°', 'starts_at' => '2026-08-15', 'ends_at' => '2026-08-16'],
            ['title' => 'Sent Talk', 'starts_at' => '2026-08-22'],
            ['title' => 'Missão 360°', 'starts_at' => '2026-08-22', 'ends_at' => '2026-08-23'],
            ['title' => 'Missão 360°', 'starts_at' => '2026-08-29', 'ends_at' => '2026-08-30'],

            // Setembro
            [
                'title' => 'Ação Resgate — Penitenciária',
                'starts_at' => '2026-09-12',
            ],
            [
                'title' => 'Ação Kids — Sent Quiz 2026',
                'starts_at' => '2026-09-26',
            ],

            // Outubro
            ['title' => 'Tailândia e Mianmar Missão', 'starts_at' => '2026-10-14'],
            ['title' => 'Tailândia e Mianmar Missão', 'starts_at' => '2026-10-21'],

            // Novembro
            ['title' => 'Ação Asilo', 'starts_at' => '2026-11-14'],
            ['title' => 'Sent Talk', 'starts_at' => '2026-11-21'],

            // Dezembro
            ['title' => 'Celebration Day', 'starts_at' => '2026-12-06'],
            ['title' => 'Ação de Natal', 'starts_at' => '2026-12-19'],
        ];
    }
}
