# Configuração do Servidor para SPA

Este documento explica como configurar o servidor para que a aplicação React funcione corretamente como Single Page Application (SPA).

## Problema

Quando você acessa uma rota diretamente (ex: `/reset-password`), o servidor tenta encontrar um arquivo físico nesse caminho. Como não existe, retorna 404. Para SPAs, todas as rotas devem retornar o `index.html`, deixando o React Router (ou lógica de roteamento) gerenciar as rotas no cliente.

## Soluções por Provedor

### Vercel

Arquivo `vercel.json` na raiz do projeto (já criado):

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Netlify

Arquivo `public/_redirects` (já criado):

```
/*    /index.html   200
```

### Apache

Arquivo `public/.htaccess` (já criado):

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

### Nginx

Adicione no bloco `server` do seu `nginx.conf`:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

### Outros Provedores

A maioria dos provedores modernos (Cloudflare Pages, AWS Amplify, etc.) detecta automaticamente SPAs. Se não funcionar, verifique a documentação do seu provedor sobre "SPA routing" ou "client-side routing".

## Verificação

Após configurar, teste:

1. Acesse `https://seu-dominio.com/reset-password` diretamente
2. Deve carregar a aplicação (não retornar 404)
3. O React deve detectar a rota e renderizar a página correta

## Importante

- Os arquivos de configuração já foram criados no projeto
- Certifique-se de que o arquivo correto está no lugar certo para seu provedor
- Após fazer deploy, teste todas as rotas principais da aplicação

