import Docker from 'npm:dockerode'
import { CONFIG, findAvailablePort } from '../../libs/shared.ts'

export interface BrowserContainerConfig {
    sessionId: string
    port: number
    viewport?: {
        width: number
        height: number
    }
    userAgent?: string
    headless?: boolean
}

export interface BrowserContainer {
    containerId: string
    port: number
    wssUrl: string
}

export class DockerClient {
    private docker: Docker
    private usedPorts = new Set<number>()

    constructor() {
        this.docker = new Docker({ socketPath: '/var/run/docker.sock' })
    }

    /**
     * Creates and starts a browser container
     */
    async createBrowserContainer(
        config: BrowserContainerConfig,
    ): Promise<BrowserContainer> {
        const port = findAvailablePort(this.usedPorts)
        this.usedPorts.add(port)

        try {
            // Environment variables for browser configuration
            const env = [
                `CHROME_OPTS=--remote-debugging-port=9222`,
                `PREBOOT_CHROME=true`,
                `KEEP_ALIVE=true`,
            ]

            if (config.viewport) {
                env.push(`DEFAULT_VIEWPORT_WIDTH=${config.viewport.width}`)
                env.push(`DEFAULT_VIEWPORT_HEIGHT=${config.viewport.height}`)
            }

            if (config.userAgent) {
                env.push(`DEFAULT_USER_AGENT=${config.userAgent}`)
            }

            if (config.headless !== undefined) {
                env.push(`HEADLESS=${config.headless}`)
            }

            const container = await this.docker.createContainer({
                Image: CONFIG.BROWSER_IMAGE,
                name: `browser-${config.sessionId}`,
                Env: env,
                HostConfig: {
                    PortBindings: {
                        '9222/tcp': [{ HostPort: port.toString() }],
                    },
                    Memory: 1024 * 1024 * 1024, // 1GB limit
                    CpuShares: 1024,
                    AutoRemove: true,
                    ShmSize: 2147483648, // 2GB shared memory for Chrome
                },
                ExposedPorts: {
                    '9222/tcp': {},
                },
                Labels: {
                    'browserfactory.session': config.sessionId,
                    'browserfactory.type': 'browser',
                },
            })

            await container.start()

            const wssUrl = `ws://localhost:${port}`

            // Wait for browser to be ready
            await this.waitForBrowserReady(wssUrl)

            console.log(
                `Browser container started for session ${config.sessionId} on port ${port}`,
            )

            return {
                containerId: container.id,
                port,
                wssUrl,
            }
        } catch (error) {
            this.usedPorts.delete(port)
            throw new Error(`Failed to create browser container: ${error.message}`)
        }
    }

    /**
     * Terminates a browser container
     */
    async terminateContainer(containerId: string, port?: number): Promise<void> {
        try {
            const container = this.docker.getContainer(containerId)

            // Stop the container (AutoRemove will clean it up)
            await container.stop({ t: 10 })

            if (port) {
                this.usedPorts.delete(port)
            }

            console.log(`Container ${containerId} terminated`)
        } catch (error) {
            if (error instanceof Error) {
                // Container might already be stopped/removed
                console.warn(
                    `Error terminating container ${containerId}:`,
                    error.message,
                )
            }

            if (port) {
                this.usedPorts.delete(port)
            }
        }
    }

    /**
     * Lists all browser containers
     */
    async listBrowserContainers(): Promise<
        Array<{ id: string; sessionId: string; port?: number }>
    > {
        try {
            const containers = await this.docker.listContainers({
                all: true,
                filters: {
                    label: ['browserfactory.type=browser'],
                },
            })

            return containers.map((container) => ({
                id: container.Id,
                sessionId: container.Labels['browserfactory.session'] || 'unknown',
                port: this.extractPortFromContainer(container),
            }))
        } catch (error) {
            console.error('Error listing browser containers:', error)
            return []
        }
    }

    /**
     * Cleans up orphaned containers
     */
    async cleanup(): Promise<void> {
        try {
            const containers = await this.listBrowserContainers()

            for (const container of containers) {
                await this.terminateContainer(container.id, container.port)
            }

            this.usedPorts.clear()
            console.log('Docker cleanup completed')
        } catch (error) {
            console.error('Error during cleanup:', error)
        }
    }

    /**
     * Waits for browser to be ready by checking CDP endpoint
     */
    private async waitForBrowserReady(
        wssUrl: string,
        maxAttempts = 30,
    ): Promise<void> {
        const httpUrl = wssUrl
            .replace('ws://', 'http://')
            .replace(/\/.*/, '/json/version')

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const response = await fetch(httpUrl, {
                    signal: AbortSignal.timeout(2000),
                })

                if (response.ok) {
                    return
                }
            } catch (error) {
                // Browser not ready yet
            }

            if (attempt === maxAttempts) {
                throw new Error('Browser failed to start within timeout period')
            }

            await new Promise((resolve) => setTimeout(resolve, 1000))
        }
    }

    /**
     * Extracts port number from container info
     */
    private extractPortFromContainer(container: any): number | undefined {
        try {
            const ports = container.Ports
            if (ports && ports.length > 0) {
                const port = ports.find((p: any) => p.PrivatePort === 9222)
                return port?.PublicPort
            }
        } catch (error) {
            console.warn('Error extracting port from container:', error)
        }
        return undefined
    }
}
