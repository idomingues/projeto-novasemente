@include('emails.partials.brand')
@php
    $variant = $variant ?? 'emerald';
    if ($variant === 'dark') {
        $gradient = 'linear-gradient(135deg,'.($brandColors['hero_dark_from'] ?? '#18181b').' 0%,'.($brandColors['hero_dark_to'] ?? '#52525b').' 100%)';
        $eyebrowColor = '#d4d4d8';
        $titleColor = '#fafafa';
        $subtitleColor = '#d4d4d8';
    } else {
        $gradient = 'linear-gradient(135deg,'.($brandColors['hero_emerald_from'] ?? '#0f766e').' 0%,'.($brandColors['hero_emerald_to'] ?? '#134e4a').' 100%)';
        $eyebrowColor = '#ccfbf1';
        $titleColor = '#f0fdfa';
        $subtitleColor = '#99f6e4';
    }
    $eyebrow = $eyebrow ?? $brandName;
@endphp
<tr>
    <td style="background:{{ $gradient }};padding:28px 24px;text-align:center;">
        <p style="margin:0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;font-weight:600;color:{{ $eyebrowColor }};">
            {{ $eyebrow }}
        </p>
        <h1 style="margin:10px 0 0;font-size:22px;font-weight:800;color:{{ $titleColor }};line-height:1.25;">
            {{ $title }}
        </h1>
        @if(!empty($subtitle))
            <p style="margin:10px 0 0;font-size:15px;color:{{ $subtitleColor }};line-height:1.4;">
                {{ $subtitle }}
            </p>
        @endif
    </td>
</tr>
