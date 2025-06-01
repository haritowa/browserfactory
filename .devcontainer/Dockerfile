FROM denoland/deno:ubuntu

# Install additional tools for development
RUN apt-get update && apt-get install -y \
    git \
    make \
    curl \
    wget \
    jq \
    redis-tools \
    && rm -rf /var/lib/apt/lists/*

# Create workspace directory
RUN mkdir -p /workspaces

# Set up git safe directory for the workspace
RUN git config --global --add safe.directory /workspaces/browserfactory

# Expose ports for development
EXPOSE 3000 6379 8080

# Set working directory
WORKDIR /workspaces/browserfactory

# Default command
CMD ["sleep", "infinity"]
