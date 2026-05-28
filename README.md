# Job Processing Boilerplate

Sistema avançado de processamento de background jobs baseado em **BullMQ**, com suporte a **flows/workflows**, **circuit breaker**, **batch processing**, dashboard de monitoramento (**Workbench**) e arquitetura modular de workers.

## 🚀 Features

### Core Processing
- **BullMQ**: Job queue avançado com retries, backoff exponencial, scheduling e prioritização
- **Hono**: Web framework ultra-rápido para API e interface do Workbench
- **Zod**: Validação runtime robusta para dados de jobs
- **Pino**: Logging estruturado JSON com redação de dados sensíveis
- **Metrics**: Endpoint Prometheus (`/metrics`) e JSON (`/api/metrics`)
- **Health**: Checks detalhados (`/health/ready`, `/health/detailed`)
- **Telemetry**: Worker heartbeat via Redis com métricas de sistema
- **Rate Limiting**: Por-IP com configuração via env vars
- **Shared Redis Connection**: Única conexão compartilhada entre filas, workers, rate limiter e telemetria
- **Feature Flags**: Toggle funcionalidades via env vars (`FEATURE_*`)

### Advanced Processing
- **Flows / Workflows**: Criação de árvores de jobs com dependências pai-filho (parent-child)
  - Filhos executam primeiro; pais apenas após todos os filhos completarem
  - Suporte a chains sequenciais e padrões de fan-in/fan-out
  - Persistência de resultados entre steps via `getChildrenValues()`
- **Circuit Breaker**: Tolerância a falhas para chamadas de API externas
  - Estados: CLOSED → OPEN → HALF_OPEN
  - Configurável por failure threshold, timeout e recovery
- **Job Deduplication**: Previne jobs duplicados dentro de janela de tempo (TTL configurável por fila)
- **Batch Processing**: Interface para processamento em lote de jobs homogêneos
- **Priority Queues**: Suporte a prioridade por fila (1=alta, 10=baixa)
- **Connection Pooling**: Conexão Redis única otimizada para alta concorrência

## 🏗️ Estrutura

```
src/
├── config/        # Configurações (env, queues, feature flags)
├── processor/     # Lógica dos jobs (extends BaseProcessor)
│   └── flow/      # Processors específicos para workflows
├── workflow/      # Flows / Workflows (manager, builder, examples)
├── queue/         # Filas e jobDisposer (com dedup e shared connection)
├── worker/        # Runner dos workers (com telemetry)
├── registry/      # Registry de processadores
├── middleware/    # HTTP middleware (auth, rate limit, logging, security)
├── health/        # Health checks (Redis + queue status)
├── metrics/       # Métricas Prometheus
├── system/        # Telemetria (worker heartbeat)
├── shared/        # Schemas compartilhados (jobs, flows)
├── utils/         # Utilitários (logger, AppError, test helpers, circuit breaker, redis connection)
└── scripts/       # Ferramentas de linha de comando (make-job, etc.)
```

### Fluxo de Dados

```
Client (HTTP/RPC)
      │
      ▼
 jobDisposer  ──> Queue (Redis/BullMQ)
      │
      ▼
 Worker (run.ts)
      │
      ▼
 Processor (validateAndHandle)
      │
      ▼
   Zod Schema Validation  ──> Business Logic
                         ↓
                  [Para flows: getChildrenValues()]
```

## 🔧 Setup Inicial

```bash
# 1. Iniciar Redis (com Redis Commander opcional para visualização)
docker compose up -d

# 2. Instalar dependências
bun install

# 3. Copiar variáveis de ambiente
cp .env.example .env

# 4. Compilar UI do Workbench (se necessário)
bun run build:ui

# 5. Iniciar serviços
# Terminal 1: Worker
bun run worker

# Terminal 2: API Server + Workbench
bun run server
```

## 📝 Como criar um Job

Use o script de scaffolding:

```bash
bun run make:job ProcessPayment
```

Isso criará:
- `src/processor/process-payment.ts` (classe do processor)
- Registra o schema em `src/shared/jobs.ts`
- Registra o processor em `src/registry/index.ts`

### Passos manuais (se preferir):
1. Crie o processador em `src/processor/` estendendo `BaseProcessor`
2. Adicione ao `registry` em `src/registry/index.ts`
3. Adicione método no `jobDisposer` (`src/queue/disposer.ts`)

## 🔄 Como criar um Workflow (Flow)

Workflows permitem definir dependências entre jobs em forma de árvore.

### Via script (recomendado)
```bash
bun run make:job ProcessPayment --queue payment-queue
```

### Programaticamente

#### 1. Chain sequencial (ex: AI Content Generation)
```typescript
import { flowManager } from "./src/workflow/manager";
import { createAiContentFlow } from "./src/workflow/examples/ai-content";

const flow = createAiContentFlow("Serverless AI", "technical");
const { parentJobId } = await flowManager.create(flow);
// Execução: research → outline → write → review → publish
```

#### 2. Fan-in paralelo (ex: Data Pipeline ETL)
```typescript
import { createDataPipelineFlow } from "./src/workflow/examples/data-pipeline";

const flow = createDataPipelineFlow("postgres", "analytics", "incremental");
const result = await flowManager.create(flow);
// extract-* rodam paralelo → transform → load
```

#### 3. Fan-out (ex: Notificação Multicanal)
```typescript
import { createNotificationFlow } from "./src/workflow/examples/notification";

const flow = createNotificationFlow("user-123", "both", "Welcome!", "Hello World");
await flowManager.create(flow);
// check-preferences → format-message → [send-email, send-push] → log-delivery
```

#### 4. Via builder (fluent API)
```typescript
import { FlowBuilder } from "./src/workflow/builder";

const customFlow = new FlowBuilder("my-workflow")
  .queue("my-queue")
  .step("step-a", { input: "data" })
  .step("step-b")
  .dependsOn("step-a")
  .step("step-c")
  .dependsOn("step-b")
  .build();

await flowManager.create(customFlow);
```

#### 5. Via disposer (para uso interno)
```typescript
import { jobDisposer } from "./src/queue/disposer";

await jobDisposer.startFlow(flowDefinition);
await jobDisposer.startChain("my-queue", [step1, step2, step3]);
const status = await jobDisposer.getFlowStatus("my-queue", parentJobId);
```

### Observabilidade de Workflows

Cada step em um workflow gera logs estruturados:
```json
{
  "flowId": "ai-content-generation-123abc",
  "step": "ai-write",
  "status": "started"
}
```

Métricas Prometheus disponíveis:
```
flow_steps_total{flow="ai-content",step="write",status="completed"} 1
flow_duration_seconds{flow="ai-content"} 45.2
```

## 🧪 Testando

```bash
# Executar todos os testes
bun test

# Executar testes específicos
bun test tests/workflow/
bun test tests/processors/

# Executar com cobertura
bun test --coverage
```

## 📡 Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `bun run server` | Inicia servidor Hono + Workbench |
| `bun run worker` | Inicia workers BullMQ |
| `bun run make:job <Name>` | Gera scaffold de novo job |
| `bun run make:job <Name> --queue <QueueName>` | Job com fila customizada |
| `bun run make:job <Name> -t` | Job com teste unitário |
| `bun test` | Executa testes |
| `bun test --watch` | Testes em modo watch |
| `bun run lint` | Executa ESLint |
| `bun run lint --fix` | ESLint com auto-fix |
| `bun run typecheck` | Executa TypeScript check |
| `bun run build:ui` | Compila UI do Workbench |

## 🌐 Endpoints da API

| Path | Método | Descrição |
|------|--------|-----------|
| `/health` | GET | Health check simples |
| `/health/ready` | GET | Readiness check detalhado (Redis + filas) |
| `/health/detailed` | GET | Status completo com métricas |
| `/metrics` | GET | Métricas no formato Prometheus |
| `/api/metrics` | GET | Métricas em JSON |
| `/api/flows/ai-content` | POST | Dispara AI content flow |
| `api/flows/data-pipeline` | POST | Dispara data pipeline flow |
| `api/flows/notification` | POST | Dispara notification flow |
| `api/flows/:queueName/:parentJobId` | GET | Status de um workflow específico |
| `/admin` | GET | Workbench Dashboard |
| `/admin/*` | * | Recursos estáticos do Workbench |

## 💰 Configuração

Todas as opções configuráveis estão em `.env.example`:

```
# Node Environment
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Feature Flags
FEATURE_TELEMETRY=true
FEATURE_METRICS_ENDPOINT=false
FEATURE_CRON_JOBS=true
FEATURE_RATE_LIMITING=true
FEATURE_JOB_DEDUP=false
FEATURE_WORKER_HEARTBEAT=true

# Rate Limiting
RATE_LIMIT_POINTS=100
RATE_LIMIT_DURATION=900

# Job Defaults
DEFAULT_JOB_ATTEMPTS=3
DEFAULT_JOB_BACKOFF_DELAY=1000
DEFAULT_JOB_TIMEOUT=30000

# Health Check
HEALTH_CHECK_INTERVAL=30000

# Queue Configurations (JSON override)
# QUEUES_CONFIG={"email-queue":{"workerConcurrency":5},"pipeline-queue":{"priority":2}}
```

## 📚 Documentação Adicional

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) - Diagrama de arquitetura e padrões
- [`docs/guides/QUICKSTART.md`](docs/guides/QUICKSTART.md) - Guia de início rápido
- [`docs/guides/FLOWS.md`](docs/guides/FLOWS.md) - Guia completo de workflows
- [`docs/guides/CIRCUIT-BREAKER.md`](docs/guides/CIRCUIT-BREAKER.md) - Guia do circuit breaker

## ⚙️ Ambientes

- **Development**: Logging detalhado, hot-reload (via bun watch)
- **Production**: Logging em JSON, otimizações de performance
- **Test**: Banco de dados isolado, mocks de serviços externos

## 🐞 Troubleshooting

### Problemas comuns

1. **Worker não processa jobs**
   - Verifique se o Redis está rodando: `docker compose ps`
   - Verifique conexão: `bun run src/health/checker.ts`

2. **Jobs ficando travados**
   - Verifique se há consumidores suficientes: `workerConcurrency` na fila
   - Check for dead letters: Insira fila no Workbench → Queues → [nome] → Delayed/Failed

3. **Performance baixa**
   - Ajuste `workerConcurrency` baseado na carga de trabalho
   - Verifique latência Redis com `redis-cli ping`
   - Considere aumentar conexão pool se houver muitos workers

### Logs importantes
- `[Flow]` - Início/fim de steps de workflow
- `[DLQ]` - Job que excedeu tentativas máximas
- `[Worker Error]` - Erros de conexão ou processamento
- `AppError` - Erros de aplicação com códigos estruturados

## 📜 Licença

MIT License - veja o arquivo [LICENSE](LICENSE) para detalhes.

---
*Última atualização: $(date '+%Y-%m-%d')*