# Rodar o projeto localmente

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
