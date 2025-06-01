import { Job } from 'bullmq'
import { QueueClient } from '../../libs/queue/client.ts'
import { JOB_TYPES, JobPayload, ResultPayload } from '../../libs/queue/types.ts'
import { DockerClient } from './docker_client.ts'
import { getRequiredEnvVar, sleep } from '../../libs/shared.ts'

class BrowserWorker {
    private queueClient: QueueClient
    private dockerClient: DockerClient
    private activeContainers = new Map<
        string,
        { containerId: string; port: number }
    >()

    constructor() {
        const redisUrl = getRequiredEnvVar('REDIS_URL')
        this.queueClient = new QueueClient(redisUrl)
        this.dockerClient = new DockerClient()
    }

    async start(): Promise<void> {
        console.log('Starting Browser Worker...')

        // Clean up any existing containers on startup
        await this.dockerClient.cleanup()

        // Create worker with job processor
        const worker = this.queueClient.createWorker(this.processJob.bind(this))

        // Handle worker events
        worker.on('completed', (job) => {
            console.log(`Job ${job.id} completed`)
        })

        worker.on('failed', (job, error) => {
            console.error(`Job ${job?.id} failed:`, error)
        })

        worker.on('error', (error) => {
            console.error('Worker error:', error)
        })

        // Graceful shutdown
        process.on('SIGINT', async () => {
            console.log('Shutting down worker...')
            await this.cleanup()
            await worker.close()
            process.exit(0)
        })

        process.on('SIGTERM', async () => {
            console.log('Shutting down worker...')
            await this.cleanup()
            await worker.close()
            process.exit(0)
        })

        console.log('Browser Worker started and waiting for jobs...')
    }

    private async processJob(
        job: Job<JobPayload, ResultPayload>,
    ): Promise<ResultPayload> {
        const { sessionId } = job.data
        console.log(`Processing job for session ${sessionId}, type: ${job.name}`)

        try {
            switch (job.name) {
                case JOB_TYPES.CREATE_BROWSER:
                    return await this.createBrowser(job.data)

                case JOB_TYPES.TERMINATE_BROWSER:
                    return await this.terminateBrowser(sessionId)

                default:
                    throw new Error(`Unknown job type: ${job.name}`)
            }
        } catch (error) {
            console.error(`Error processing job ${job.id}:`, error)

            // Clean up on error
            const containerInfo = this.activeContainers.get(sessionId)
            if (containerInfo) {
                await this.dockerClient.terminateContainer(
                    containerInfo.containerId,
                    containerInfo.port,
                )
                this.activeContainers.delete(sessionId)
            }

            throw error
        }
    }

    private async createBrowser(payload: JobPayload): Promise<ResultPayload> {
        const { sessionId, browserConfig, timeout } = payload

        try {
            // Update job status to running
            const runningResult: ResultPayload = {
                sessionId,
                status: 'running',
                startedAt: Date.now(),
            }

            console.log(`Creating browser container for session ${sessionId}`)

            // Create browser container
            const container = await this.dockerClient.createBrowserContainer({
                sessionId,
                port: 0, // Will be assigned by findAvailablePort
                viewport: browserConfig?.viewport,
                userAgent: browserConfig?.userAgent,
                headless: browserConfig?.headless,
            })

            // Track the container
            this.activeContainers.set(sessionId, {
                containerId: container.containerId,
                port: container.port,
            })

            // Set up auto-cleanup after timeout
            if (timeout) {
                setTimeout(async () => {
                    console.log(`Auto-terminating session ${sessionId} after timeout`)
                    await this.terminateBrowser(sessionId)
                }, timeout)
            }

            const result: ResultPayload = {
                sessionId,
                status: 'completed',
                browserWssUrl: container.wssUrl,
                containerId: container.containerId,
                containerPort: container.port,
                startedAt: runningResult.startedAt,
                completedAt: Date.now(),
            }

            console.log(
                `Browser ready for session ${sessionId} at ${container.wssUrl}`,
            )
            return result
        } catch (error) {
            console.error(
                `Failed to create browser for session ${sessionId}:`,
                error,
            )

            const result: ResultPayload = {
                sessionId,
                status: 'failed',
                error: error.message,
                startedAt: Date.now(),
                completedAt: Date.now(),
            }

            return result
        }
    }

    private async terminateBrowser(sessionId: string): Promise<ResultPayload> {
        try {
            const containerInfo = this.activeContainers.get(sessionId)

            if (containerInfo) {
                await this.dockerClient.terminateContainer(
                    containerInfo.containerId,
                    containerInfo.port,
                )
                this.activeContainers.delete(sessionId)
                console.log(`Browser terminated for session ${sessionId}`)
            } else {
                console.warn(`No active container found for session ${sessionId}`)
            }

            return {
                sessionId,
                status: 'terminated',
                completedAt: Date.now(),
            }
        } catch (error) {
            console.error(
                `Error terminating browser for session ${sessionId}:`,
                error,
            )

            return {
                sessionId,
                status: 'failed',
                error: `Termination failed: ${error.message}`,
                completedAt: Date.now(),
            }
        }
    }

    private async cleanup(): Promise<void> {
        console.log('Cleaning up active containers...')

        // Terminate all active containers
        for (const [sessionId, containerInfo] of this.activeContainers) {
            try {
                await this.dockerClient.terminateContainer(
                    containerInfo.containerId,
                    containerInfo.port,
                )
                console.log(`Cleaned up container for session ${sessionId}`)
            } catch (error) {
                console.error(`Error cleaning up session ${sessionId}:`, error)
            }
        }

        this.activeContainers.clear()
        await this.dockerClient.cleanup()
        await this.queueClient.close()
    }
}

// Start the worker
if (import.meta.main) {
    const worker = new BrowserWorker()
    worker.start().catch((error) => {
        console.error('Failed to start worker:', error)
        process.exit(1)
    })
}
