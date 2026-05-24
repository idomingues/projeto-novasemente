@include('emails.partials.brand')
<p style="margin:24px 0 0;font-size:14px;color:{{ $brandColors['text_muted'] ?? '#52525b' }};line-height:1.5;">
    Atenciosamente,<br>
    <strong style="color:{{ $brandColors['text'] ?? '#18181b' }};">{{ $brandName }}</strong>
</p>
