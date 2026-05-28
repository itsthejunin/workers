# Boilerplate Infrastructure with Alchemy

Esta documentação descreve a infraestrutura baseada em containers da aplicação, gerenciada utilizando o provedor Docker da ferramenta **Alchemy** (Infraestrutura como Código).

## Arquitetura de Containers

A infraestrutura provisionada levanta os seguintes componentes no Docker:

1. **Rede Docker (`app-network`)**: Rede isolada para comunicação segura entre os containers.
2. **Redis (`redis-server`)**:
   - Container baseado na imagem remota `redis:7-alpine`.
   - Utiliza um volume Docker persistente (`redis-data`) para não perder os dados caso o container seja recriado.
   - Usado para controle de rate limiting e filas (filas de background).
3. **API (`api-server`)**:
   - Container do servidor web principal (`hono`), expondo a porta `3000` do host para a porta `3000` do container.
   - Variável de ambiente configurada automaticamente para acessar o Redis na mesma rede.
4. **Worker (`worker-server`)**:
   - Container focado em processar as tarefas em background (BullMQ).
   - Utiliza a mesma imagem Docker da API (build automático a partir do `Dockerfile` raiz), porém sobrescreve o comando de entrada (`CMD`) para executar `bun run src/worker/run.ts`.

## Pré-requisitos

Para rodar esta infraestrutura, você precisa ter instalados em sua máquina:

- [Docker](https://www.docker.com/) (em execução)
- [Bun](https://bun.sh/) ou Node.js (via `tsx`)
- Dependências instaladas (`bun install`)

## Como Executar

O script Alchemy (`infra/index.ts`) vai construir a imagem local automaticamente (caso existam modificações no projeto) e subirá todos os containers.

Para provisionar e iniciar a infraestrutura:

```bash
bun run infra/index.ts
```
*(Alternativamente, você pode rodar usando ts-node ou npx tsx `npx tsx infra/index.ts`)*

Durante a execução, o Alchemy verificará:
- A existência e atualização da imagem remota do Redis.
- O build local da aplicação.
- A criação da rede e volume.
- O start de todos os containers atrelados às definições no script.

## Customizando

Para customizar portas, adicionar novas variáveis de ambiente ou escalar mais containers, edite diretamente o arquivo `infra/index.ts`. O Alchemy gerenciará o estado do seu Docker, atualizando os recursos necessários.

Para mais detalhes sobre as definições de container com o Alchemy, acesse a [documentação oficial](https://alchemy.run/providers/docker/).
