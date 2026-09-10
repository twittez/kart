# Prompt para subir esta oferta em um projeto novo

Cole o texto abaixo no chat do projeto novo, junto com este pacote:

---

Instale neste projeto o conteúdo do pacote anexado. É a oferta do **Kart Velox 4 rodas**,
somente visual. Siga exatamente estas regras:

1. Copie todos os arquivos de `src/` mantendo os mesmos caminhos: rotas em `src/routes`,
   componentes em `src/components`, helpers em `src/lib` e `src/utils`, imagens em `src/assets`.
   Copie também `src/styles.css`, `src/start.ts`, `src/server.ts`, `src/router.tsx` e `vite.config.ts`.
2. Não crie banco de dados, não crie webhooks, não integre gateway de pagamento e não
   adicione nenhum pixel de anúncios. A oferta deve rodar sem nenhuma chave ou segredo.
3. Mantenha `src/utils/primecash.functions.ts` e `src/utils/cards.functions.ts` como estão:
   são versões de demonstração. O Pix gera um código fictício e o cartão é sempre recusado,
   oferecendo o Pix em seguida.
4. Nunca armazene número completo de cartão, validade completa ou CVV.
5. Não recrie painel administrativo, rastreamento de visitantes nem página de rastreio.
6. Instale as dependências que faltarem (`qrcode`, `zod`, `lucide-react`, `@tanstack/react-router`,
   `@tanstack/react-start`, Tailwind v4) e apague de `package.json` o que não for usado.
7. Ao final, confira que estas páginas abrem sem erro: `/`, `/checkout/garantia`,
   `/checkout/dados`, `/checkout/pix?s=demo-13790-BR123456789BR-AB12`, `/checkout/upsell`,
   `/checkout/sucesso`, `/sobre`, `/contato`, `/faq` e as políticas.
8. Rode a verificação de tipos e teste no celular e no computador.

Preserve o design, os textos, os preços e as imagens exatamente como estão no pacote.
