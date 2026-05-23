<x-mail::message>
# {{ $headline }}

{{ $introLine }}

@if($detailBlock)
{{ $detailBlock }}
@endif

<x-mail::button :url="$actionUrl">
{{ $buttonLabel }}
</x-mail::button>

Compartilhe talentos com respeito e apoio mútuo na comunidade.

</x-mail::message>
