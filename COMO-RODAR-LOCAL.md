# Rodar o projeto localmente

**Atenção:** Os comandos do **deploy** (git reset --hard, composer install --no-dev, npm ci, route:cache, etc.) são para o **servidor**. Não os rode no Mac ou o ambiente local deixa de funcionar.

---

## Se o local parou de funcionar (recuperação)

Se rodou passos de deploy no Mac por engano, faça:

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/projeto-novasemente

# 1. Restaurar dependências PHP (com dev, sem --no-dev)
composer install

# 2. Restaurar node_modules (use npm install se npm ci deu erro de permissão)
npm install

# 3. Limpar caches do Laravel
php artisan optimize:clear

# 4. Subir de novo (Opção A ou B abaixo)
npm run serve
# ou em dois terminais: php artisan serve  e  npm run dev
```

Se `npm install` der erro de permissão no cache, tente: `npm cache clean --force` e depois `npm install` de novo.

---

## 1. Banco de dados
- MySQL deve estar ligado (XAMPP ou outro).
- O `.env` está com: `DB_DATABASE=ns`, `DB_USERNAME=root`, `DB_PASSWORD=` (vazio).

Se o banco `ns` não existir, crie no MySQL:
```sql
CREATE DATABASE ns CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Restaurar um backup de produção no Mac (recria o `ns`)

1. No `.env`: `DB_CONNECTION=mysql`, `DB_DATABASE=ns`, `DB_USERNAME=root`, `DB_PASSWORD=` (vazio no XAMPP), `DB_HOST=127.0.0.1`, `DB_PORT=3306`.
2. Arranque o MySQL no XAMPP.
3. Na pasta do projeto (substitua o caminho do ficheiro):

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/projeto-novasemente
./scripts/import-prod-backup-to-local.sh --force ~/Downloads/seu_backup.sql
```

Ficheiro `.sql.gz`: use o mesmo comando com o caminho que termina em `.gz`.

Se o dump da produção usar **outro nome de base** (aparece `USE \`...\`;` ou tabelas com prefixo de BD), indique o nome antigo para renomear no fluxo para o `DB_DATABASE` do `.env`:

```bash
./scripts/import-prod-backup-to-local.sh --force --source-db sistema_igreja ~/Downloads/backup.sql
```

**Atenção:** `--force` apaga a base local com o nome `DB_DATABASE` e volta a criá-la antes de importar.

## 2. Subir a aplicação

**Opção A – Um comando (recomendado)**  
No terminal, na pasta do projeto:
```bash
cd /Applications/XAMPP/xamppfiles/htdocs/projeto-novasemente
npm run serve
```

**Opção B – Dois terminais**  
- Terminal 1: `php artisan serve`  
- Terminal 2: `npm run dev`

## 3. Acessar no navegador
Abra: **http://localhost:8000**

## 4. Login
- **E-mail:** ivan@iresult.com.br  
- **Senha:** admin123  

Se o login falhar, no terminal (na pasta do projeto) rode:
```bash
php artisan admin:reset-password
```
Depois tente entrar de novo em http://localhost:8000/login.
