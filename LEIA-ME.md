# Oferta Kart Velox 4 rodas — somente visual

Este pacote contém **apenas o visual completo da oferta do Kart Velox 4 rodas**.

## O que está incluído
- Página do produto (`/`) com galeria, variações de cor, especificações, avaliações e rodapé.
- Checkout completo: `/checkout/garantia`, `/checkout/dados` (endereço, order bumps, frete,
  Pix e cartão com parcelamento até 3x sem juros), `/checkout/pix` (QR Code, copia e cola,
  código de rastreio na tela, envio de comprovante) e `/checkout/upsell`.
- Página de sucesso e páginas institucionais: sobre, contato, FAQ, privacidade, termos,
  reembolso e envio.
- Imagens somente do kart e dos order bumps usados na oferta.

## O que foi retirado de propósito
- Nenhum gateway de pagamento (Axxon, Winner, PrimeCash) e nenhuma chave de API.
- Nenhum pixel (TikTok/Google), nenhum webhook, nenhum banco de dados.
- Painel administrativo, rastreamento de visitantes e página de rastreio por banco.
- Outros produtos e suas imagens.

## Como o pagamento se comporta
As telas funcionam do início ao fim em modo demonstração: o Pix é gerado com um código
fictício (`src/utils/primecash.functions.ts`) e a tentativa de cartão é sempre recusada,
oferecendo o Pix (`src/utils/cards.functions.ts`). Nada é salvo em nenhum lugar.

## Como rodar
```bash
bun install
bun run dev
```
Abre em `http://localhost:8080`.
