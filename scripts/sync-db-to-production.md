# Sincronizar banco local → produção

Este guia cobre duas formas de deixar a base de produção igual à local.

---

## Opção 1: Só estrutura (migrations)

Use quando a produção **já tem dados reais** e só precisa das novas tabelas/colunas.

### No servidor de produção

```bash
cd /var/www/projeto-novasemente
php artisan migrate --force
php artisan db:seed --force   # só se quiser rodar seeders
php artisan acervo:refresh-thumbnails   # se tiver itens de acervo
```

---

## Opção 2: Estrutura + dados (dump/restore)

Use quando quer que a produção fique **exatamente** igual ao ambiente local.  
Atenção: isso **apaga todos os dados atuais** da produção.

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

---

## Migrations importantes (últimas alterações)

- `2026_03_14_000001_create_acervo_items_table` – tabela do Acervo
- `2026_03_05_000001_reverse_acervo_items_created_at` – ordem dos itens do acervo
- Tabela `churches` já tinha `logo_url`; agora usada para arquivo em vez de URL

Se a produção estiver desatualizada, a **Opção 1** costuma ser suficiente.
