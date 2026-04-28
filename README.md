# Botman - AI Agent Instance

Este projeto segue a arquitetura de 3 camadas definida em `AGENTE.md`.

## Estrutura Atualizada

- `directives/`: Instruções e procedimentos (Markdown).
- `execution/`: Scripts determinísticos (Node.js/Python).
  - `telegram_bot/`: Código principal do bot de notícias.
- `data/`: Persistência de dados (usuários, notícias enviadas).
- `.env`: Configurações e segredos.

## Como Executar o Bot

1. Instale as dependências: `npm install`
2. Configure o seu token no arquivo `.env`
3. Inicie o bot: `npm start`

Para desenvolvimento com auto-reload: `npm run dev`

---
*Created by Botman Orchestrator*

---
*Created by Botman Orchestrator*
