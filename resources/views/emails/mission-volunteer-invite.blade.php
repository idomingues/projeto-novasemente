<x-mail::message>
# Olá, {{ $volunteerName }}!

Obrigado por participar do programa **Missão** na {{ $churchName }}.

Nossa equipe missionária analisou seu cadastro e gostaria de dar continuidade ao seu engajamento conosco.

<x-mail::button :url="$formUrl">
Ver formulário Missão
</x-mail::button>

Se tiver dúvidas, responda a este e-mail ou fale conosco pelo WhatsApp informado no cadastro.

Com carinho,<br>
Equipe Missão — {{ $churchName }}
</x-mail::message>
