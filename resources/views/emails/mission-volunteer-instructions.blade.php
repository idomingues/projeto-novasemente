<x-mail::message>
# Olá, {{ $volunteerName }}!

Obrigado por concluir seu **cadastro missionário** na {{ $churchName }}.

Nossa equipe missionária recebeu suas informações e entrará em contato conforme a disponibilidade informada.

## Próximos passos

@foreach ($instructionLines as $line)
- {{ $line }}
@endforeach

Se tiver dúvidas, responda a este e-mail ou aguarde nosso contato pelo telefone informado no cadastro.

Com carinho,<br>
Equipe Missão — {{ $churchName }}
</x-mail::message>
