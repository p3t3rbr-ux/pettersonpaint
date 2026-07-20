# Petterson's Paint Company CMS

Landing page multilíngue com painel administrativo, uploads e Open Graph dinâmico, projetada especificamente para a Netlify.

## Arquitetura

- `public/`: landing page e painel em `/admin/`.
- `content/default.json`: conteúdo inicial e fallback versionado.
- `netlify/functions/`: API de login, conteúdo e uploads.
- `netlify/edge-functions/`: injeta metadados Open Graph dinâmicos no HTML.
- Netlify Blobs: persiste o JSON editado e as imagens entre deploys, sem banco externo.

## Configuração obrigatória na Netlify

Crie estas variáveis de ambiente em **Project configuration > Environment variables**:

- `ADMIN_PASSWORD`: senha administrativa forte, com pelo menos 10 caracteres.
- `SESSION_SECRET`: segredo aleatório com pelo menos 24 caracteres. Gere com `node -e "console.log(crypto.randomBytes(32).toString('hex'))"`.

Depois, faça um novo deploy. O painel estará disponível em `/admin/`.

## Desenvolvimento

```bash
npm install
npm run dev
```

Para o login local, coloque `ADMIN_PASSWORD` e `SESSION_SECRET` no ambiente antes de executar a Netlify CLI. Nunca salve senhas no repositório.

## Uploads

São aceitas imagens JPG, PNG, WEBP e GIF de até 4 MB. Os arquivos ficam no store `pettersons-media`; o conteúdo fica em `pettersons-content`.
