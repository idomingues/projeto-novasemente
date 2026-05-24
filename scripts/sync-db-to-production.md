# Sincronizar banco local → produção

**Ordem:** primeiro o **código** (deploy), depois o **BD** (full local → produção).

---

## Full local → produção (checklist)

Deixa produção **igual** ao banco local (apaga os dados atuais de produção). Fazer **só depois** do deploy do código.

### Fase 1: Deploy do código

Garantir que o código em produção está atualizado (ex.: push na `main` e o GitHub Actions faz o deploy, ou deploy manual). Só depois passar para a Fase 2.

### Fase 2: BD – 1. ⚠️ NO MAC: exportar o banco local

**Sempre no Mac.** Se rodar no servidor, o dump será de produção (sem os teus dados locais, ex. Acervo) e não resolve. O script agora avisa e sai se detectar que está em `/var/www`.

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/projeto-novasemente
./scripts/export-local-db.sh
```

Ou manualmente (banco local: `ns`, user `root`):

```bash
mysqldump -h 127.0.0.1 -P 3306 -u root ns > backup_local_$(date +%Y%m%d_%H%M).sql
```

Fica um ficheiro tipo `backup_local_20260315_1234.sql` na pasta do projeto.

### Fase 2: BD – 2. No servidor: backup da produção (opcional mas recomendado)

```bash
ssh root@SEU_SERVIDOR
cd /var/www/projeto-novasemente
mysqldump -h 127.0.0.1 -P 3306 -u laravel -p --no-tablespaces sistema_igreja > backup_producao_$(date +%Y%m%d_%H%M).sql
```

### Fase 2: BD – 3. Enviar o dump local para o servidor (no Mac)

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/projeto-novasemente
scp backup_local_YYYYMMDD_HHMM.sql root@SEU_SERVIDOR_IP:/var/www/projeto-novasemente/
```

Substitua `backup_local_YYYYMMDD_HHMM.sql` pelo nome real do ficheiro e `SEU_SERVIDOR_IP` pelo IP/host do servidor.

### Fase 2: BD – 4. No servidor: importar o dump (substituir dados de produção)

Use o **nome exato** do ficheiro que enviou no `scp` (ex.: se enviou `backup_local_20260315_1234.sql`, use esse nome).

```bash
cd /var/www/projeto-novasemente
ls backup_local_*.sql
# Confirme qual ficheiro existe, depois:
mysql -h 127.0.0.1 -P 3306 -u laravel -p sistema_igreja < backup_local_20260315_1234.sql
php artisan optimize:clear
php artisan config:cache
```

Pronto. Produção fica com os mesmos dados do local.

---

## Opção A: Só estrutura (migrations)

Use quando a produção **já tem dados reais** e só precisa das novas tabelas/colunas (não quer substituir dados).

### No servidor de produção

```bash
cd /var/www/projeto-novasemente
php artisan migrate --force
php artisan db:seed --force   # só se quiser rodar seeders
php artisan acervo:refresh-thumbnails   # se tiver itens de acervo
```

---

## Opção B: Detalhe do dump/restore (referência)

O fluxo completo está no checklist “Full local → produção” no topo. Abaixo fica o detalhe.

### Passo 1: Exportar banco local (na sua máquina)

**Importante:** Produção costuma ser MySQL. Para fazer fill local → produção, o local também deve usar **MySQL** (dump de SQLite não importa direto em MySQL). No `.env` local use `DB_CONNECTION=mysql` e configure `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`.

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/projeto-novasemente

# Usa automaticamente .env (MySQL ou SQLite)
./scripts/export-local-db.sh
# Gera: backup_local_YYYYMMDD_HHMM.sql
```

Ou manualmente (MySQL):

```bash
mysqldump -h 127.0.0.1 -u root -p nome_do_banco_local > backup_local_$(date +%Y%m%d).sql
```

### Passo 2: Fazer backup da produção (antes de importar)

No servidor:

```bash
cd /var/www/projeto-novasemente
php artisan db:show   # ver credenciais

mysqldump -u USUARIO -p NOME_BANCO_PRODUCAO > backup_producao_$(date +%Y%m%d_%H%M).sql
```

### Passo 3: Enviar dump e importar no servidor

```bash
# Do seu computador, enviar o arquivo
scp backup_local_20250305.sql root@SEU_SERVIDOR:/tmp/

# No servidor
ssh root@SEU_SERVIDOR
cd /var/www/projeto-novasemente
mysql -u USUARIO -p NOME_BANCO < /tmp/backup_local_20250305.sql
php artisan optimize:clear
php artisan config:cache
```

### Passo 4: Verificar .env em produção

Confirme que `APP_KEY`, `DB_*`, `MAIL_*`, etc. estão corretos no `.env` de produção. O dump **não** altera o `.env`.

**E-mail (Brevo):** guia completo em [`scripts/brevo-setup.md`](brevo-setup.md). Resumo no `.env` de produção:

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp-relay.brevo.com
MAIL_PORT=587
MAIL_SCHEME=smtp
MAIL_USERNAME=<login-brevo>
MAIL_PASSWORD=<chave-smtp-brevo>
MAIL_FROM_ADDRESS="noreply@novasemente.com.br"
MAIL_FROM_NAME="Nova Semente"
```

Depois: `php artisan config:cache` e `php artisan mail:check --send=seu@email.com`.

---

## Migrations importantes (últimas alterações)

- `2026_03_14_000001_create_acervo_items_table` – tabela do Acervo
- `2026_03_05_000001_reverse_acervo_items_created_at` – ordem dos itens do acervo
- Tabela `churches` já tinha `logo_url`; agora usada para arquivo em vez de URL

Se a produção estiver desatualizada e não quiser substituir dados, use a **Opção A** (só migrations).
