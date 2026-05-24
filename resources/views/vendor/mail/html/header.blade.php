@props(['url'])
@include('emails.partials.brand')
<tr>
<td class="header">
<a href="{{ $url ?: $brandAppUrl }}" style="display: inline-block; text-decoration: none;">
<table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
<tr>
<td style="vertical-align: middle; padding-right: 12px;">
<img src="{{ $brandLogoUrl }}" class="logo" alt="{{ $brandName }}" width="56" height="56" style="display: block; border-radius: 999px; border: 2px solid #e4e4e7;">
</td>
<td style="vertical-align: middle; text-align: left;">
<span style="display: block; font-size: 17px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: #18181b; line-height: 1.2;">
{{ $brandName }}
</span>
@if($brandTagline !== '')
<span style="display: block; font-size: 12px; font-weight: 500; color: #52525b; margin-top: 4px; letter-spacing: 0; text-transform: none;">
{{ $brandTagline }}
</span>
@endif
</td>
</tr>
</table>
</a>
</td>
</tr>
