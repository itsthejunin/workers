# ---- Base Image ----
FROM oven/bun:1.2 AS base
WORKDIR /app

# ---- Dependencies ----
FROM base AS deps
# Copy only lockfile and package.json to leverage Docker cache
COPY bun.lockb package.json ./
RUN bun install --frozen-lockfile

# ---- Build ----
FROM deps AS build
# Copy the rest of the application
COPY . .
# If you have a build step for the UI, you would do it here.
# For example, if you have a Vite build for the workbench:
# RUN bun run build:ui
# Since we don't have a build step that produces different output, we just copy the source.

# ---- Runtime ----
FROM base AS runtime
# Create a non-root user
RUN addgroup --system app && adduser --system --ingroup app app
# Copy only the necessary files from the build stage
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app ./
# Change ownership to non-root user
RUN chown -R app:app /app
USER app

# Expose the port the app runs on
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun run healthcheck.mjs || exit 1

# Start the application
CMD ["bun", "run", "server.ts"]