<x-mail::message>
# {{ $headline }}

{{ $introLine }}

@if($detailBlock !== '')
---

{!! nl2br(e($detailBlock)) !!}
@endif

---

<x-mail::button :url="$actionUrl">
{{ $buttonLabel }}
</x-mail::button>

Se o botão não funcionar, copie este endereço no navegador:<br>
<span style="word-break: break-all;">{{ $actionUrl }}</span>

Obrigado,<br>
{{ config('app.name') }}
</x-mail::message>
