@php
    $campaign = $donation->campaign;
    $amount = number_format((float) $donation->amount, 2, ',', '.');
@endphp
<x-mail::message>
# Doação confirmada

Olá{{ $donation->user?->name ? ', **'.$donation->user->name.'**' : '' }}!

Sua doação na campanha **{{ $campaign?->title }}** foi registrada com sucesso.

**Valor:** R$ {{ $amount }}

**Data:** {{ $donation->confirmed_at->timezone(config('app.timezone'))->format('d/m/Y H:i') }}

**Igreja:** {{ $campaign?->church?->name }}

@if($donation->is_anonymous)
Sua doação foi registrada como anônima na lista pública de contribuições.
@endif

Você solicitou este e-mail de confirmação ao registrar a doação. Usamos seu endereço cadastrado no app apenas para este aviso.

<x-mail::button :url="$myDonationsUrl">
Ver minhas doações
</x-mail::button>

@include('emails.partials.signoff')
</x-mail::message>
