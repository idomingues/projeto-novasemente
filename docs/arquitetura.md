# Arquitetura

## Base verificada

Aplicação Laravel 12 / PHP ^8.2, com Inertia 2, React 18, TypeScript, Vite 7 e Tailwind 4 (dependências declaradas em `composer.json` e `package.json`). Eloquent acessa o banco relacional. Autorização usa Spatie Laravel Permission; o projeto também depende de Sanctum.

| Caminho | Responsabilidade |
| --- | --- |
| `bootstrap/app.php`, `routes/web.php` | Inicialização, middleware e rotas web |
| `app/Http/Controllers`, `app/Http/Requests` | Entrada HTTP, validação e respostas Inertia |
| `app/Services`, `app/Models` | Serviços de domínio e persistência Eloquent |
| `resources/js/app.tsx` | Inicialização React/Inertia |
| `resources/js/Pages`, `Components`, `Layouts` | Telas, componentes e estruturas visuais |
| `resources/css/app.css` | Estilos globais, shell móvel e regras de gestos |
| `database/migrations`, `database/seeders` | Evolução do esquema e cargas de dados |
| `tests/Feature`, `tests/Unit` | Testes PHP |
| `ios`, `android`, `capacitor.config.ts` | Aplicativos Capacitor 8 |

O Capacitor abre um servidor Laravel em WebView; `CAPACITOR_SERVER_URL` define o destino e o padrão configurado é produção. Não basta empacotar arquivos estáticos para executar o sistema.

## Fluxo geral da aplicação

As requisições entram pelas rotas Laravel, passam pelos middlewares e chegam aos controllers. Os Requests concentram validação onde utilizados; controllers consultam modelos Eloquent e serviços de domínio e entregam respostas, incluindo páginas Inertia. No frontend, `resources/js/app.tsx` inicializa a aplicação e resolve as páginas React.

`HandleInertiaRequests` participa do compartilhamento de dados com a interface. `bootstrap/app.php` registra middleware web e aliases de papéis/permissões. A autenticação tem rotas em `routes/auth.php`; comandos e agendamentos são definidos em `routes/console.php`.

## Interfaces e módulos

A interface possui layouts administrativo, autenticado, visitante e móvel em `resources/js/Layouts`. As telas ficam agrupadas por módulo em `resources/js/Pages`, com controllers e modelos correspondentes no backend.

| Área | Pontos de entrada para localizar o código |
| --- | --- |
| Igrejas, usuários e acesso | `ChurchController`, `UserController`, `RoleController`; páginas `Churches`, `Users`, `Roles` |
| Ministérios, voluntários e escalas | `MinistryController`, `VolunteerController`, `ScheduleController`; páginas `Volunteers`, `Escalas` |
| Conteúdo e programação | `NewsController`, `EventController`, `CultoController`, `MusicaController`, controllers de programação |
| Biblioteca e conteúdo bíblico | `LibraryBookController`, `MobileBibleController`, `MobilePromiseBoxController` |
| Comunicação e atendimento | Controllers de conversas, solicitações, suporte e agenda pastoral |
| Missões e participação | Controllers `Mission*`, `Poll*`, `Conviva*`, `TalentConnection*`, `SharedTalent*` |
| Doações e operação | Controllers de campanhas/doações, `InventoryController`, `RoomBookingController` |

Esse mapa orienta a localização dos módulos; não exige ler todos eles. Consulte o controller, serviço, modelo e página envolvidos na tarefa.

## Configuração e serviços compartilhados

`config/` reúne conexão de banco, autenticação, arquivos, sessão, cache, filas e configurações de módulos. `config/app_features.php` e `EnsureAppFeatureEnabled` participam do controle de funcionalidades. O contexto de igreja é resolvido no domínio, incluindo `Church::resolveWorkingId`; não presumir que todas as consultas recebem isolamento automaticamente.

Há serviços específicos para conteúdo externo e notificações, como `YoutubePlaylistsService`, `DriveFolderImagesService`, `FcmMessaging` e `NativePushNotifier`. Consulte sua implementação e configuração somente quando a tarefa envolver a integração correspondente.

Diagnósticos, regras específicas de uma funcionalidade, registros a recuperar e critérios de correção pertencem a `docs/demandas/`. Este documento descreve a organização comum do sistema.

## Validação disponível

`npm run build` executa TypeScript e Vite. `php artisan test` executa os testes PHP; `phpunit.xml.dist` define SQLite em memória. Confirme o ambiente efetivo antes de testar, especialmente se existir configuração em cache. Comandos de setup incluem migrações e não devem ser usados como simples verificação de documentação.
