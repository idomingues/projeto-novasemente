# Regras gerais

- Trabalhar no escopo autorizado e preservar alterações locais preexistentes. Documentação não autoriza implantação nem restauração de dados.
- Separar comportamento observado, requisito e hipótese. Registrar ambiente e data das verificações; não declarar uma correção concluída só porque há alterações no código.
- Respeitar o contexto da igreja e as permissões de cada operação. Verificar a seleção de igreja e a autorização no fluxo afetado; não presumir que um filtro aplicado em um módulo protege todos os outros.
- Validar entradas pelos Requests existentes. Reaproveitar serviços de domínio em vez de duplicar regras na interface.
- Para datas e horários, consultar o fuso configurado no módulo afetado. Não substituir silenciosamente a referência do servidor pelo relógio do navegador.
- Preservar textos em português, comportamento móvel, áreas seguras e navegação. Mudanças de rolagem precisam de verificação visual com toque, além dos testes de backend.
- Não publicar `.env`, senhas, tokens, dumps ou dados pessoais nos documentos. Alterações de banco e produção exigem autorização explícita para ação e ambiente.
- Executar verificações proporcionais: links e referências para documentação; testes de comportamento para regras; build para frontend. Relatar testes não executados e limitações.
- Manter docs curtos, atualizar os existentes e criar arquivos em `docs/demandas` somente quando houver contexto específico relevante.

## Frontend

Diretrizes gerais para alterações de interface. Base: componentes, layouts e estilos inspecionados em 06/09/2026. Os exemplos abaixo descrevem padrões existentes; as verificações exigidas não significam que todas as telas já foram auditadas.

### Estrutura e reutilização

- Usar React com TypeScript, Inertia e Tailwind existentes. Manter props tipadas e o alias `@/` definido em `tsconfig.json`; não introduzir outra biblioteca de interface para resolver um caso já atendido.
- Colocar telas em `resources/js/Pages`, componentes reutilizáveis em `resources/js/Components` e usar o layout adequado de `resources/js/Layouts`. Seguir primeiro uma tela equivalente do mesmo módulo.
- Antes de criar componente, procurar os existentes: `PageHeader`, `Card`, `PrimaryButton`, `SecondaryButton`, `DangerButton`, `TextInput`, `SelectInput`, `Textarea`, `InputLabel`, `InputError` e `Modal`. Para listas e detalhes, verificar também `ListCard` e `RecordDetail`.
- Usar a navegação e os formulários Inertia conforme o fluxo existente (`Link`, `router`, `useForm` e rotas nomeadas quando aplicáveis). Preservar erros de validação e feedback do servidor. Permissões visuais não substituem autorização no backend.

### Identidade visual

- Reutilizar as classes e variantes do componente equivalente; evitar redefinir cores, bordas, espaçamentos e botões em cada tela.
- `resources/css/app.css` define a escala `brand`, incluindo `brand-600` (#008d36) e `brand-500` (#41b144). Usar esses tokens quando houver destaque de marca. A interface também usa superfícies `zinc`; o botão primário compartilhado é escuro no tema claro e branco no escuro. Não converter todos os botões para verde.
- Preservar a família sans-serif do layout e a hierarquia existente. `PageHeader` usa título `text-2xl sm:text-3xl`; `Card` usa `rounded-3xl`, borda e sombra discreta. São referências dos componentes compartilhados, não medidas obrigatórias para todo componente especializado.
- Manter as variantes `dark:` e o mecanismo de tema de `Contexts/ThemeContext.tsx`, com classe `html.dark`. Conferir texto, fundo, bordas e estados nos dois temas.
- Reutilizar os ícones existentes, incluindo Heroicons onde já utilizados. Não substituir ícones ou recursos de marca por novos estilos sem necessidade da demanda.

### Responsividade, rolagem e modais

- Projetar para telas estreitas e ampliar com os breakpoints usados no módulo. Conferir textos longos, botões, listas e formulários em celular e desktop; não depender de larguras fixas que cortem conteúdo.
- Preservar áreas seguras (`safe-area-inset-*`), barras fixas e espaço para navegação. Nos layouts com shell fixo, identificar qual elemento deve rolar antes de alterar altura, `overflow` ou `touch-action`.
- Evitar rolagens aninhadas desnecessárias. Carrosséis devem permitir acesso ao conteúdo vertical; verificar gestos sobre o componente e fora dele. Mudanças globais de CSS exigem conferir outras telas que compartilham o layout.
- Reutilizar `Modal`, baseado em Headless UI. Seu `footer` permite ações fora da área rolável; `disableBodyScroll` serve a conteúdos que implementam sua própria rolagem. Preservar fechamento, foco, restauração do scroll e ações acessíveis com teclado virtual aberto.
- Manter `text-base` nos campos estreitos, como em `TextInput`, para evitar o zoom automático do Safari causado por fontes menores. Verificar WebView iOS/Android quando o comportamento alterado depender do aplicativo nativo.

### Acessibilidade e estados de interação

- Usar elementos semânticos: botão para ação, link para navegação, rótulo associado ao campo e nome acessível para controles com apenas ícone. Manter hierarquia de títulos e alternativas textuais para imagens informativas.
- Garantir foco visível e operação por teclado; em diálogos, verificar entrada e retorno do foco e fechamento quando permitido. Não remover os comportamentos fornecidos pelos componentes compartilhados.
- Exibir carregamento/processamento, vazio, erro e sucesso quando aplicáveis. Evitar envio duplicado durante processamento e conservar os dados digitados em falhas de validação; usar `InputError` e os mecanismos de feedback existentes.
- Não comunicar informação apenas por cor. Verificar legibilidade e contraste nos dois temas e manter controles confortáveis para toque.
- Respeitar `prefers-reduced-motion`, já utilizado no CSS global, ao adicionar animações. Não introduzir movimento indispensável à compreensão do conteúdo.

### Validação de alterações

Executar `npm run build` para alterações de frontend e os testes de comportamento pertinentes. Conferir visualmente a tela afetada nos tamanhos, temas e estados relevantes, incluindo navegação, formulários, modais e rolagem quando envolvidos. Build aprovado não comprova usabilidade ou acessibilidade. Registrar na demanda o que foi validado e eventuais limitações.

Para alterações apenas nesta documentação, verificar referências e formatação; não é necessário executar build da aplicação.
