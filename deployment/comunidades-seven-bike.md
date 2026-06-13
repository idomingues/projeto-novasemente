# Pacote — Comunidades / Seven Bike (produção)

Script e checklist para levar o **Seven Bike Nova Semente** (e o módulo Comunidades) para produção.

## Arquivos do pacote

| Arquivo | Função |
|---------|--------|
| [`deploy-comunidades-seven-bike.sh`](deploy-comunidades-seven-bike.sh) | Roda no servidor: migrate + instala capa + verifica URL |
| [`../database/seed-assets/communities/seven-bike-nova-semente.jpg`](../database/seed-assets/communities/seven-bike-nova-semente.jpg) | Arte versionada (copiada para `storage` no deploy) |
| `php artisan communities:install-defaults` | Comando Artisan (BD + arquivo) |

## Deploy automático (GitHub Actions)

Após push na `main`, o workflow [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) já executa `communities:install-defaults` após as migrations.

## Deploy manual no servidor

```bash
cd /var/www/projeto-novasemente
git fetch origin main && git reset --hard origin/main
composer install --no-dev --optimize-autoloader
npm ci --no-fund
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
bash deployment/deploy-comunidades-seven-bike.sh
php artisan config:cache
php artisan route:cache
```

Ou, se o código já estiver atualizado e só faltar a bike:

```bash
cd /var/www/projeto-novasemente
bash deployment/deploy-comunidades-seven-bike.sh
```

## O que o pacote faz

1. Confirma que `database/seed-assets/communities/seven-bike-nova-semente.jpg` existe
2. Roda `php artisan migrate --force`
3. Roda `php artisan communities:install-defaults` (cria/atualiza registro + copia capa para `storage/app/public`)
4. Limpa cache
5. Testa `GET /media/communities/covers/seven-bike-nova-semente.jpg` (HTTP 200)
6. Atualiza o descritivo da versão mais recente (`deployment/release-notes.txt` → `php artisan app:release-notes`)

## Notas de versão

Edite [`release-notes.txt`](release-notes.txt) antes do deploy. O histórico aparece ao tocar no badge **v…** no topo do app.

Para atualizar só o texto da versão atual em produção:

```bash
php artisan app:release-notes
# ou versão específica:
php artisan app:release-notes --for-version=v20.0.5
```

## Verificação no app

- **App:** Mais → **Comunidades** → card Seven Bike com arte
- **Admin:** Publicação → **Comunidades**
- **URL direta da capa:** `https://app.novasemente.com.br/media/communities/covers/seven-bike-nova-semente.jpg`

## Se a capa ainda não aparecer

1. Confirme o arquivo no servidor:
   ```bash
   ls -la database/seed-assets/communities/seven-bike-nova-semente.jpg
   ls -la storage/app/public/communities/covers/seven-bike-nova-semente.jpg
   ```
2. Rode de novo: `php artisan communities:install-defaults`
3. Confirme que `app/Http/Controllers/PublicDiskFileController.php` inclui o prefixo `communities/` em `ALLOWED_PREFIXES`
4. Rebuild do front: `npm run build` (URLs de imagem usam `appUrl`)
