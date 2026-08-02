@php
    $campaign = $donation->campaign;
    $donorName = $donation->donorDisplayName();
    $amount = number_format((float) $donation->amount, 2, ',', '.');
@endphp
<x-mail::message>
# Nova doação na campanha

**Campanha:** {{ $campaign?->title }}

Foi confirmada uma doação nesta campanha.

**Valor:** R$ {{ $amount }}

**Doador:** {{ $donorName }}

**Data:** {{ $donation->confirmed_at->timezone(config('app.timezone'))->format('d/m/Y H:i') }}

**Igreja:** {{ $campaign?->church?->name }}

@if($donation->ocr_suggested_amount !== null)
Valor lido no comprovante (OCR): R$ {{ number_format((float) $donation->ocr_suggested_amount, 2, ',', '.') }}.
@endif

Este aviso é automático para a equipe financeira. O comprovante completo está disponível apenas no painel interno, não neste e-mail.

<x-mail::button :url="$dashboardUrl">
Abrir painel do tesoureiro
</x-mail::button>

@include('emails.partials.signoff')
</x-mail::message>
