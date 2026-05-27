# Caixinha Bíblica

Este projeto possui a funcionalidade **Caixinha Bíblica** para gerar uma lista curada de versículos curtos, positivos, encorajadores e apropriados para leitura devocional rápida.

O objetivo é selecionar versículos que “fazem sentido sozinhos”, evitando textos que costumam depender de contexto (genealogias, leis cerimoniais/técnicas, narrativas históricas sem aplicação direta e versos violentos).

## Fonte de dados

- **Livros**: `bible_books`
- **Versículos**: `bible_verses`

Os nomes dos livros usados nos `INSERT`s vêm de `bible_books.name` (pt-BR, conforme a importação).

## Como gerar o seed SQL

O comando:

```bash
php artisan bible:caixinha-gerar
```

Opções úteis:

```bash
php artisan bible:caixinha-gerar --min-nota=8 --max-chars=220 --limit=500 --out=database/sql/versiculos_caixinha.seed.sql
php artisan bible:caixinha-gerar --dry-run
```

## Algoritmo (resumo)

### 1) Pré-filtros (ignorar)

Um versículo é descartado se:

- **muito curto** (menos de 25 caracteres) ou **muito longo** (padrão: > 220 caracteres)
- parece **genealogia/lista de nomes** (múltiplos “filho de”, “gerou”, sequência de nomes)
- contém **violência** (palavras como “matar”, “sangue”, “espada”, “guerra”, etc.)
- parece **lei cerimonial/técnica** (ex.: “holocausto”, “altar”, “impuro”, etc.)
- parece **dependente de contexto** (ex.: começa com “Portanto”, “Assim”, “E aconteceu…”, etc.) → isso não descarta sempre, mas penaliza a nota

### 2) Boost por versículos populares

Algumas referências muito conhecidas recebem boost direto (nota/peso altos) para garantir que a lista final tenha “mensagens de Deus” clássicas e impactantes (ex.: Isaías 41:10, João 3:16, Salmos 23:1 etc.).

### 3) Classificação por categoria

Categorias suportadas:

- Esperança
- Fé
- Confiança
- Oração
- Perdão
- Gratidão
- Família
- Salvação
- Volta de Jesus
- Sábado
- Consolo
- Coragem
- Sabedoria

Cada categoria tem um conjunto de **palavras-chave** em pt-BR; a categoria final é a de maior score.

### 4) Nota (1 a 10) e peso

Heurística de nota:

- base 5
- + sinais devocionais (promessa explícita, tom de oração, consolo/esperança, etc.)
- + presença explícita de Deus/Jesus/Espírito
- + categorias com score alto
- - penalidade se começar com conectivos (“Portanto”, “Assim…”) ou tom histórico (“E aconteceu…”)
- + bônus se for curto (mais “impactante”)

Critério final:

- só entram versículos com **nota >= 8**

