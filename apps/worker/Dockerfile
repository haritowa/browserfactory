FROM denoland/deno:alpine

WORKDIR /app

# Copy dependency files first
COPY deno.json deno.lock* ./

# Copy remaining source code
COPY . .

# Cache dependencies (this will resolve the remote URLs)
RUN deno cache processor.ts

# Run with necessary permissions for Docker socket access
CMD ["deno", "run", "--allow-env", "--allow-net", "--allow-read", "--allow-write=/var/run/docker.sock", "processor.ts"]
