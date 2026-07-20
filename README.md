# Petterson's Paint Company CMS

Landing page multilíngue com painel administrativo, uploads e Open Graph dinâmico, projetada especificamente para a Netlify.

## Recursos

- Rascunho, pré-visualização, publicação, histórico e restauração.
- Proteção contra sobrescrita concorrente e backup JSON.
- Conteúdo EN/ES/PT com URLs próprias e `hreflang`.
- Portfólio, depoimentos, indicadores e formulário de orçamento com fotos.
- Gestão de leads, mídia e métricas de conversão no painel.
- SEO local com JSON-LD, sitemap, robots e Open Graph por idioma.

## Arquitetura

- `public/`: landing page e painel em `/admin/`.
- `content/default.json`: conteúdo inicial e fallback versionado.
- `netlify/functions/`: API de login, conteúdo e uploads.
- `netlify/functions/page.mjs`: entrega o HTML com metadados Open Graph dinâmicos e cache na CDN.
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
