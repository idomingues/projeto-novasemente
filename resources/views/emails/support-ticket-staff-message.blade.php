@include('emails.partials.nova-semente-shell-open', ['pageTitle' => $headline])
@include('emails.partials.nova-semente-hero', [
    'eyebrow' => $churchName ?? config('brand.name'),
    'title' => $headline,
    'subtitle' => $typeLabel,
    'variant' => 'emerald',
])
<tr>
    <td style="padding:28px 24px 8px;">
        @if(!empty($staffDisplayName))
            <p style="margin:0 0 14px;font-size:14px;color:#52525b;line-height:1.5;">
                Resposta de <strong style="color:#18181b;">{{ $staffDisplayName }}</strong>
            </p>
        @endif
        <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:14px;padding:18px 16px;font-size:15px;line-height:1.6;color:#065f46;">
            {!! nl2br(e($messageContent)) !!}
        </div>
        @include('emails.partials.transactional-respond-app-pt')
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px auto 0;">
            <tr>
                <td style="border-radius:999px;background:#059669;">
                    <a href="{{ $conversationUrl }}" style="display:inline-block;padding:14px 28px;font-size:13px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.04em;text-transform:uppercase;">
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
@include('emails.partials.nova-semente-shell-close')
