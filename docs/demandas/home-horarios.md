# Home — Horários, rolagem e Meditação Diária

**Status em 06/09/2026:** testes automatizados e build do frontend aprovados; validação visual da rolagem e restauração no ambiente de destino pendentes.

## Contexto e objetivo

Foi relatado um bug de rolagem na Home causado pela exibição temporária de Horários. A relação técnica e a causa raiz ainda precisam ser confirmadas no código.

Esta demanda reúne a restauração dos registros de Horários, a correção definitiva da rolagem e a regra de exibição de Meditação Diária aos sábados.

## Escopo e regras

### Restauração de Horários

1. Identificar onde os registros são armazenados e verificar primeiro se existe soft delete e se os registros estão apenas marcados como excluídos.
2. Se houver soft delete, propor a restauração pelo mecanismo existente, preservando os dados e vínculos.
3. Somente se for confirmada exclusão física, comparar com DEV e avaliar a recuperação dos registros necessários, validando correspondência, integridade e possíveis duplicidades.
4. Qualquer restauração ou alteração de dados depende de autorização explícita para a ação e o ambiente. Não copiar a base de DEV integralmente nem sobrescrever registros existentes indiscriminadamente.

### Rolagem da Home

- Identificar e corrigir definitivamente a causa do bug associado à exibição temporária de Horários.
- Validar a rolagem antes, durante e depois da exibição de Horários, inclusive nas transições de carregamento e atualização de conteúdo.
- Preservar o funcionamento dos demais componentes da Home.

### Regra de sábado

- No sábado, se Horários estiver ativo e tiver conteúdo para exibição, o card de Meditação Diária não aparece.
- No sábado, se Horários estiver inativo ou sem conteúdo para exibição, manter Meditação Diária conforme as demais regras existentes.
- Nos demais dias, manter o comportamento normal existente.
- Confirmar no diagnóstico os critérios de “ativo”, “conteúdo para exibição” e o fuso horário usado para determinar o sábado. Não inventar novas regras.

## Critérios de aceite

- [ ] O diagnóstico identifica a causa raiz da rolagem, com evidências e arquivos envolvidos.
- [ ] A situação dos registros de Horários foi verificada, priorizando soft delete; DEV só foi comparado se confirmada exclusão física.
- [ ] Os registros necessários foram restaurados após autorização explícita, com integridade e sem duplicidades, ou eventual impedimento foi documentado para decisão.
- [ ] A Home permite rolagem normal antes, durante e depois da exibição de Horários, sem saltos ou travamentos indevidos nas transições verificadas.
- [ ] No sábado, Horários ativo e com conteúdo oculta o card de Meditação Diária.
- [ ] No sábado, Horários inativo ou sem conteúdo mantém Meditação Diária conforme as regras existentes.
- [ ] Nos demais dias, o comportamento existente foi preservado.
- [ ] Os testes pertinentes e as verificações dos cenários acima foram executados e relatados, incluindo limitações ou pendências.
- [ ] As alterações ficaram restritas a esta demanda.

## Diagnóstico técnico — evidências de 06/09/2026

### Dados disponíveis em DEV

Consulta somente leitura ao banco `ns`, conexão MySQL local e ambiente Laravel `local`. Todos os registros abaixo pertencem a `church_id = 1`, com `is_active = 1` e `show_on_home = 1`; `end_time` está nulo em todos.

| ID | Dia | Título | Início / modo |
| --- | --- | --- | --- |
| 1 | Quarta | CULTO DE ORAÇÃO | 20:00 / fixed |
| 2 | Sexta | INÍCIO DO SÁBADO | Pôr do sol / sunset |
| 3 | Sábado | 1º CULTO | 09:30 / fixed |
| 4 | Sábado | ESTUDO | 11:00 / fixed |
| 5 | Sábado | CLASSE COMEÇOS | 15:00 / fixed |
| 6 | Sábado | DESPEDIDA DO SÁBADO | Pôr do sol / sunset |
| 7 | Sábado | 2º CULTO | 12:00 / fixed |

`app/Models/WeeklyProgram.php` não usa SoftDeletes; a tabela local não possui `deleted_at`; `WeeklyProgramController::destroy` exclui fisicamente. A inspeção de DEV confirma a fonte disponível, não uma exclusão no ambiente afetado. O destino ainda não foi identificado/consultado; nenhum registro foi restaurado nesta tarefa.

Para restaurar: comparar o destino com esses registros e seus demais campos, mapear a igreja correta, distinguir ausência de desativação ou filtro de exibição, preparar apenas as inserções/alterações necessárias e evitar colisões de IDs. Após autorização para o ambiente, fazer backup, aplicar em transação e validar integridade e ausência de duplicidades. Ver [banco de dados](../banco-de-dados.md).

### Esquema da programação semanal

`WeeklyProgram` → `weekly_programs`; relação `belongsTo(Church)`. A migração `2026_07_11_020000_create_weekly_programs_table.php` define chave estrangeira `church_id` para `churches`, com exclusão em cascata, e índice por igreja/atividade/ordem.

| Campos | Uso |
| --- | --- |
| `id`, `church_id` | Identificação e igreja |
| `day_of_week`, `when_label` | Dia (0 domingo a 6 sábado) e rótulo |
| `title`, `body`, `lines` | Conteúdo; `lines` tem cast de array no modelo |
| `time_mode`, `start_time`, `end_time`, `display_time` | Modo `fixed` / `sunset` e horários |
| `home_message`, `image_url` | Apresentação na Home |
| `show_on_home`, `is_active`, `sort_order` | Visibilidade e ordenação |
| `created_at`, `updated_at` | Datas de controle |

A migração declara `lines` como JSON; a inspeção do banco local apresenta `longtext`. Não presumir que a representação física de JSON é idêntica em todos os ambientes.

Desativação (`is_active = false`), ocultação da Home e filtros de data não significam exclusão.

Não executar novamente migrações de carga para recuperar dados: há migrações posteriores que dividem cultos e alteram títulos.

### Exibição e regra de sábado

- `app/Services/WeeklyProgramService.php`: filtra igreja, atividade, `show_on_home`, dia atual e ocorrência futura/em andamento. Horário fixo ou pôr do sol; usa `sabbath.timezone`, confirmado como `America/Sao_Paulo`.
- Sem fim explícito, infere o fim pelo próximo item, limitado a 90 minutos. Sem próximo item e sem fim explícito, o evento deixa de aparecer quando não é mais futuro. Portanto, registro ativo não garante card visível o dia inteiro.
- Existe exceção temporária para CULTO DE ORAÇÃO somente em julho de 2026; não explica ausência em setembro.
- `app/Http/Controllers/MobileController.php`: a alteração local já presente retorna `meditationBanner = null` no sábado quando `homeCards()` não está vazio. Nos outros cenários, delega às regras de `MeditationHomeBannerService`.
- `resources/js/Pages/Mobile/Home.tsx`: renderiza Meditação conforme seus critérios e o carrossel quando há cards. A Meditação aparece antes do carrossel no código atual; a descrição do bug não deve ser tomada como ordem fixa dos componentes.

### Rolagem e correção já presente no código local

Arquivos: `resources/js/Layouts/MobileLayout.tsx`, `resources/js/Components/Mobile/WeeklyProgramHomeCarousel.tsx`, `resources/js/Pages/Mobile/Home.tsx` e `resources/css/app.css`.

O diff preexistente mostra troca de `touch-pan-x` por `touch-auto` no carrossel, inclusão de `allowHorizontalPan` no layout e uso dessa opção na Home, além de `touch-action: auto` nos ancestrais selecionados pela classe `ns-home-horizontal-pan`. O shell mantém altura `100dvh` e overflow externo restrito; o `main` continua responsável pela rolagem vertical normal.

A restrição anterior de gestos no carrossel é uma hipótese sustentada pelo diff para o bloqueio ao iniciar o movimento sobre Horários. O aumento de conteúdo sozinho não comprova a causa. Não houve reprodução visual nesta tarefa: a correção existente ainda precisa ser testada com toque, cards carregando/atualizando, zero/um/vários cards, usuário autenticado/visitante e navegação até o fim da Home. Confirmar acesso à Meditação nos cenários em que ela deve aparecer; no sábado com programação exibível, sua ausência é intencional.

### Validação realizada em 06/09/2026

Foi executado:

- `php artisan test tests/Feature/WeeklyProgramTest.php tests/Feature/MeditationHomeBannerTest.php`: **18 testes passaram, 475 asserções**.
- `npm run build`: **TypeScript e Vite passaram**, com geração do bundle de produção.

Esses resultados validam a programação, a regra de sábado da Meditação e a compilação do frontend. Eles não comprovam gestos ou rolagem no navegador/WebView, nem restauram dados em outro ambiente.

Não foi executado:

- validação manual em celular ou WebView, incluindo rolagem vertical antes/durante/depois do carrossel;
- consulta ao ambiente de destino ou escrita de registros;
- implantação em homologação ou produção.

Os critérios de aceite de visualização e dados permanecem abertos.

## Registro do processo de trabalho

O processo planejado funcionou para a etapa de diagnóstico e validação automatizada:

1. A demanda delimitou escopo, evidências, critérios de aceite e autorização necessária.
2. O código e o banco local foram consultados antes de concluir a causa ou propor restauração.
3. A verificação encontrou os sete registros em DEV, confirmou que o modelo não usa soft delete e evitou qualquer escrita sem destino autorizado.
4. Os testes específicos e o build foram executados e produziram evidência objetiva.
5. As pendências foram mantidas abertas em vez de marcar a demanda como concluída.

O processo ainda precisa da etapa operacional: identificar o destino, obter autorização específica para restauração, validar a interface em dispositivo real e registrar os resultados. Esse registro confirma que documentação seletiva, diagnóstico baseado em evidências, validação proporcional e separação entre fato e pendência são úteis; também mostra que a conclusão da demanda exige evidência manual e operacional além de testes automatizados.

## Plano de execução

### Etapa 1 — somente diagnóstico

Ler `AGENTS.md` e esta demanda. Investigar o código e, com os acessos disponíveis, realizar apenas consultas de leitura necessárias para verificar os registros. Verificar soft delete antes de considerar DEV; comparar DEV somente diante de exclusão física confirmada.

**Não alterar código, banco ou dados.** Entregar diagnóstico com causa raiz, evidências, arquivos envolvidos, situação dos registros e plano de correção e validação. Se faltarem código, acesso ou evidências, registrar o impedimento sem presumir conclusões.

### Etapa 2 — pendente de aprovação

Após aprovação explícita do diagnóstico e do plano, implementar a correção de rolagem e a regra de sábado. Executar a restauração somente com autorização explícita para os dados e o ambiente envolvidos.

Executar os testes pertinentes, validar os critérios de aceite e relatar as alterações e resultados. Atualizar esta demanda para concluída somente quando os critérios estiverem atendidos e as pendências resolvidas.
