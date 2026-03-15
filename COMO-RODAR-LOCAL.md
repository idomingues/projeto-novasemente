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
- **E-mail:** admin@example.com  
- **Senha:** admin123  

Se o login falhar, no terminal (na pasta do projeto) rode:
```bash
php artisan admin:reset-password
```
Depois tente entrar de novo em http://localhost:8000/login.
