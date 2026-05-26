# Job Processing Boilerplate

Sistema de processamento de background jobs baseado em **BullMQ**, com Dashbord de monitoramento (**Workbench**) e arquitetura modular de workers.

## Estrutura
- `src/processor/`: Onde você define a lógica de cada job. Use `BaseProcessor` para garantir tipagem e validação com Zod.
- `src/queue/`: Definições das filas e `jobDisposer` para disparar tarefas com segurança.
- `src/worker/`: O `run.ts` sobe todos os workers configurados automaticamente.
- `server.ts`: API Hono que serve a UI do Workbench e endpoints de disparo.

## Setup Inicial
1. Suba o Redis (ajustado para porta 6380):
   ```bash
   docker-compose -f ../docker-compose.redis.yml up -d
   ```
2. Instale as dependências:
   ```bash
   bun install
   ```
3. Compile a UI do Workbench:
   ```bash
   npm run build:ui
   ```

## Como Rodar
- **Worker (Processador):** `bun run src/worker/run.ts`
- **Servidor (API + Dashboard):** `bun run server.ts`

## Como criar um Job
1. Crie o processador em `src/processor/` estendendo `BaseProcessor`.
2. Adicione-o ao `registry` em `src/registry/index.ts`.
3. Adicione um método helper no `jobDisposer` (`src/queue/disposer.ts`) para disparar o job de forma tipada.
