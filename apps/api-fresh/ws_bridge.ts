// WebSocket bridge that pipes CDP frames between external clients and browser containers

export interface WSBridgeConfig {
    targetWssUrl: string
    sessionId: string
    timeout?: number
}

export class WSBridge {
    private targetWs: WebSocket | null = null
    private clientWs: WebSocket | null = null
    private isConnected = false
    private readonly config: WSBridgeConfig

    constructor(config: WSBridgeConfig) {
        this.config = config
    }

    /**
     * Establishes connection to both target browser and client
     */
    async connect(clientWs: WebSocket): Promise<void> {
        this.clientWs = clientWs

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.cleanup()
                reject(new Error('Connection timeout'))
            }, this.config.timeout || 30000)

            try {
                // Connect to target browser
                this.targetWs = new WebSocket(this.config.targetWssUrl)

                this.targetWs.onopen = () => {
                    clearTimeout(timeout)
                    this.isConnected = true
                    this.setupBridge()
                    resolve()
                }

                this.targetWs.onerror = (error) => {
                    clearTimeout(timeout)
                    console.error(`Failed to connect to target browser: ${error}`)
                    reject(new Error('Failed to connect to target browser'))
                }

                this.targetWs.onclose = () => {
                    this.handleDisconnection('target')
                }
            } catch (error) {
                clearTimeout(timeout)
                reject(error)
            }
        })
    }

    /**
     * Sets up bidirectional message forwarding
     */
    private setupBridge(): void {
        if (!this.clientWs || !this.targetWs) return

        // Forward messages from client to target browser
        this.clientWs.onmessage = (event) => {
            if (this.targetWs && this.targetWs.readyState === WebSocket.OPEN) {
                try {
                    this.targetWs.send(event.data)
                } catch (error) {
                    console.error('Error forwarding message to target:', error)
                }
            }
        }

        // Forward messages from target browser to client
        this.targetWs.onmessage = (event) => {
            if (this.clientWs && this.clientWs.readyState === WebSocket.OPEN) {
                try {
                    this.clientWs.send(event.data)
                } catch (error) {
                    console.error('Error forwarding message to client:', error)
                }
            }
        }

        // Handle client disconnection
        this.clientWs.onclose = () => {
            this.handleDisconnection('client')
        }

        this.clientWs.onerror = (error) => {
            console.error(`Client WebSocket error: ${error}`)
        }

        console.log(
            `WebSocket bridge established for session ${this.config.sessionId}`,
        )
    }

    /**
     * Handles disconnection of either side
     */
    private handleDisconnection(side: 'client' | 'target'): void {
        console.log(`${side} disconnected for session ${this.config.sessionId}`)
        this.cleanup()
    }

    /**
     * Cleans up connections
     */
    cleanup(): void {
        this.isConnected = false

        if (this.clientWs) {
            try {
                if (this.clientWs.readyState === WebSocket.OPEN) {
                    this.clientWs.close()
                }
            } catch (error) {
                console.error('Error closing client WebSocket:', error)
            }
            this.clientWs = null
        }

        if (this.targetWs) {
            try {
                if (this.targetWs.readyState === WebSocket.OPEN) {
                    this.targetWs.close()
                }
            } catch (error) {
                console.error('Error closing target WebSocket:', error)
            }
            this.targetWs = null
        }
    }

    /**
     * Creates a WebSocket handler for Fresh routes
     */
    static createHandler(
        getTargetWssUrl: (sessionId: string) => Promise<string | null>,
    ) {
        return async (req: Request) => {
            const url = new URL(req.url)
            const sessionId = url.searchParams.get('sessionId')

            if (!sessionId) {
                return new Response('Missing sessionId parameter', { status: 400 })
            }

            const targetWssUrl = await getTargetWssUrl(sessionId)
            if (!targetWssUrl) {
                return new Response('Session not found or not ready', { status: 404 })
            }

            const { socket, response } = Deno.upgradeWebSocket(req)

            const bridge = new WSBridge({
                targetWssUrl,
                sessionId,
                timeout: 30000,
            })

            socket.onopen = async () => {
                try {
                    await bridge.connect(socket)
                } catch (error) {
                    console.error(
                        `Failed to establish bridge for session ${sessionId}:`,
                        error,
                    )
                    socket.close(1011, 'Failed to connect to browser')
                }
            }

            return response
        }
    }
}
