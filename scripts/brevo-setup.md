# E-mail transacional com Brevo (produção)

O `.env` de produção **não vai para o Git**. Configure no servidor Digital Ocean em `/var/www/projeto-novasemente/.env`.

## 1. Conta Brevo

1. Acesse [https://www.brevo.com](https://www.brevo.com) e crie ou entre na conta.
2. Menu **Configurações** → **SMTP e API** → aba **SMTP**.
3. Na aba **SMTP**, anote o **login SMTP** (e-mail com que você entrou no Brevo) → vai em `MAIL_USERNAME`.
   - **Não** use o e-mail do usuário que pede recuperação de senha.
   - **Não** use `MAIL_FROM_ADDRESS` como login.
4. Clique em **Gerar uma nova chave SMTP** → copie a chave (vai em `MAIL_PASSWORD`).
   - Use a **chave SMTP** (`xsmtpsib-...`), não a chave de API REST (`xkeysib-...`).

## 2. Domínio remetente (importante)

Para e-mails não caírem em spam, autentique o domínio:

1. **Remetentes** → **Domínios** → adicionar `novasemente.com.br`.
2. O Brevo mostra registros **DNS** (SPF, DKIM, etc.) para colar no painel do domínio (Registro.br, Cloudflare, etc.).
3. Aguarde status **Verificado** (pode levar algumas horas).

O endereço em `MAIL_FROM_ADDRESS` deve ser desse domínio, por exemplo:

- `noreply@novasemente.com.br`
- ou `contato@novasemente.com.br`

## 3. Bloco no `.env` do servidor (produção)

Substitua os valores entre `<>`:

```env
APP_ENV=production

MAIL_MAILER=smtp
MAIL_HOST=smtp-relay.brevo.com
MAIL_PORT=587
MAIL_SCHEME=smtp
MAIL_USERNAME=<e-mail-de-login-do-brevo>
MAIL_PASSWORD=<chave-smtp-gerada-no-brevo>
MAIL_FROM_ADDRESS="noreply@novasemente.com.br"
MAIL_FROM_NAME="Nova Semente"
```

Remova ou comente linhas antigas como `MAIL_MAILER=log`.

## 4. Aplicar no Droplet

```bash
ssh root@SEU_IP
cd /var/www/projeto-novasemente
nano .env   # cole o bloco acima

php artisan config:clear
php artisan config:cache
php artisan mail:check --send=seu@email.com
```

Se aparecer sucesso, teste em `https://app.novasemente.com.br/forgot-password`.

## 5. Marca nos e-mails

No `.env` de produção, use `APP_NAME="Nova Semente"` (evita aparecer «Laravel» no rodapé). Opcional: `BRAND_TAGLINE`, `BRAND_LOGO_URL`, `BRAND_APP_URL`. O logo padrão é `/logo-ns.png` na URL do app.

## 6. Fila (e-mails em segundo plano)

Vários e-mails do sistema usam fila (`ShouldQueue`). Confirme que o worker roda no servidor, por exemplo:

```bash
php artisan queue:work --tries=3
```

(Em produção costuma usar **Supervisor** para manter o processo ativo.)

## O que enviar para quem for ajudar (sem expor segredos)

**Pode enviar:**

- Se o domínio no Brevo está **Verificado** (sim/não).
- O `MAIL_FROM_ADDRESS` escolhido.
- Saída de `php artisan mail:check` (sem colar senha).
- Mensagem de erro ao pedir recuperação de senha.

**Não envie** em chat, e-mail ou Git:

- Chave SMTP (`MAIL_PASSWORD`).
- Chave de API do Brevo.
- Arquivo `.env` completo.

## Problemas comuns

| Sintoma | Causa provável |
|--------|----------------|
| Sucesso no app, nada na caixa | Ainda `MAIL_MAILER=log` ou `config:cache` antigo |
| Erro de autenticação SMTP | `MAIL_USERNAME` ou `MAIL_PASSWORD` errados; usou API key em vez de SMTP key |
| E-mail em spam | Domínio não verificado no Brevo; falta SPF/DKIM |
| Doação/suporte sem e-mail | Fila parada (`queue:work` não está rodando) |
