@php
    $brandName = (string) config('brand.name', 'Nova Semente');
    $brandTagline = (string) config('brand.tagline', '');
    $brandAppUrl = rtrim((string) config('brand.app_url', config('app.url', '/')), '/');
    $brandLogoUrl = (string) (config('brand.logo_url') ?: asset('logo-ns.png'));
    $brandColors = config('brand.colors', []);
@endphp
