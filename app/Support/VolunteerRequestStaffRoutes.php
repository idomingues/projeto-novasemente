<?php

namespace App\Support;

final class VolunteerRequestStaffRoutes
{
    public static function pipelinePedidosUrl(): string
    {
        return route('ministry-lead.volunteers.index', ['secao' => 'pedidos']);
    }
}
