# Prompts na prática + evolução técnica

Guia para reler. Contexto: trabalho com agente de IA no Nova Semente (Laravel + Inertia/React + Capacitor).

Relacionado: `.cursor/rules/prompt-template-ui.mdc`

---

## 1. Onde você está

**Nível:** pleno forte — perfil de *product engineer* / fullstack que entrega produto real.

**Já é forte em:**
- Entregar produto complexo (app + admin + iOS/Android)
- Olho de produto e UX (consistência, dark mode, iPad, push, performance)
- Sistema de trabalho (regras no Cursor, pacotes, padrões de UI)

**Ainda te segura no “pleno” (não sênior de engenharia):**
- Controllers gordos
- Pouca infra assíncrona (Jobs/Events)
- Policies uneven vs. quantidade de Models
- Commits tipo “Pacote N” (fracos como histórico técnico)
- Produto cresce mais rápido que a rede de testes

**Frase-chave:** o diferencial não é digitar código — é saber se o código está certo para o domínio. O salto para sênior é dados corretos, limites claros, assíncrono, testes nos fluxos críticos e arquitetura que aguenta o próximo ano.

---

## 2. O que usar mais

| Prática | Por quê |
|---|---|
| Jobs / filas | E-mail, FCM, sync, imports — fora do request HTTP |
| Policies em tudo sensível | Menos buraco de permissão no controller |
| Constraints no banco (`unique`, FK) | Evita duplicados em produção |
| Testes de regressão nos fluxos críticos | Login, conversas, voluntário, doações |
| Observabilidade (Sentry / logs) | Saber o que quebrou sem caçar no escuro |
| Extrair Actions | Controller fino → Action/Service |
| Índices + N+1 como hábito | Performance antes de “ficar lento” |
| Prompts com critérios de aceite | Menos retrabalho |
| Commits com o “porquê” | Ajuda você (e o agente) daqui 3 meses |

---

## 3. Onde melhorar (ordem prática)

1. **Integridade de dados** — se não deveria duplicar: constraint + teste, não só UI.
2. **Arquitetura sob crescimento** — feature nova cabe no padrão? Controller > ~300–400 linhas → extrair.
3. **Assíncrono** — coisa >1–2s ou API externa → Job.
4. **Revisão crítica do que a IA gera** — treinar isso sobe o nível mais rápido que mais syntax.
5. **Qualidade do pedido** — claro no *o quê*; completar com *não fazer / edge case / pronto*.

---

## 4. Quatro tipos de prompt

O tipo depende do **risco**, não do tamanho do texto.

### 4.1 Ajuste cosmético (rápido)

**Quando:** texto, cor, espaçamento, “fica grande no mobile”, subtítulo.

```text
Tela [X]: [ajuste 1], [ajuste 2], [ajuste 3].
Restrição: [1 linha].
```

Exemplo:

```text
Menu Mais → subtítulo de Missão: "Cadastro para o Projeto Missão Nova Semente".
Só esse texto; não mexer no restante do card.
```

---

### 4.2 Feature / UI com risco (template completo)

**Quando:** tela nova, modal, lista, fluxo com vários estados, UX elaborada.

```text
Tela/Componente: …
Arquivo (se souber): …

O que quero:
- …
- …

Restrições (NÃO pode):
- …

Critério de pronto:
- …
Print: anexado / não tenho
```

Exemplo:

```text
Tela: Biblioteca → Lição (mobile)

O que quero:
- Anotações por dia da lição
- Ver, editar e apagar anotação
- UX limpa, sem sair da tela da lição

Restrições:
- Não criar página Show dedicada (usar modal/sheet)
- Não misturar com comentários públicos
- Seguir regras do projeto (modal, pt-BR, dark mode)

Critério de pronto:
- Salva no backend
- Legível claro/escuro
- Teste feature cobrindo criar/editar/apagar
```

**Chat novo**, com print se tiver. Não pingar 1 ajuste por mensagem.

---

### 4.3 Bug de produção / dado estranho

**Quando:** “como duplicou?”, “está encaminhada sem departamento”, inconsistência.

```text
Bug: [o que vê]
Onde: [tela/rota/usuário]
Esperado: …
Atual: …
Já olhei: [print / ids / horário]
Hipótese: [opcional]
Peço: diagnosticar causa raiz + corrigir + impedir recorrência (constraint/teste se fizer sentido)
```

Exemplo:

```text
Bug: 3 registros iguais com o mesmo conteúdo/mês, criados pelo cliente.
Onde: [tela X] em produção
Esperado: 1 registro por cliente/mês
Atual: 3 idênticos
Print: anexado
Peço: causa raiz (double submit? race? falta unique?) + fix + proteção no banco/teste
```

Não peça só “sumir da tela” — peça **causa + trava**.

---

### 4.4 Investigação / arquitetura (antes de codar)

**Quando:** push iOS/Android, iPad build, notificações, performance, “até onde estamos prontos?”.

```text
Objetivo: …
Contexto: até onde acho que estamos
Pergunta: o que falta / riscos / opções
Não implemente ainda — só diagnóstico + plano curto (passos)
```

Exemplo:

```text
Objetivo: push nativo Android + iOS
Contexto: temos FCM parcial no projeto
Pergunta: o que já existe, o que falta, riscos de permissão/token
Não implemente ainda. Quero plano em 5–8 passos + o que testar em device.
```

Depois do plano: **chat novo** → “Implementar passo 1–3 do plano”.

---

## 5. Quando usar o quê

| Situação | Prompt | Chat |
|---|---|---|
| Trocar texto/cor/layout pequeno | Cosmético | Pode ser o atual |
| Feature nova / UX / lista+modal | Template completo | **Novo** |
| Dado errado em produção | Bug + causa raiz | **Novo** |
| “Será que dá? / estamos prontos?” | Investigação (sem código) | **Novo** |
| 3–4 ajustes na mesma tela | Um prompt só (lote) | Mesmo chat ok |
| Feature grande (NS Whats, iPad, FCM) | Plano → depois implementação | Plano → chat novo |

---

## 6. Gatilhos mentais

1. Tem lado “não pode”? → escreva em **Restrições**.
2. Pode duplicar / perder dado / permissão errada? → peça **constraint / policy / teste**.
3. Demora ou chama API externa? → diga “usar Job/fila se fizer sentido”.
4. Já existe padrão no projeto? → “seguir regras do projeto” (não repetir dark mode/modal).
5. Ainda decidindo copy/fluxo? → feche a decisão **antes** de mandar.

---

## 7. Rotina do dia

- **Pacote pequeno / cosmético:** 1 prompt em lote.
- **Feature do dia:** chat novo + template completo.
- **Incidente:** chat novo + bug com causa raiz.
- **Dúvida técnica:** investigação sem implementar → só então codar.

---

## 8. O que não precisa repetir no prompt

O projeto já tem regras que o agente deve seguir:

- Contraste claro/escuro → `contraste-dark-mode-cards.mdc`
- Filtro/ordenação por ícone + modal → `list-filtro-ordenacao-padrao.mdc`
- Telas em modal por padrão → `modal-padrao-ui.mdc`
- Criação em lista com botão + → `forms-list-modal.mdc`
- `cursor-pointer` → `cursor-pointer-botoes.mdc`
- Textos em pt_BR → `pt-br-idioma.mdc`

Basta reforçar: “seguir as regras do projeto”.

---

## 9. Regras de ouro (crédito e retrabalho)

1. Junte 3–4 ajustes num prompt só.
2. Chat novo por feature — não arraste threads gigantes.
3. Resultado final + restrições no início, não depois de errar.
4. Anexe o print **antes** de dizer “veja o print”.
5. Feche a decisão antes de mandar.
6. Features grandes: plan mode / investigação primeiro.
