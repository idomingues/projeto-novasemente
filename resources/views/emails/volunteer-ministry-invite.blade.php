@php
    $ministryName = (string) ($inv->ministry?->name ?? 'Departamento');
    $expires = $inv->expires_at ? $inv->expires_at->format('d/m/Y') : null;
    $days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
@endphp
@include('emails.partials.nova-semente-shell-open', ['pageTitle' => 'Convite para servir'])
<tr>
    <td style="padding:22px 22px 0;">
        <div style="font-size:20px;font-weight:800;color:#18181b;line-height:1.25;">
            Convite para servir em <span style="color:#065f46;">{{ $ministryName }}</span>
        </div>
        <div style="font-size:13px;color:#52525b;line-height:1.5;margin-top:10px;">
            O texto abaixo é o mesmo que aparece ao copiar para o WhatsApp no painel «Meus voluntários».
        </div>
        <div style="margin-top:14px;border:1px solid #e4e4e7;border-radius:14px;background:#fafafa;padding:14px 16px;font-size:14px;color:#18181b;line-height:1.65;white-space:pre-wrap;">{{ $plainCopySection }}</div>
    </td>
</tr>

@if($registerUrl)
<tr>
    <td style="padding:18px 22px 0;">
        <div style="font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#52525b;">
            Criar conta no app
        </div>
        <div style="margin-top:10px;">
            <a href="{{ $registerUrl }}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-weight:800;font-size:13px;letter-spacing:.06em;text-transform:uppercase;padding:12px 18px;border-radius:999px;">
                Criar conta e confirmar
            </a>
            <div style="font-size:12px;color:#71717a;margin-top:12px;line-height:1.5;">
                Se o botão não funcionar, copie e cole este link no seu navegador:<br>
                <span style="word-break:break-all;color:#0f172a;">{{ $registerUrl }}</span>
            </div>
        </div>
    </td>
</tr>
@elseif(!empty($hasLinkedAppAccount) && !empty($inviteUrl))
<tr>
    <td style="padding:18px 22px 0;">
        <div style="font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#52525b;">
            Responder ao convite
        </div>
        <div style="margin-top:10px;">
            <a href="{{ $inviteUrl }}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-weight:800;font-size:13px;letter-spacing:.06em;text-transform:uppercase;padding:12px 18px;border-radius:999px;">
                Aceitar ou recusar
            </a>
            <div style="font-size:12px;color:#71717a;margin-top:12px;line-height:1.5;">
                Se o botão não funcionar, copie e cole este link no seu navegador:<br>
                <span style="word-break:break-all;color:#0f172a;">{{ $inviteUrl }}</span>
            </div>
        </div>
    </td>
</tr>
@endif

@if($inv->slots && $inv->slots->count() > 0)
<tr>
    <td style="padding:18px 22px 0;">
        <div style="font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#52525b;">
            Dias e horários sugeridos
        </div>
        <div style="margin-top:10px;border:1px solid #e4e4e7;border-radius:14px;overflow:hidden;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                @foreach($inv->slots as $s)
                    <tr>
                        <td style="padding:10px 12px;border-bottom:1px solid #f4f4f5;font-size:13px;color:#18181b;">
                            <strong>{{ $days[(int) $s->day_of_week] ?? 'Dia' }}</strong>
                            <span style="color:#52525b;">
                                @if($s->start_time && $s->end_time)
                                    — {{ substr((string) $s->start_time, 0, 5) }} às {{ substr((string) $s->end_time, 0, 5) }}
                                @elseif($s->start_time)
                                    — a partir de {{ substr((string) $s->start_time, 0, 5) }}
                                @elseif($s->end_time)
                                    — até {{ substr((string) $s->end_time, 0, 5) }}
                                @else
                                    — horário a combinar
                                @endif
                            </span>
                        </td>
                    </tr>
                @endforeach
            </table>
        </div>
    </td>
</tr>
@endif

<tr>
    <td style="padding:18px 22px 22px;">
        <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:14px;padding:12px 12px;">
            <div style="font-size:12px;font-weight:800;color:#065f46;">
                Importante
            </div>
            <div style="font-size:12px;color:#166534;line-height:1.55;margin-top:6px;">
                @if(!empty($hasLinkedAppAccount))
                    Se você já usa o aplicativo, <strong>aceite ou recuse o convite</strong> pelo link acima (faça login se necessário). Após aceitar, o líder entrará em contato pelo app.
                @else
                    A confirmação é feita ao <strong>criar sua conta</strong> no aplicativo com o e-mail indicado no cadastro de voluntário.
                @endif
                @if($expires)
                    Este convite é válido até <strong>{{ $expires }}</strong>.
                @endif
            </div>
        </div>
        <p style="font-size:12px;color:#71717a;margin-top:14px;line-height:1.6;">
            Se você não reconhece este convite, ignore este e-mail.
        </p>
    </td>
</tr>
@include('emails.partials.nova-semente-shell-close')
