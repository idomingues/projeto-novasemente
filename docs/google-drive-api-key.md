## Configurar Google Drive API Key (para Fotos)

### 1) Criar e ativar a API
- Acesse `https://console.cloud.google.com/`
- Selecione/crie um **Projeto**
- Vá em **APIs e serviços → Biblioteca**
- Ative **Google Drive API**

### 2) Criar a chave
- Vá em **APIs e serviços → Credenciais**
- **Criar credenciais → Chave de API**

### 3) Restringir corretamente (recomendado)
Como o consumo é feito **no servidor (Laravel)**:
- **Restrições de API**: selecione **Google Drive API**
- **Restrições do aplicativo**:
  - Para testar: **Nenhuma**
  - Em produção: **Endereços IP** (IP do seu servidor)

> Evite **HTTP referrers** aqui: isso é para uso em JavaScript no navegador.

### 4) Colocar no `.env`
No `.env` do servidor:

```
GOOGLE_DRIVE_API_KEY=SUA_CHAVE_AQUI
```

Depois rode:

```bash
php artisan config:clear
php artisan cache:clear
```

### 5) Resultado esperado
Ao abrir um álbum em **Fotos**, deve sair do modo “Visualização básica do Drive” (iframe) e usar a galeria do app:
- 1 foto por linha
- sem nome do ficheiro
- viewer quase tela cheia

