# Nova Semente — Instruções para agentes

## Diretrizes centrais da iResult

Este projeto segue a versão `v1.0.0` das [Diretrizes IA da iResult](https://github.com/iResult/diretrizes-ia). Elas definem padrões compartilhados de requisitos, frontend, backend, dados, segurança, testes, entrega e operação.

Consulte somente a diretriz central relacionada à tarefa. As regras específicas do Nova Semente permanecem neste arquivo e em `docs/`; não copie arquitetura, banco ou regras de negócio de outro projeto.

- Requisitos e critérios de aceite: `requisitos-e-aceite.md`.
- Interface e experiência: `frontend.md`.
- Backend, dados e persistência: `backend-e-dados.md`.
- APIs, segurança ou privacidade: `apis-e-integracoes.md` e `seguranca-e-privacidade.md`.
- Testes, publicação ou rollback: `testes-e-entrega.md`.
- Logs, backup ou recuperação: `operacao-e-recuperacao.md`.

Se o repositório central não estiver disponível no ambiente de execução, registrar essa limitação e usar apenas as regras locais verificáveis; não inventar o conteúdo ausente.

- Trabalhe somente no escopo da demanda atual e respeite a etapa autorizada.
- Não leia toda a pasta `docs/` automaticamente. Consulte apenas a demanda e os documentos relacionados à tarefa.
- Antes de mudanças relevantes, apresente diagnóstico baseado em evidências e plano de execução. Diferencie fatos, hipóteses e pendências.
- Não altere banco de dados, registros ou produção sem autorização explícita para a ação e o ambiente.
- Antes de criar tabela, verificar a estrutura existente no banco, nos modelos e nas migrações.
- Manter o padrão visual do projeto. Para tarefas de interface, consultar a seção [Frontend](docs/regras-gerais.md#frontend) e os componentes existentes relacionados à demanda.
- Evite refactors fora do escopo e preserve os padrões existentes do projeto.
- Execute os testes pertinentes às alterações e verifique os critérios de aceite. Relate o que mudou, os resultados e eventuais limitações de validação.
- Quando houver risco ou ambiguidade relevante, pare a ação afetada, explique o ponto e peça aprovação antes de prosseguir.

## Consulta seletiva da documentação

- Para demandas documentadas, consultar o arquivo correspondente em `docs/demandas/`.

- Use `docs/README.md` apenas como índice quando não souber onde procurar; não carregue todos os documentos.
- Home, Horários ou Meditação Diária: leia `docs/demandas/home-horarios.md` e os arquivos de código ali indicados.
- ProPresenter: leia `docs/demandas/propresenter.md`; o escopo ainda precisa ser definido.
- Consulte `docs/arquitetura.md` para localizar camadas; `docs/banco-de-dados.md` para persistência; `docs/regras-gerais.md` quando houver mudanças de comportamento ou validação.
- Leia somente as seções relevantes e confirme as informações no código atual. Atualize a documentação existente; não crie um `.md` para cada pequena alteração.
- Estrutura única: `arquitetura.md`, `banco-de-dados.md` e `regras-gerais.md` são referências gerais do projeto. Diagnósticos, planos e critérios de aceite específicos ficam no documento da demanda. A organização está definida em `docs/README.md`.
