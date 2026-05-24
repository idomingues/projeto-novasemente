@include('emails.partials.brand')
<x-mail::layout>
{{-- Header --}}
<x-slot:header>
<x-mail::header :url="$brandAppUrl">
{{ $brandName }}
</x-mail::header>
</x-slot:header>

{{-- Body --}}
{!! $slot !!}

{{-- Subcopy --}}
@isset($subcopy)
<x-slot:subcopy>
<x-mail::subcopy>
{!! $subcopy !!}
</x-mail::subcopy>
</x-slot:subcopy>
@endisset

{{-- Footer --}}
<x-slot:footer>
<x-mail::footer>
© {{ date('Y') }} {{ $brandName }} · [{{ parse_url($brandAppUrl, PHP_URL_HOST) ?: $brandAppUrl }}]({{ $brandAppUrl }})

{{ config('brand.footer_note') }}
</x-mail::footer>
</x-slot:footer>
</x-mail::layout>
