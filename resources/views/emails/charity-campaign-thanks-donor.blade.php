@php
    $churchName = $campaign->church?->name;
@endphp
<x-mail::message>
# Obrigado pela sua contribuição!

Olá{{ $donor->name ? ', **'.$donor->name.'**' : '' }}!

A campanha **{{ $campaign->title }}** foi encerrada. A igreja preparou uma mensagem de agradecimento:

@if($campaign->thanks_message)

{!! str_replace("\n", '<br>', e($campaign->thanks_message)) !!}

@endif

@if($churchName)
**Igreja:** {{ $churchName }}
@endif

<x-mail::button :url="$campaignUrl">
Ver campanha no app
</x-mail::button>

@include('emails.partials.signoff')
</x-mail::message>
