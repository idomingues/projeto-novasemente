@include('emails.partials.brand')
<x-mail::layout>
<x-slot:header>
<x-mail::header :url="$brandAppUrl">
{{ $brandName }}
</x-mail::header>
</x-slot:header>

{{ $slot }}

@isset($subcopy)
<x-slot:subcopy>
<x-mail::subcopy>
{{ $subcopy }}
</x-mail::subcopy>
</x-slot:subcopy>
@endisset

<x-slot:footer>
<x-mail::footer>
© {{ date('Y') }} {{ $brandName }} — {{ parse_url($brandAppUrl, PHP_URL_HOST) ?: $brandAppUrl }}

{{ config('brand.footer_note') }}
</x-mail::footer>
</x-slot:footer>
</x-mail::layout>
