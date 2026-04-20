<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>{{ $headline }}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f5;padding:28px 14px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e4e4e7;">
                    <tr>
                        <td style="background:linear-gradient(135deg,#0f766e 0%,#115e59 50%,#134e4a 100%);padding:32px 28px;text-align:center;">
                            <p style="margin:0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;font-weight:600;color:#ccfbf1;">
                                {{ $churchName ?? config('app.name') }}
                            </p>
                            <h1 style="margin:10px 0 0;font-size:22px;font-weight:800;color:#f0fdfa;line-height:1.25;">
                                {{ $headline }}
                            </h1>
                            <p style="margin:10px 0 0;font-size:15px;color:#99f6e4;line-height:1.4;">
                                {{ $typeLabel }}
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:28px 24px 8px;">
                            @if(!empty($staffDisplayName))
                                <p style="margin:0 0 14px;font-size:14px;color:#52525b;line-height:1.5;">
                                    Resposta de <strong style="color:#18181b;">{{ $staffDisplayName }}</strong>
                                </p>
                            @endif
                            <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:14px;padding:18px 16px;font-size:15px;line-height:1.6;color:#134e4a;">
                                {!! nl2br(e($messageContent)) !!}
                            </div>
                            @include('emails.partials.transactional-respond-app-pt')
                            <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px auto 0;">
                                <tr>
                                    <td style="border-radius:12px;background:#0f766e;">
                                        <a href="{{ $conversationUrl }}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.02em;">
                                            Abrir suporte na app
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin:18px 0 0;font-size:12px;color:#a1a1aa;line-height:1.5;text-align:center;">
                                Se o botão não abrir, copie este link:<br>
                                <span style="word-break:break-all;color:#71717a;">{{ $conversationUrl }}</span>
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:0 24px 28px;">
                            <p style="margin:0;padding-top:20px;border-top:1px solid #f4f4f5;font-size:12px;color:#a1a1aa;text-align:center;line-height:1.5;">
                                {{ config('app.name') }} — notificação do suporte na app.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
