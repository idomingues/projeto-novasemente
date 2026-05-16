@php
    $logo = url('/logo-ns.png');
    $ministryName = (string) ($inv->ministry?->name ?? 'Departamento');
    $expires = $inv->expires_at ? $inv->expires_at->format('d/m/Y') : null;
    $days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
@endphp

<!doctype html>
<html lang="pt-br">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Convite para servir</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:24px 0;">
        <tr>
            <td align="center">
                <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="width:640px;max-width:92vw;">
                    <tr>
                        <td style="padding:0 10px 14px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td style="vertical-align:middle;">
                                        <img src="{{ $logo }}" width="44" height="44" alt="Nova Semente" style="display:block;border-radius:999px;" />
                                    </td>
                                    <td style="vertical-align:middle;padding-left:12px;">
                                        <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;font-size:14px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#18181b;">
                                            Nova Semente
                                        </div>
                                        <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;font-size:12px;color:#52525b;margin-top:2px;">
                                            Voluntariado
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td style="background:#ffffff;border:1px solid #e4e4e7;border-radius:18px;overflow:hidden;">
                            <div style="padding:22px 22px 0;">
                                <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;font-size:20px;font-weight:800;color:#18181b;line-height:1.25;">
                                    Convite para servir em <span style="color:#065f46;">{{ $ministryName }}</span>
                                </div>
                                <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;font-size:13px;color:#52525b;line-height:1.5;margin-top:10px;">
                                    O texto abaixo inclui saudação, convite e links — é o mesmo texto que aparece ao copiar para o WhatsApp ou outras mensagens no painel «Meus voluntários».
                                </div>
                                <div style="margin-top:14px;border:1px solid #e4e4e7;border-radius:14px;background:#fafafa;padding:14px 16px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;font-size:14px;color:#18181b;line-height:1.65;white-space:pre-wrap;">{{ $plainCopySection }}</div>
                            </div>

                            <div style="padding:18px 22px 0;">
                                <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#52525b;">
                                    Abrir na página do convite
                                </div>
                                <div style="margin-top:10px;">
                                <a href="{{ $actionUrl }}" style="display:inline-block;background:#10b981;color:#ffffff;text-decoration:none;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;font-weight:800;font-size:13px;letter-spacing:.06em;text-transform:uppercase;padding:12px 16px;border-radius:999px;">
                                    Aceitar ou recusar
                                </a>
                                <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;font-size:12px;color:#71717a;margin-top:12px;line-height:1.5;">
                                    Se o botão não funcionar, copie e cole este link no seu navegador:<br/>
                                    <span style="word-break:break-all;color:#0f172a;">{{ $actionUrl }}</span>
                                </div>
                                </div>
                            </div>

                            @if($inv->slots && $inv->slots->count() > 0)
                                <div style="padding:18px 22px 0;">
                                    <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#52525b;">
                                        Dias e horários sugeridos
                                    </div>
                                    <div style="margin-top:10px;border:1px solid #e4e4e7;border-radius:14px;overflow:hidden;">
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                            @foreach($inv->slots as $s)
                                                <tr>
                                                    <td style="padding:10px 12px;border-bottom:1px solid #f4f4f5;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;font-size:13px;color:#18181b;">
                                                        <strong>{{ $days[(int)$s->day_of_week] ?? 'Dia' }}</strong>
                                                        <span style="color:#52525b;">
                                                            @if($s->start_time && $s->end_time)
                                                                — {{ substr((string)$s->start_time,0,5) }} às {{ substr((string)$s->end_time,0,5) }}
                                                            @elseif($s->start_time)
                                                                — a partir de {{ substr((string)$s->start_time,0,5) }}
                                                            @elseif($s->end_time)
                                                                — até {{ substr((string)$s->end_time,0,5) }}
                                                            @else
                                                                — horário a combinar
                                                            @endif
                                                        </span>
                                                    </td>
                                                </tr>
                                            @endforeach
                                        </table>
                                    </div>
                                </div>
                            @endif

                            <div style="padding:18px 22px 22px;">
                                <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;padding:12px 12px;">
                                    <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;font-size:12px;font-weight:800;color:#065f46;">
                                        Importante
                                    </div>
                                    <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;font-size:12px;color:#166534;line-height:1.55;margin-top:6px;">
                                        Você pode <strong>aceitar</strong> ou <strong>recusar</strong>. Caso recuse, será obrigatório informar o motivo.
                                        @if($expires)
                                            Este convite é válido até <strong>{{ $expires }}</strong>.
                                        @endif
                                    </div>
                                </div>

                                <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;font-size:12px;color:#71717a;margin-top:14px;line-height:1.6;">
                                    Obrigado,<br/>
                                    <strong style="color:#18181b;">Nova Semente</strong>
                                </div>
                            </div>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:14px 10px 0;">
                            <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;font-size:11px;color:#a1a1aa;line-height:1.6;">
                                Se você não reconhece este convite, ignore este e-mail.
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>

