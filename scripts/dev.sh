#!/bin/bash

# Browser Factory Development Script
# Manage services in the devcontainer environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
log() {
    echo -e "${GREEN}[DEV]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Check if Redis is running
check_redis() {
    if redis-cli ping >/dev/null 2>&1; then
        log "Redis is running"
        return 0
    else
        warn "Redis is not responding"
        return 1
    fi
}

# Start API server
start_api() {
    log "Starting API server..."
    cd apps/api-fresh
    deno task dev &
    echo $! >/tmp/api.pid
    cd ../..
    log "API server started (PID: $(cat /tmp/api.pid))"
}

# Start worker
start_worker() {
    log "Starting worker..."
    cd apps/worker
    deno task dev &
    echo $! >/tmp/worker.pid
    cd ../..
    log "Worker started (PID: $(cat /tmp/worker.pid))"
}

# Stop services
stop_services() {
    log "Stopping services..."

    if [ -f /tmp/api.pid ]; then
        kill $(cat /tmp/api.pid) 2>/dev/null || true
        rm -f /tmp/api.pid
        log "API server stopped"
    fi

    if [ -f /tmp/worker.pid ]; then
        kill $(cat /tmp/worker.pid) 2>/dev/null || true
        rm -f /tmp/worker.pid
        log "Worker stopped"
    fi
}

# Show status
status() {
    info "Development Environment Status:"
    echo

    # Check Redis
    if check_redis; then
        echo -e "  Redis: ${GREEN}✓ Running${NC}"
    else
        echo -e "  Redis: ${RED}✗ Not running${NC}"
    fi

    # Check API
    if [ -f /tmp/api.pid ] && kill -0 $(cat /tmp/api.pid) 2>/dev/null; then
        echo -e "  API Server: ${GREEN}✓ Running${NC} (PID: $(cat /tmp/api.pid))"
    else
        echo -e "  API Server: ${RED}✗ Not running${NC}"
    fi

    # Check Worker
    if [ -f /tmp/worker.pid ] && kill -0 $(cat /tmp/worker.pid) 2>/dev/null; then
        echo -e "  Worker: ${GREEN}✓ Running${NC} (PID: $(cat /tmp/worker.pid))"
    else
        echo -e "  Worker: ${RED}✗ Not running${NC}"
    fi

    echo
}

# Show help
show_help() {
    echo "Browser Factory Development Script"
    echo
    echo "Usage: $0 [COMMAND]"
    echo
    echo "Commands:"
    echo "  start-api     Start the API server"
    echo "  start-worker  Start the worker"
    echo "  start-all     Start both API and worker"
    echo "  stop          Stop all services"
    echo "  restart       Restart all services"
    echo "  status        Show service status"
    echo "  logs          Show logs (todo)"
    echo "  help          Show this help"
    echo
}

# Main logic
case "${1:-help}" in
start-api)
    check_redis || exit 1
    start_api
    ;;
start-worker)
    check_redis || exit 1
    start_worker
    ;;
start-all)
    check_redis || exit 1
    start_api
    start_worker
    ;;
stop)
    stop_services
    ;;
restart)
    stop_services
    sleep 2
    check_redis || exit 1
    start_api
    start_worker
    ;;
status)
    status
    ;;
help | --help | -h)
    show_help
    ;;
*)
    error "Unknown command: $1"
    show_help
    exit 1
    ;;
esac
