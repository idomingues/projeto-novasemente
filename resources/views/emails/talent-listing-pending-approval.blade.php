@php
    $typeLabel = \App\Models\TalentListing::typeLabel($listing->type);
    $categoryName = $listing->category?->name ?? '—';
@endphp
<x-mail::message>
# Publicação aguardando aprovação

**{{ $authorName }}** enviou uma publicação na **Conexão de Talentos** que precisa da sua análise.

**Título:** {{ $listing->title }}

**Tipo:** {{ $typeLabel }}

**Categoria:** {{ $categoryName }}

@if($listing->locality)
**Localidade:** {{ $listing->locality }}
@endif

---

**Descrição**

{!! nl2br(e(\Illuminate\Support\Str::limit($listing->description, 800))) !!}

---

Utilize o botão abaixo para **entrar no painel e aprovar ou rejeitar** a publicação. **Não responda a este e-mail** — a caixa não é monitorizada.

<x-mail::button :url="$approvalUrl">
Abrir fila de aprovação
</x-mail::button>

Se o botão não funcionar, copie este endereço no navegador:<br>
<span style="word-break: break-all;">{{ $approvalUrl }}</span>

Obrigado,<br>
{{ config('app.name') }}
</x-mail::message>
