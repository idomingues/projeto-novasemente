# Documentação Nova Semente

Documentação verificada em 06/09/2026 no código local (HEAD `76f2651`, com alterações preexistentes) e no banco local `ns`. O estado local não comprova o estado de produção.

## Estrutura adotada

```text
AGENTS.md
docs/
├── README.md
├── arquitetura.md
├── banco-de-dados.md
├── regras-gerais.md
└── demandas/
    ├── home-horarios.md
    └── propresenter.md
```

Os documentos gerais são únicos e permanentes para o projeto inteiro. Não criar arquitetura, banco ou regras gerais separados para cada demanda.

- `AGENTS.md`: instruções essenciais de trabalho para a IA e orientação de leitura.
- `docs/README.md`: índice e definição desta organização.
- `arquitetura.md`: tecnologias, camadas, módulos e fluxo geral do sistema.
- `banco-de-dados.md`: mapa dos domínios, tabelas, relações principais e convenções de persistência.
- `regras-gerais.md`: regras e padrões compartilhados entre funcionalidades.
- `demandas/<nome>.md`: objetivo, escopo, evidências, arquivos/tabelas envolvidos, pendências e critérios de aceite de uma demanda que exija contexto próprio.

Uma funcionalidade pode aparecer no mapa geral como parte do sistema. Seu diagnóstico, registros a recuperar e plano de correção ficam na demanda. Não duplicar os documentos gerais dentro de cada demanda.

## Como consultar e manter

Começar por `AGENTS.md`. Se houver documento da demanda, ler esse documento e o código relacionado. Consultar apenas as seções dos documentos gerais necessárias ao trabalho; usar este índice quando precisar localizar uma referência.

Ao concluir uma demanda, atualizar seu status e validações. Atualizar os documentos gerais somente se houver uma mudança permanente na estrutura ou nas regras compartilhadas. Pequenas alterações não exigem novo arquivo. Uma demanda concluída não precisa ser dividida em vários documentos.

Leia somente o documento pertinente à demanda:

| Documento | Quando consultar |
| --- | --- |
| [Arquitetura](arquitetura.md) | Localizar camadas, fluxo e pontos de entrada |
| [Banco de dados](banco-de-dados.md) | Consultas, modelos, migrações e recuperação de dados |
| [Regras gerais](regras-gerais.md) | Alterações de comportamento, permissões e validação; [diretrizes de frontend](regras-gerais.md#frontend) para interface |
| [Home e horários](demandas/home-horarios.md) | Registros da programação, rolagem e Meditação Diária |
| [ProPresenter](demandas/propresenter.md) | Levantar o escopo dessa integração ainda não localizada |

Referências anteriores, sob demanda: [Caixinha bíblica](caixinha-biblica.md), [Google Drive](google-drive-api-key.md) e [Prompts e evolução](prompts-e-evolucao-pratica.md). Para execução local, consulte também `../COMO-RODAR-LOCAL.md`, confrontando instruções com a configuração atual.

Atualize o documento existente quando necessário. Crie uma demanda separada apenas quando a funcionalidade ou correção exigir contexto próprio; pequenas alterações não precisam de outro arquivo.
