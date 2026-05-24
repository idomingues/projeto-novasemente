<x-mail::message>
# Check-in liberado

O check-in para a escala do dia **{{ $dateLabel }}** foi liberado.

<x-mail::button :url="$actionUrl">
Fazer check-in
</x-mail::button>

Se o botão não funcionar, copie este endereço no navegador:<br>
<span style="word-break: break-all;">{{ $actionUrl }}</span>

@include('emails.partials.signoff')
</x-mail::message>
