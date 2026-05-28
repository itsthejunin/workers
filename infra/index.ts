import * as docker from "alchemy/docker";

export async function deploy() {
  // 1. App Network
  const network = await docker.Network("app-network", { 
    name: "midday-boilerplate-network"
  });

  // 2. Persistent Volume for Redis
  const redisVolume = await docker.Volume("redis-data", { 
    name: "redis-data"
  });

  // 3. Redis Image
  const redisImage = await docker.RemoteImage("redis-image", { 
    name: "redis", 
    tag: "7-alpine"
  });

  // 4. Redis Container
  const redis = await docker.Container("redis-server", { 
    image: redisImage.imageRef, 
    name: "redis-server", 
    networks: [{ name: network.name, aliases: ["redis"] }], 
    volumes: [{ hostPath: redisVolume.name, containerPath: "/data" }], 
    start: true,
    restart: "unless-stopped"
  });

  // 5. Application Image Build (uses the Dockerfile in the project root)
  const appImage = await docker.Image("app-image", { 
    name: "midday-boilerplate", 
    tag: "latest", 
    build: { 
      context: "../", 
      dockerfile: "Dockerfile"
    },
    skipPush: true
  });

  // 6. API Container
  const api = await docker.Container("api-server", { 
    image: appImage.name, 
    name: "api-server", 
    ports: [{ external: 3000, internal: 3000 }], 
    networks: [{ name: network.name }], 
    environment: { 
      REDIS_URL: "redis://redis:6379",
      NODE_ENV: "production" 
    },
    restart: "unless-stopped", 
    start: true
  });

  // 7. Worker Container
  const worker = await docker.Container("worker-server", { 
    image: appImage.name, 
    name: "worker-server", 
    networks: [{ name: network.name }], 
    environment: { 
      REDIS_URL: "redis://redis:6379",
      NODE_ENV: "production" 
    }, 
    command: ["bun", "run", "src/worker/run.ts"],
    restart: "unless-stopped", 
    start: true
  });

  return {
    network: network.name,
    redis: redis.name,
    api: api.name,
    worker: worker.name
  };
}

deploy().catch(console.error);
