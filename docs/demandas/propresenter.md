# ProPresenter

**Status em 06/09/2026:** demanda registrada; escopo funcional e integração pendentes de definição.

## Evidência atual

A busca por `propresenter` e `pro.presenter` em `app`, `resources`, `routes`, `config`, `tests`, `scripts` e `docs` não encontrou implementação. O inventário de tabelas do banco local não apresentou tabela com esse nome. Isso não exclui ferramentas externas ou outra cópia do projeto.

Há módulos próximos, mas nenhuma ligação com ProPresenter foi comprovada:

- `app/Models/Culto.php` e `Musica.php`: conteúdo com título, URL do YouTube, publicação e igreja; controllers e rotas próprios em `routes/web.php`.
- `app/Models/SaturdayProgram.php`: PDF da programação de sábado, agenda estruturada e status de processamento; `SaturdayProgramPdfParser` e `SaturdayProgramService` tratam esse domínio.

## Próxima etapa

Confirmar o resultado desejado (por exemplo, importar, exportar ou controlar apresentações), qual instalação/versão está envolvida, origem e destino dos dados e um exemplo real de entrada/saída. As possibilidades são perguntas de levantamento, não requisitos aprovados.

Somente após esse levantamento, definir contrato, autenticação, mapeamento de conteúdo, comportamento em falhas e critérios de aceite verificáveis. Não inventar endpoints, formatos, tabelas ou dependências. Consultar arquitetura e banco apenas nos pontos afetados pela solução definida.
