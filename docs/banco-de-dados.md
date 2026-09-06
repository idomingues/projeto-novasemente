# Banco de dados

## Organização e fontes

A persistência usa Eloquent, com modelos em `app/Models`, evolução de esquema em `database/migrations` e cargas em `database/seeders`. Consulte a migração e o modelo da entidade afetada para campos, índices, casts e relações; este documento é o mapa geral do banco.

`config/database.php` seleciona a conexão por `DB_CONNECTION` (fallback `sqlite`). Na consulta de 06/09/2026, o ambiente Laravel era `local`, com conexão `mysql`, host local e banco `ns`. O inventário de tabelas foi consultado somente para leitura. Produção não foi inspecionada, e o estado local não comprova o esquema ou os dados de outros ambientes.

## Mapa dos principais domínios

Os nomes abaixo foram encontrados no inventário real do banco local; a lista é seletiva.

| Domínio | Tabelas de referência |
| --- | --- |
| Igrejas e acesso | `churches`, `users`, `roles`, `permissions`, `model_has_roles`, `model_has_permissions`, `role_has_permissions` |
| Ministérios e voluntariado | `ministries`, `volunteers`, `ministry_user`, `ministry_volunteer`, `volunteer_church_pipelines` |
| Escalas | `service_schedules`, `schedule_assignments`, `schedule_roles`, `schedule_checkin_dates` |
| Conteúdo e programação | `news`, `events`, `cultos`, `musicas`, `weekly_programs`, `saturday_programs`, `photo_albums` |
| Biblioteca e Bíblia | `library_books`, `library_lesson_notes`, `bible_books`, `bible_verses`, `versiculos_caixinha` |
| Comunicação e atendimento | `church_conversations`, `church_conversation_messages`, `church_solicitations`, `app_support_tickets`, `pastoral_appointments` |
| Missões e participação | `mission_events`, `mission_volunteers`, `polls`, `poll_options`, `poll_votes`, `conviva_classes`, `talent_listings`, `shared_talent_listings` |
| Doações e finanças | `donation_campaigns`, `campaign_donations`, `charity_campaigns`, `charity_donations`, `financial_transactions` |
| Patrimônio e espaços | `inventory_items`, `inventory_movements`, `rooms`, `room_bookings` |
| Infraestrutura | `migrations`, `sessions`, `cache`, `jobs`, `failed_jobs`, `push_tokens` |

## Relações estruturais verificadas nos modelos

- `User` pertence a `Church`; `Ministry` também pertence a `Church`. Verificar o contexto de igreja em cada consulta, sem supor filtro global para todas as entidades.
- Usuários e ministérios se relacionam por `ministry_user`; voluntários e ministérios por `ministry_volunteer`.
- `Volunteer` pertence a `User`; o modelo também possui relações com verificações, etapas por igreja, notas e convites.
- `ScheduleAssignment` possui relações com usuário, voluntário, papel de escala e ministério.
- Papéis e permissões usam Spatie. `User` também expõe `panelRole` por `role_id` e métodos de sincronização; consultar a implementação antes de alterar atribuições de acesso.

Essas são relações declaradas no código. Para confirmar restrições físicas, nulabilidade ou cascatas, verificar a migração e o esquema do ambiente-alvo.

## Convenções de manutenção

Não presumir que todas as entidades usam soft delete, o mesmo nome de tabela ou os mesmos casts. Verificar cada modelo e o esquema real. Migrações podem conter alterações de dados, além de DDL; não executá-las novamente como mecanismo genérico de recuperação.

Antes de alterar dados, identificar ambiente, escopo e dependências, preparar backup e plano de validação e obter autorização para a ação e o ambiente. Não presumir IDs iguais entre bases. Credenciais, dumps e dados pessoais não devem ser incluídos na documentação.

Inventários de registros, comparações DEV/destino e procedimentos de restauração de uma funcionalidade ficam na respectiva demanda em `docs/demandas/`.
