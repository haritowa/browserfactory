FROM denoland/deno:alpine

WORKDIR /app

# Copy dependency files first
COPY deno.json deno.lock* ./

# Copy main.ts and other necessary files for dependency resolution
COPY main.ts fresh.config.ts ./

# Cache dependencies (this will resolve the remote URLs)
RUN deno cache main.ts

# Copy remaining source code
COPY . .

EXPOSE 3000

# Run with necessary permissions
CMD ["deno", "run", "--allow-env", "--allow-net", "--allow-read", "--allow-write=/var/run/docker.sock", "main.ts"]
