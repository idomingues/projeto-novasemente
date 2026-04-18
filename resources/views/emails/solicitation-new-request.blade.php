<x-mail::message>
# {{ $headline }}

{{ $introLine }}

---

**Resumo do pedido**

{!! nl2br(e($messagePreview)) !!}

---

Para **abrir a inbox e responder** no painel da igreja, utilize o botão abaixo. **Não responda a este e-mail** — a caixa de entrada não é monitorizada.

<x-mail::button :url="$inboxUrl">
Abrir solicitação
</x-mail::button>

Se o botão não funcionar, copie este endereço no navegador:<br>
<span style="word-break: break-all;">{{ $inboxUrl }}</span>

Obrigado,<br>
{{ config('app.name') }}
</x-mail::message>
