<x-mail::message>
# Nova mensagem da igreja

Relativa ao seu pedido: **{{ $typeLabel }}**.

---

{!! nl2br(e($messageContent)) !!}

---

Para **responder**, utilize a conversa do pedido **no app web** (ou na app no telemóvel). **Não responda a este e-mail** — a caixa de entrada não é monitorizada.

<x-mail::button :url="$conversationUrl">
Abrir conversa no app
</x-mail::button>

Se o botão não funcionar, copie este endereço no navegador:<br>
<span style="word-break: break-all;">{{ $conversationUrl }}</span>

Obrigado,<br>
{{ config('app.name') }}
</x-mail::message>
