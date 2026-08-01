@props(['url'])
@include('emails.partials.brand')
<tr>
<td class="header">
<a href="{{ $url ?: $brandAppUrl }}" style="display: inline-block; text-decoration: none;">
<table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
<tr>
<td style="text-align: center;">
<img src="{{ $brandLogoUrl }}" class="logo" alt="{{ $brandName }}" width="56" height="56" style="display: block; margin: 0 auto; border-radius: 999px; border: 2px solid #e4e4e7;">
<span style="display: block; margin-top: 10px; font-size: 16px; font-weight: 700; color: #18181b; line-height: 1.25; letter-spacing: 0; text-transform: none;">
{{ $brandName }}
</span>
</td>
</tr>
</table>
</a>
</td>
</tr>
